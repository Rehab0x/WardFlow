/**
 * 암호화 백업/복원 서비스
 * Web Crypto API + AES-256-GCM
 * 파일 확장자: .wardflow
 */
import { db } from '@/db/database';

// --- Daily backup reminder ---

const BACKUP_REMINDER_KEY = 'wardflow_backup_reminder';
const BACKUP_LAST_PROMPT_KEY = 'wardflow_backup_last_prompt';

export function isDailyBackupEnabled(): boolean {
  return localStorage.getItem(BACKUP_REMINDER_KEY) === 'true';
}

export function setDailyBackupEnabled(enabled: boolean) {
  localStorage.setItem(BACKUP_REMINDER_KEY, enabled ? 'true' : 'false');
}

export function shouldShowBackupPrompt(): boolean {
  if (!isDailyBackupEnabled()) return false;
  const today = new Date().toISOString().slice(0, 10);
  const lastPrompt = localStorage.getItem(BACKUP_LAST_PROMPT_KEY);
  return lastPrompt !== today;
}

export function markBackupPrompted() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(BACKUP_LAST_PROMPT_KEY, today);
}

interface BackupData {
  version: number;
  createdAt: string;
  app: 'wardflow';
  tables: {
    users: unknown[];
    authCredentials: unknown[];
    patients: unknown[];
    labResults: unknown[];
    medications: unknown[];
    notes: unknown[];
    schedules: unknown[];
    labCategories: unknown[];
  };
}

// --- Crypto helpers (AES-256-GCM) ---

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
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' } as Pbkdf2Params,
    keyMaterial,
    { name: 'AES-GCM', length: 256 } as AesKeyGenParams,
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(data: string, password: string): Promise<ArrayBuffer> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  // Format: [salt(16)] [iv(12)] [encrypted data]
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);
  return result.buffer;
}

async function decrypt(buffer: ArrayBuffer, password: string): Promise<string> {
  const data = new Uint8Array(buffer);
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const encrypted = data.slice(28);

  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// --- Export ---

export async function exportBackup(password: string): Promise<Blob> {
  const [users, authCredentials, patients, labResults, medications, notes, schedules, labCategories] =
    await Promise.all([
      db.users.toArray(),
      db.authCredentials.toArray(),
      db.patients.toArray(),
      db.labResults.toArray(),
      db.medications.toArray(),
      db.notes.toArray(),
      db.schedules.toArray(),
      db.labCategories.toArray(),
    ]);

  const backup: BackupData = {
    version: 6,
    createdAt: new Date().toISOString(),
    app: 'wardflow',
    tables: { users, authCredentials, patients, labResults, medications, notes, schedules, labCategories },
  };

  const json = JSON.stringify(backup);
  const encryptedBuffer = await encrypt(json, password);
  return new Blob([encryptedBuffer], { type: 'application/octet-stream' });
}

// --- Text export/import (clipboard transfer) ---

export async function exportBackupAsText(password: string): Promise<string> {
  const [users, authCredentials, patients, labResults, medications, notes, schedules, labCategories] =
    await Promise.all([
      db.users.toArray(),
      db.authCredentials.toArray(),
      db.patients.toArray(),
      db.labResults.toArray(),
      db.medications.toArray(),
      db.notes.toArray(),
      db.schedules.toArray(),
      db.labCategories.toArray(),
    ]);

  const backup: BackupData = {
    version: 6,
    createdAt: new Date().toISOString(),
    app: 'wardflow',
    tables: { users, authCredentials, patients, labResults, medications, notes, schedules, labCategories },
  };

  const json = JSON.stringify(backup);
  const encryptedBuffer = await encrypt(json, password);

  // ArrayBuffer → Base64
  const bytes = new Uint8Array(encryptedBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return 'WARDFLOW:' + btoa(binary);
}

export async function importBackupFromText(text: string, password: string): Promise<{ patientCount: number; noteCount: number }> {
  const trimmed = text.trim();
  if (!trimmed.startsWith('WARDFLOW:')) {
    throw new Error('WardFlow 백업 텍스트가 아닙니다.');
  }

  const base64 = trimmed.slice('WARDFLOW:'.length);
  let buffer: ArrayBuffer;
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    buffer = bytes.buffer;
  } catch {
    throw new Error('백업 텍스트 형식이 올바르지 않습니다.');
  }

  // importBackup의 File 대신 ArrayBuffer를 직접 사용
  return importBackupFromBuffer(buffer, password);
}

async function importBackupFromBuffer(buffer: ArrayBuffer, password: string): Promise<{ patientCount: number; noteCount: number }> {
  let json: string;
  try {
    json = await decrypt(buffer, password);
  } catch {
    throw new Error('비밀번호가 올바르지 않거나 데이터가 손상되었습니다.');
  }

  let backup: BackupData;
  try {
    backup = JSON.parse(json);
  } catch {
    throw new Error('백업 데이터 형식이 올바르지 않습니다.');
  }

  if (backup.app !== 'wardflow') {
    throw new Error('WardFlow 백업 데이터가 아닙니다.');
  }

  await restoreFromBackup(backup);

  return {
    patientCount: backup.tables.patients?.length ?? 0,
    noteCount: backup.tables.notes?.length ?? 0,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Import (file) ---

export async function importBackup(file: File, password: string): Promise<{ patientCount: number; noteCount: number }> {
  const buffer = await file.arrayBuffer();
  return importBackupFromBuffer(buffer, password);
}

// --- Shared restore logic ---

const DATE_FIELDS = ['birthDate', 'admissionDate', 'dischargeDate', 'createdAt', 'updatedAt', 'startDate', 'endDate', 'testDate', 'alertDate', 'scheduledDate'];

function restoreDates(records: unknown[]): unknown[] {
  return records.map((record: unknown) => {
    const obj = record as Record<string, unknown>;
    const restored: Record<string, unknown> = { ...obj };
    for (const field of DATE_FIELDS) {
      if (restored[field] && typeof restored[field] === 'string') {
        restored[field] = new Date(restored[field] as string);
      }
    }
    return restored;
  });
}

async function restoreFromBackup(backup: BackupData): Promise<void> {
  const tables = [db.users, db.authCredentials, db.patients, db.labResults, db.medications, db.notes, db.schedules, db.labCategories];
  await db.transaction('rw', tables, async () => {
    await Promise.all([
      db.users.clear(),
      db.authCredentials.clear(),
      db.patients.clear(),
      db.labResults.clear(),
      db.medications.clear(),
      db.notes.clear(),
      db.schedules.clear(),
      db.labCategories.clear(),
    ]);

    const t = backup.tables;
    await Promise.all([
      t.users?.length ? db.users.bulkAdd(restoreDates(t.users) as never[]) : Promise.resolve(),
      t.authCredentials?.length ? db.authCredentials.bulkAdd(restoreDates(t.authCredentials) as never[]) : Promise.resolve(),
      t.patients?.length ? db.patients.bulkAdd(restoreDates(t.patients) as never[]) : Promise.resolve(),
      t.labResults?.length ? db.labResults.bulkAdd(restoreDates(t.labResults) as never[]) : Promise.resolve(),
      t.medications?.length ? db.medications.bulkAdd(restoreDates(t.medications) as never[]) : Promise.resolve(),
      t.notes?.length ? db.notes.bulkAdd(restoreDates(t.notes) as never[]) : Promise.resolve(),
      t.schedules?.length ? db.schedules.bulkAdd(restoreDates(t.schedules) as never[]) : Promise.resolve(),
      t.labCategories?.length ? db.labCategories.bulkAdd(restoreDates(t.labCategories) as never[]) : Promise.resolve(),
    ]);
  });
}
