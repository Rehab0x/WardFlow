// File System Access API type declarations
declare global {
  interface Window {
    showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
  }
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
  }
}

/**
 * Lab Import Inbox Service
 *
 * File System Access API를 사용하여 지정 폴더에서 XLS 파일을 스캔,
 * 기존 bulkLabImport 서비스로 파싱/저장하고, 처리 완료 파일을 추적합니다.
 */

import { bulkLabImport, type BulkImportResult } from './bulkLabImport';

const STORAGE_KEY = 'wardflow-lab-inbox-processed';
const DIR_HANDLE_DB = 'wardflow-dir-handles';
const DIR_HANDLE_STORE = 'handles';
const DIR_HANDLE_KEY = 'lab-inbox';

// ─── Directory handle persistence (IndexedDB) ───

function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DIR_HANDLE_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DIR_HANDLE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIR_HANDLE_STORE, 'readwrite');
    tx.objectStore(DIR_HANDLE_STORE).put(handle, DIR_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DIR_HANDLE_STORE, 'readonly');
      const req = tx.objectStore(DIR_HANDLE_STORE).get(DIR_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function removeDirHandle(): Promise<void> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DIR_HANDLE_STORE, 'readwrite');
      tx.objectStore(DIR_HANDLE_STORE).delete(DIR_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

/**
 * Verify a saved handle still has permission.
 * Returns the handle if valid, null otherwise.
 */
export async function verifyDirHandle(handle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle | null> {
  try {
    const perm = await (handle as any).queryPermission({ mode: 'read' });
    if (perm === 'granted') return handle;
    // Try requesting permission (requires user gesture)
    const req = await (handle as any).requestPermission({ mode: 'read' });
    return req === 'granted' ? handle : null;
  } catch {
    return null;
  }
}

export interface ProcessedFileRecord {
  name: string;
  size: number;
  lastModified: number;
  processedAt: string;
  result: { savedPatients: number; savedItems: number };
}

export interface InboxFile {
  name: string;
  size: number;
  lastModified: number;
  file: File;
  isProcessed: boolean;
  processedRecord?: ProcessedFileRecord;
}

// ─── Processed file tracking (localStorage) ───

function getProcessedFiles(): ProcessedFileRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function markAsProcessed(file: InboxFile, result: BulkImportResult) {
  const records = getProcessedFiles();
  records.push({
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    processedAt: new Date().toISOString(),
    result: { savedPatients: result.savedPatients, savedItems: result.savedItems },
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function isFileProcessed(name: string, size: number, lastModified: number): ProcessedFileRecord | undefined {
  return getProcessedFiles().find(
    (r) => r.name === name && r.size === size && r.lastModified === lastModified
  );
}

export function clearProcessedHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Folder scanning ───

/**
 * Scan a directory handle for XLS files and check processed status.
 */
export async function scanFolder(dirHandle: FileSystemDirectoryHandle): Promise<InboxFile[]> {
  const files: InboxFile[] = [];

  for await (const entry of dirHandle.values()) {
    if (entry.kind !== 'file') continue;
    if (!entry.name.match(/\.xls$/i)) continue;

    const file = await entry.getFile();
    const record = isFileProcessed(file.name, file.size, file.lastModified);

    files.push({
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      file,
      isProcessed: !!record,
      processedRecord: record,
    });
  }

  // Sort: unprocessed first, then by lastModified desc
  files.sort((a, b) => {
    if (a.isProcessed !== b.isProcessed) return a.isProcessed ? 1 : -1;
    return b.lastModified - a.lastModified;
  });

  return files;
}

/**
 * Process a single XLS file: parse → match patients → save to DB.
 * Returns the import result.
 */
export async function processInboxFile(inboxFile: InboxFile): Promise<BulkImportResult> {
  const buffer = await inboxFile.file.arrayBuffer();
  const preview = await bulkLabImport.processFile(buffer);
  const result = await bulkLabImport.saveAll(preview);
  markAsProcessed(inboxFile, result);
  return result;
}

/**
 * Process all unprocessed files in one batch.
 */
export async function processAllUnprocessed(files: InboxFile[]): Promise<{
  totalFiles: number;
  totalPatients: number;
  totalItems: number;
  results: Array<{ fileName: string; result: BulkImportResult }>;
}> {
  const unprocessed = files.filter((f) => !f.isProcessed);
  const results: Array<{ fileName: string; result: BulkImportResult }> = [];
  let totalPatients = 0;
  let totalItems = 0;

  for (const file of unprocessed) {
    const result = await processInboxFile(file);
    results.push({ fileName: file.name, result });
    totalPatients += result.savedPatients;
    totalItems += result.savedItems;
  }

  return { totalFiles: unprocessed.length, totalPatients, totalItems, results };
}
