import {
  createBackupSnapshot,
  deleteBackupSnapshot,
  getBackupSnapshotData,
  listBackupSnapshots,
  type BackupSnapshotSummary,
} from '@/data/backupSnapshots.repository';
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

export type SnapshotRestoreImpactLevel = 'neutral' | 'warning' | 'danger';

export interface SnapshotRestoreImpact {
  key: keyof SnapshotRecordCounts;
  label: string;
  snapshotCount: number;
  currentCount: number;
  delta: number;
  level: SnapshotRestoreImpactLevel;
  message: string;
}

export interface SnapshotRestoreCheck {
  blocked: boolean;
  warnings: string[];
  impacts: SnapshotRestoreImpact[];
  summary: string;
}

export class BackupSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupSnapshotError';
  }
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
  if (input.password.trim().length < 4) {
    throw new BackupSnapshotError('스냅샷 비밀번호는 4자 이상이어야 합니다.');
  }

  const payload = await collectSnapshotPayload();
  const serialized = JSON.stringify(payload);
  const encryptedData = await encryptToBase64(serialized, input.password.trim());
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

export async function listSupabaseBackupSnapshots(
  ownerId: string
): Promise<BackupSnapshotSummary[]> {
  return listBackupSnapshots(ownerId);
}

export async function deleteSupabaseBackupSnapshot(snapshotId: string): Promise<void> {
  if (!snapshotId.trim()) {
    throw new BackupSnapshotError('삭제할 스냅샷을 선택해주세요.');
  }
  await deleteBackupSnapshot(snapshotId);
}

export async function previewSupabaseBackupSnapshot(input: {
  snapshotId: string;
  password: string;
}): Promise<SnapshotPreview> {
  if (!input.snapshotId.trim()) {
    throw new BackupSnapshotError('미리 볼 스냅샷을 선택해주세요.');
  }
  if (!input.password.trim()) {
    throw new BackupSnapshotError('스냅샷 비밀번호를 입력해주세요.');
  }

  const encryptedData = await getBackupSnapshotData(input.snapshotId);
  if (!encryptedData)
    throw new BackupSnapshotError(
      '스냅샷 데이터를 찾을 수 없습니다. 목록을 새로고침한 뒤 다시 시도해주세요.'
    );

  const decrypted = await decryptFromBase64(encryptedData, input.password.trim());
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
  const impacts = buildSnapshotRestoreImpacts(snapshotCounts, currentCounts);
  const blocked = snapshotCounts.patients === 0 && currentCounts.patients > 0;

  if (blocked) {
    warnings.push(
      '스냅샷에는 환자가 없지만 현재 서버에는 환자가 있습니다. 이 스냅샷으로 복원하면 임상 데이터가 사라질 수 있습니다.'
    );
  }

  if (snapshotCounts.labResults === 0 && currentCounts.labResults > 0) {
    warnings.push('스냅샷에는 Lab 결과가 없지만 현재 서버에는 Lab 결과가 있습니다.');
  }

  if (
    (['notes', 'schedules', 'medications', 'labResults', 'labItems'] as const).some(
      (key) => snapshotCounts[key] < currentCounts[key]
    )
  ) {
    warnings.push(
      '스냅샷의 일부 임상 데이터가 현재 서버보다 적습니다. 복원 전에 차이를 확인해주세요.'
    );
  }

  if (snapshotCounts.notes + snapshotCounts.schedules + snapshotCounts.medications === 0) {
    warnings.push('스냅샷에 메모, 일정, 약제 데이터가 없습니다.');
  }

  return {
    blocked,
    warnings,
    impacts,
    summary: blocked
      ? '복원 실행을 열기 전에 차단 조건을 해결해야 합니다.'
      : warnings.length > 0
        ? '복원 전에 현재 서버와 스냅샷의 데이터 차이를 확인해야 합니다.'
        : '현재 서버와 비교해 치명적인 차이가 없습니다.',
  };
}

const restoreImpactFields: {
  key: keyof SnapshotRecordCounts;
  label: string;
  critical?: boolean;
}[] = [
  { key: 'patients', label: '환자', critical: true },
  { key: 'notes', label: '메모' },
  { key: 'schedules', label: '일정' },
  { key: 'medications', label: '약제' },
  { key: 'labResults', label: 'Lab 결과' },
  { key: 'labItems', label: 'Lab 항목' },
  { key: 'templates', label: '템플릿' },
  { key: 'labCategories', label: 'Lab 카테고리' },
  { key: 'userSettings', label: '사용자 설정' },
];

function buildSnapshotRestoreImpacts(
  snapshotCounts: SnapshotRecordCounts,
  currentCounts: SnapshotRecordCounts
): SnapshotRestoreImpact[] {
  return restoreImpactFields.map(({ key, label, critical }) => {
    const snapshotCount = snapshotCounts[key];
    const currentCount = currentCounts[key];
    const delta = snapshotCount - currentCount;
    const level: SnapshotRestoreImpactLevel =
      critical && snapshotCount === 0 && currentCount > 0
        ? 'danger'
        : delta < 0 && currentCount > 0
          ? 'warning'
          : 'neutral';

    return {
      key,
      label,
      snapshotCount,
      currentCount,
      delta,
      level,
      message: buildRestoreImpactMessage(label, delta),
    };
  });
}

function buildRestoreImpactMessage(label: string, delta: number): string {
  if (delta === 0) return `${label} 수가 현재와 같습니다.`;
  if (delta > 0) return `${label} ${delta}개가 현재 서버보다 많습니다.`;
  return `${label} ${Math.abs(delta)}개가 현재 서버보다 적습니다.`;
}

export function formatBackupSnapshotError(
  error: unknown,
  fallbackMessage = '스냅샷 작업에 실패했습니다.'
): string {
  if (error instanceof BackupSnapshotError) return error.message;
  if (error instanceof SyntaxError) return '스냅샷 데이터 형식이 올바르지 않습니다.';

  const message = getErrorMessage(error);
  if (!message) return fallbackMessage;

  const lower = message.toLowerCase();
  if (lower.includes('password') || lower.includes('damaged') || lower.includes('decrypt')) {
    return '비밀번호가 올바르지 않거나 스냅샷 데이터가 손상되었습니다.';
  }
  if (
    lower.includes('row-level security') ||
    lower.includes('permission') ||
    lower.includes('policy')
  ) {
    return '현재 계정에 이 스냅샷 작업 권한이 없습니다.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return '네트워크 연결을 확인한 뒤 다시 시도해주세요.';
  }

  return message;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === 'string') return error.trim();
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message.trim() : '';
  }
  return '';
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
    selectSnapshotRows(
      'templates',
      'id, owner_id, field, name, content, scope, created_at, updated_at',
      'created_at'
    ),
    selectSnapshotRows(
      'lab_categories',
      'id, owner_id, name, display_order, items, created_at, updated_at',
      'created_at'
    ),
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

async function selectSnapshotRows(
  table: SnapshotTable,
  columns: string,
  orderColumn: string
): Promise<unknown[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order(orderColumn, { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function countRows(table: SnapshotTable): Promise<number> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });

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
  const parsed = JSON.parse(value) as Partial<SnapshotPayload>;
  if (parsed.app !== 'wardflow' || parsed.version !== 1 || !parsed.tables) {
    throw new BackupSnapshotError('WardFlow v2 스냅샷이 아닙니다.');
  }
  return {
    version: 1,
    app: 'wardflow',
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
    tables: {
      patients: normalizeSnapshotArray(parsed.tables.patients),
      notes: normalizeSnapshotArray(parsed.tables.notes),
      schedules: normalizeSnapshotArray(parsed.tables.schedules),
      medications: normalizeSnapshotArray(parsed.tables.medications),
      labResults: normalizeSnapshotArray(parsed.tables.labResults),
      templates: normalizeSnapshotArray(parsed.tables.templates),
      labCategories: normalizeSnapshotArray(parsed.tables.labCategories),
      userSettings: normalizeSnapshotArray(parsed.tables.userSettings),
    },
  };
}

function normalizeSnapshotArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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
    throw new BackupSnapshotError('비밀번호가 올바르지 않거나 스냅샷 데이터가 손상되었습니다.');
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
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    new TextEncoder().encode(data)
  );

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
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encrypted)
  );
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
