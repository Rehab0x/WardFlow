/**
 * Supabase Storage Inbox Service
 *
 * Supabase Storage의 lab-inbox 버킷을 "드롭박스"로 사용.
 * OpenClaw가 터미널에서 XLS를 업로드하면, WardFlow가 가져와서 처리.
 *
 * 경로 규칙: lab-inbox/{syncKey}/filename.xls
 *
 * ────────────────────────────────────
 * OpenClaw 업로드 예시 (curl):
 *
 *   curl -X POST \
 *     "https://vxbhqldmtebyomfpzlav.supabase.co/storage/v1/object/lab-inbox/{syncKey}/eonelab_20260329.xls" \
 *     -H "apikey: ANON_KEY" \
 *     -H "Authorization: Bearer ANON_KEY" \
 *     -H "Content-Type: application/octet-stream" \
 *     --data-binary @eonelab_20260329.xls
 * ────────────────────────────────────
 */

import { supabase } from './supabaseClient';
import { bulkLabImport, type BulkImportResult } from './bulkLabImport';

const BUCKET = 'lab-inbox';
const PROCESSED_KEY = 'wardflow-storage-inbox-processed';

// ─── Types ───

export interface StorageFile {
  name: string;
  size: number;
  updatedAt: string;
  fullPath: string;
  isProcessed: boolean;
  processedRecord?: ProcessedRecord;
}

export interface ProcessedRecord {
  fullPath: string;
  size: number;
  updatedAt: string;
  processedAt: string;
  result: { savedPatients: number; savedItems: number };
}

export interface StorageImportSummary {
  totalFiles: number;
  successCount: number;
  failedCount: number;
  unmatchedCount: number;
  totalPatients: number;
  totalItems: number;
  details: Array<{
    fileName: string;
    result?: BulkImportResult;
    error?: string;
  }>;
}

// ─── Processed file tracking (localStorage) ───

function getProcessedRecords(): ProcessedRecord[] {
  try {
    return JSON.parse(localStorage.getItem(PROCESSED_KEY) || '[]');
  } catch {
    return [];
  }
}

function findProcessedRecord(fullPath: string, size: number, updatedAt: string): ProcessedRecord | undefined {
  return getProcessedRecords().find(
    (r) => r.fullPath === fullPath && r.size === size && r.updatedAt === updatedAt
  );
}

function markProcessed(file: StorageFile, result: BulkImportResult) {
  const records = getProcessedRecords();
  // Remove old record for same path (re-upload case)
  const filtered = records.filter((r) => r.fullPath !== file.fullPath);
  filtered.push({
    fullPath: file.fullPath,
    size: file.size,
    updatedAt: file.updatedAt,
    processedAt: new Date().toISOString(),
    result: { savedPatients: result.savedPatients, savedItems: result.savedItems },
  });
  localStorage.setItem(PROCESSED_KEY, JSON.stringify(filtered));
}

export function clearStorageProcessedHistory() {
  localStorage.removeItem(PROCESSED_KEY);
}

// ─── Storage operations ───

/**
 * List XLS files in the sync key's inbox folder.
 */
export async function listInboxFiles(syncKey: string): Promise<StorageFile[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(syncKey, { sortBy: { column: 'updated_at', order: 'desc' } });

  if (error) {
    throw new Error(`Storage 조회 실패: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  return data
    .filter((f) => f.name.match(/\.xls$/i))
    .map((f) => {
      const fullPath = `${syncKey}/${f.name}`;
      const updatedAt = f.updated_at || f.created_at || '';
      const size = f.metadata?.size ?? 0;
      const record = findProcessedRecord(fullPath, size, updatedAt);

      return {
        name: f.name,
        size,
        updatedAt,
        fullPath,
        isProcessed: !!record,
        processedRecord: record,
      };
    })
    .sort((a, b) => {
      // Unprocessed first, then by date desc
      if (a.isProcessed !== b.isProcessed) return a.isProcessed ? 1 : -1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

/**
 * Download an XLS file from Storage and return as ArrayBuffer.
 */
export async function downloadInboxFile(fullPath: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(fullPath);

  if (error || !data) {
    throw new Error(`파일 다운로드 실패: ${error?.message || 'No data'}`);
  }

  return data.arrayBuffer();
}

/**
 * Process a single Storage file: download → parse → match → save.
 */
export async function processStorageFile(file: StorageFile): Promise<BulkImportResult> {
  const buffer = await downloadInboxFile(file.fullPath);
  const preview = await bulkLabImport.processFile(buffer);
  const result = await bulkLabImport.saveAll(preview);
  markProcessed(file, result);
  return result;
}

/**
 * Process all unprocessed files in one batch.
 */
export async function processAllStorageFiles(files: StorageFile[]): Promise<StorageImportSummary> {
  const unprocessed = files.filter((f) => !f.isProcessed);
  const details: StorageImportSummary['details'] = [];
  let successCount = 0;
  let failedCount = 0;
  let unmatchedCount = 0;
  let totalPatients = 0;
  let totalItems = 0;

  for (const file of unprocessed) {
    try {
      const result = await processStorageFile(file);
      details.push({ fileName: file.name, result });
      successCount++;
      totalPatients += result.savedPatients;
      totalItems += result.savedItems;
      unmatchedCount += result.failedPatients;
    } catch (err) {
      details.push({ fileName: file.name, error: (err as Error).message });
      failedCount++;
    }
  }

  return {
    totalFiles: unprocessed.length,
    successCount,
    failedCount,
    unmatchedCount,
    totalPatients,
    totalItems,
    details,
  };
}
