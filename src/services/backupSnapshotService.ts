import { createBackupSnapshot, getBackupSnapshotData, listBackupSnapshots, type BackupSnapshotSummary } from '@/data/backupSnapshots.repository';
import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/supabase';

type SnapshotKind = BackupSnapshotSummary['kind'];
type SnapshotTable = keyof Database['public']['Tables'];

interface SnapshotPayload {
  version: 1;
  app: 'wardflow';
  createdAt: string;
  tables: {
    patients: unknown[];
    notes: unknown[];
    schedules: unknown[];
    medications: unknown[];
    labResults: unknown[];
    templates: unknown[];
    labCategories: unknown[];
    userSettings: unknown[];
  };
}

export interface SnapshotPreview {
  createdAt: Date;
  recordCounts: SnapshotRecordCounts;
  currentCounts: SnapshotRecordCounts;
  restoreCheck: SnapshotRestoreCheck;
}

export interface SnapshotRecordCounts {
  patients: number;
  notes: number;
  schedules: number;
  medications: number;
  labResults: number;
  labItems: number;
  templates: number;
  labCategories: number;
  userSettings: number;
}

export interface SnapshotRestoreCheck {
  blocked: boolean;
  warnings: string[];
}

const snapshotAppVersion = 'wardflow-v2';

const patientSnapshotColumns = `
  id,
  registration_number,
  name,
  birth_date,
  sex,
  room_bed,
  admission_date,
  discharge_date,
  attending_physician,
  patient_type,
  status,
  created_by,
  attention,
  tags,
  chief_complaint,
  onset,
  present_illness,
  past_history,
  review_of_system,
  physical_exam,
  problem_list,
  plan,
  guardian_explanation,
  etc,
  created_at,
  updated_at,
  deleted_at
`;

const noteSnapshotColumns = `
  id,
  patient_id,
  content,
  type,
  alert_date,
  created_by,
  created_at,
  updated_at,
  deleted_at
`;

const scheduleSnapshotColumns = `
  id,
  patient_id,
  title,
  scheduled_date,
  scheduled_time,
  category,
  is_completed,
  notes,
  created_by,
  created_at,
  updated_at,
  deleted_at
`;

const medicationSnapshotColumns = `
  id,
  patient_id,
  category,
  drug_name,
  drug_base_name,
  single_dose,
  schedule,
  timing,
  days_remaining,
  dosage,
  frequency,
  start_date,
  end_date,
  is_active,
  notes,
  created_by,
  created_at,
  updated_at,
  deleted_at
`;

const labSnapshotColumns = `
  id,
  patient_id,
  test_date,
  category,
  source,
  raw_text,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  lab_items (
    id,
    lab_result_id,
    code,
    name,
    value_text,
    value_numeric,
    unit,
    reference_min,
    reference_max,
    is_abnormal,
    hl_flag,
    display_order,
    created_at,
    updated_at
  )
`;

export async function createSupabaseBackupSnapshot(input: {
  ownerId: string;
  password: string;
  kind?: SnapshotKind;
}): Promise<BackupSnapshotSummary> {
  const payload = await collectSnapshotPayload();
  const serialized = JSON.stringify(payload);
  const encryptedData = await encryptToBase64(serialized, input.password);
  const recordCounts = countSnapshotRecords(payload);
  const contentHash = await sha256Hex(serialized);

  return createBackupSnapshot({
    ownerId: input.ownerId,
    kind: input.kind ?? 'manual',
    encryptedData,
    recordCounts: recordCounts as unknown as Json,
    contentHash,
    appVersion: snapshotAppVersion,
  });
}

export async function listSupabaseBackupSnapshots(ownerId: string): Promise<BackupSnapshotSummary[]> {
  return listBackupSnapshots(ownerId);
}

export async function previewSupabaseBackupSnapshot(input: {
  snapshotId: string;
  password: string;
}): Promise<SnapshotPreview> {
  const encryptedData = await getBackupSnapshotData(input.snapshotId);
  if (!encryptedData) throw new Error('Backup snapshot data was not found.');

  const decrypted = await decryptFromBase64(encryptedData, input.password);
  const payload = parseSnapshotPayload(decrypted);
  const recordCounts = countSnapshotRecords(payload);
  const currentCounts = await countCurrentServerRecords();

  return {
    createdAt: new Date(payload.createdAt),
    recordCounts,
    currentCounts,
    restoreCheck: validateSnapshotRestore(recordCounts, currentCounts),
  };
}

export async function countCurrentServerRecords(): Promise<SnapshotRecordCounts> {
  const [
    patients,
    notes,
    schedules,
    medications,
    labResults,
    labItems,
    templates,
    labCategories,
    userSettings,
  ] = await Promise.all([
    countRows('patients'),
    countRows('notes'),
    countRows('schedules'),
    countRows('medications'),
    countRows('lab_results'),
    countRows('lab_items'),
    countRows('templates'),
    countRows('lab_categories'),
    countRows('user_settings'),
  ]);

  return {
    patients,
    notes,
    schedules,
    medications,
    labResults,
    labItems,
    templates,
    labCategories,
    userSettings,
  };
}

export function validateSnapshotRestore(
  snapshotCounts: SnapshotRecordCounts,
  currentCounts: SnapshotRecordCounts
): SnapshotRestoreCheck {
  const warnings: string[] = [];

  if (snapshotCounts.patients === 0 && currentCounts.patients > 0) {
    warnings.push('스냅샷에는 환자가 없지만 현재 서버에는 환자가 있습니다. 이 스냅샷으로 복원하면 임상 데이터가 사라질 수 있습니다.');
  }

  if (snapshotCounts.labResults === 0 && currentCounts.labResults > 0) {
    warnings.push('스냅샷에는 Lab 결과가 없지만 현재 서버에는 Lab 결과가 있습니다.');
  }

  if (snapshotCounts.notes + snapshotCounts.schedules + snapshotCounts.medications === 0) {
    warnings.push('스냅샷에 메모, 일정, 약제 데이터가 없습니다.');
  }

  return {
    blocked: snapshotCounts.patients === 0 && currentCounts.patients > 0,
    warnings,
  };
}

async function collectSnapshotPayload(): Promise<SnapshotPayload> {
  const [
    patients,
    notes,
    schedules,
    medications,
    labResults,
    templates,
    labCategories,
    userSettings,
  ] = await Promise.all([
    selectSnapshotRows('patients', patientSnapshotColumns, 'created_at'),
    selectSnapshotRows('notes', noteSnapshotColumns, 'created_at'),
    selectSnapshotRows('schedules', scheduleSnapshotColumns, 'created_at'),
    selectSnapshotRows('medications', medicationSnapshotColumns, 'created_at'),
    selectSnapshotRows('lab_results', labSnapshotColumns, 'created_at'),
    selectSnapshotRows('templates', 'id, owner_id, field, name, content, scope, created_at, updated_at', 'created_at'),
    selectSnapshotRows('lab_categories', 'id, owner_id, name, display_order, items, created_at, updated_at', 'created_at'),
    selectSnapshotRows('user_settings', 'user_id, key, value, updated_at', 'updated_at'),
  ]);

  return {
    version: 1,
    app: 'wardflow',
    createdAt: new Date().toISOString(),
    tables: {
      patients,
      notes,
      schedules,
      medications,
      labResults,
      templates,
      labCategories,
      userSettings,
    },
  };
}

async function selectSnapshotRows(table: SnapshotTable, columns: string, orderColumn: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order(orderColumn, { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function countRows(table: SnapshotTable): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
}

function countSnapshotRecords(payload: SnapshotPayload): SnapshotRecordCounts {
  const labItems = payload.tables.labResults.reduce<number>((count, row) => {
    const items = (row as { lab_items?: unknown[] }).lab_items;
    return count + (Array.isArray(items) ? items.length : 0);
  }, 0);

  return {
    patients: payload.tables.patients.length,
    notes: payload.tables.notes.length,
    schedules: payload.tables.schedules.length,
    medications: payload.tables.medications.length,
    labResults: payload.tables.labResults.length,
    labItems,
    templates: payload.tables.templates.length,
    labCategories: payload.tables.labCategories.length,
    userSettings: payload.tables.userSettings.length,
  };
}

function parseSnapshotPayload(value: string): SnapshotPayload {
  const parsed = JSON.parse(value) as SnapshotPayload;
  if (parsed.app !== 'wardflow' || parsed.version !== 1 || !parsed.tables) {
    throw new Error('This is not a WardFlow v2 backup snapshot.');
  }
  return parsed;
}

async function encryptToBase64(data: string, password: string): Promise<string> {
  const encrypted = await encrypt(data, password);
  return arrayBufferToBase64(encrypted);
}

async function decryptFromBase64(data: string, password: string): Promise<string> {
  const buffer = base64ToArrayBuffer(data);
  try {
    return await decrypt(buffer, password);
  } catch {
    throw new Error('The password is incorrect or the backup data is damaged.');
  }
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(data: string, password: string): Promise<ArrayBuffer> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, new TextEncoder().encode(data));

  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);
  return toArrayBuffer(result);
}

async function decrypt(buffer: ArrayBuffer, password: string): Promise<string> {
  const data = new Uint8Array(buffer);
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const encrypted = data.slice(28);
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(encrypted));
  return new TextDecoder().decode(decrypted);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return toArrayBuffer(bytes);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
