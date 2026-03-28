import { useState, useCallback, useEffect } from 'react';
import { FolderOpen, RefreshCw, Play, CheckCircle2, FileSpreadsheet, Loader2, Trash2, CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  scanFolder,
  processInboxFile,
  processAllUnprocessed,
  clearProcessedHistory,
  saveDirHandle,
  loadDirHandle,
  verifyDirHandle,
  type InboxFile,
} from '@/services/labImportInbox';

interface LabImportInboxProps {
  onServerSync?: () => Promise<void>;
  autoRun?: boolean; // 페이지 로드 시 자동 실행
}

export function LabImportInbox({ onServerSync, autoRun }: LabImportInboxProps) {
  const { toast } = useToast();
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [files, setFiles] = useState<InboxFile[]>([]);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoStatus, setAutoStatus] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const unprocessedCount = files.filter((f) => !f.isProcessed).length;

  // ── Restore saved folder handle on mount ───

  useEffect(() => {
    const restore = async () => {
      const saved = await loadDirHandle();
      if (saved) {
        const verified = await verifyDirHandle(saved);
        if (verified) {
          setDirHandle(verified);
          await doScan(verified);
        }
      }
      setInitialized(true);
    };
    restore();
  }, []);

  // ── Auto-run: process all + sync when autoRun=true ───

  useEffect(() => {
    if (!autoRun || !initialized || !dirHandle) return;
    if (files.length === 0) return;

    const unprocessed = files.filter((f) => !f.isProcessed);
    if (unprocessed.length === 0) {
      setAutoStatus('새 파일 없음 — 모든 파일이 이미 처리되었습니다.');
      return;
    }

    // Auto-execute
    const run = async () => {
      setBatchProcessing(true);
      setAutoStatus(`${unprocessed.length}개 파일 처리 중...`);
      try {
        const result = await processAllUnprocessed(files);
        setAutoStatus(`처리 완료: ${result.totalPatients}명 / ${result.totalItems}개 항목`);
        await doScan(dirHandle);

        // Auto sync
        if (onServerSync) {
          setAutoStatus('서버 동기화 중...');
          setSyncing(true);
          await onServerSync();
          setSyncing(false);
          setAutoStatus(`완료: ${result.totalPatients}명 저장 + 서버 동기화 완료`);
        }
      } catch (err) {
        setAutoStatus(`오류: ${(err as Error).message}`);
      } finally {
        setBatchProcessing(false);
        setSyncing(false);
      }
    };

    run();
  }, [autoRun, initialized, dirHandle, files.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Folder connection ───

  const handleConnectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      setDirHandle(handle);
      await saveDirHandle(handle);
      await doScan(handle);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast({ title: '폴더 연결 실패', description: (err as Error).message, variant: 'destructive' });
      }
    }
  };

  // ── Scan ───

  const doScan = async (handle: FileSystemDirectoryHandle) => {
    setScanning(true);
    try {
      const scanned = await scanFolder(handle);
      setFiles(scanned);
    } catch (err) {
      toast({ title: '스캔 실패', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    if (dirHandle) await doScan(dirHandle);
  }, [dirHandle]);

  // ── Process single file ───

  const handleProcessFile = async (file: InboxFile) => {
    setProcessing(file.name);
    try {
      const result = await processInboxFile(file);
      toast({
        title: `${file.name} 처리 완료`,
        description: `${result.savedPatients}명 / ${result.savedItems}개 항목 저장`,
      });
      // Re-scan to update status
      if (dirHandle) await doScan(dirHandle);
    } catch (err) {
      toast({ title: '처리 실패', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  // ── Server sync after import ───

  const handleSyncAfterImport = async () => {
    if (!onServerSync) return;
    setSyncing(true);
    try {
      await onServerSync();
      toast({ title: '서버 동기화 완료' });
    } catch (err) {
      toast({ title: '동기화 실패', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  // ── Auto: process all + sync ───

  const handleAutoImport = async () => {
    setBatchProcessing(true);
    try {
      const result = await processAllUnprocessed(files);

      if (result.totalFiles === 0) {
        toast({ title: '처리할 새 파일이 없습니다.' });
        setBatchProcessing(false);
        return;
      }

      toast({
        title: `Lab 가져오기 완료 (${result.totalFiles}개 파일)`,
        description: `${result.totalPatients}명 / ${result.totalItems}개 항목`,
      });

      if (dirHandle) await doScan(dirHandle);
      setBatchProcessing(false);

      // Auto server sync
      if (onServerSync) {
        setSyncing(true);
        try {
          await onServerSync();
          toast({ title: '서버 동기화 완료' });
        } catch {
          toast({ title: '서버 동기화 실패', variant: 'destructive' });
        } finally {
          setSyncing(false);
        }
      }
    } catch (err) {
      toast({ title: '자동 가져오기 실패', description: (err as Error).message, variant: 'destructive' });
      setBatchProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    return `${(bytes / 1024).toFixed(1)}KB`;
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold">Lab Import Inbox</h3>
          <p className="text-xs text-muted-foreground">
            {dirHandle
              ? `연결됨: ${dirHandle.name}/`
              : '폴더를 연결하면 XLS 파일을 자동으로 가져옵니다.'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleConnectFolder}>
            <FolderOpen className="h-3.5 w-3.5 mr-1" />
            {dirHandle ? '폴더 변경' : '폴더 연결'}
          </Button>
          {dirHandle && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleRefresh} disabled={scanning}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${scanning ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          )}
        </div>
      </div>

      {/* Auto-run status */}
      {autoRun && autoStatus && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2">
            {(batchProcessing || syncing) && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {!batchProcessing && !syncing && autoStatus.startsWith('완료') && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            <p className="text-sm font-medium">{autoStatus}</p>
          </div>
        </Card>
      )}

      {/* Not connected */}
      {!dirHandle && initialized && (
        <Card className="p-8 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            오픈클로가 XLS를 저장하는 폴더를 연결하세요.
          </p>
          <Button className="mt-4" onClick={handleConnectFolder}>
            <FolderOpen className="h-4 w-4 mr-2" />
            폴더 선택
          </Button>
        </Card>
      )}

      {/* Connected: file list */}
      {dirHandle && (
        <>
          {/* Action buttons */}
          {files.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={handleAutoImport}
                disabled={unprocessedCount === 0 || batchProcessing || !!processing}
              >
                {batchProcessing ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />처리 중...</>
                ) : (
                  <><Play className="h-3.5 w-3.5 mr-1" />전체 가져오기 + 동기화 ({unprocessedCount})</>
                )}
              </Button>
              {onServerSync && (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSyncAfterImport} disabled={syncing}>
                  {syncing ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />동기화 중...</>
                  ) : (
                    <><CloudUpload className="h-3.5 w-3.5 mr-1" />서버 동기화</>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => { clearProcessedHistory(); if (dirHandle) doScan(dirHandle); }}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                처리 기록 초기화
              </Button>
            </div>
          )}

          {/* File list */}
          {files.length === 0 && !scanning && (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">폴더에 XLS 파일이 없습니다.</p>
            </Card>
          )}

          {scanning && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">스캔 중...</span>
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-1.5">
              {files.map((f) => (
                <div
                  key={`${f.name}-${f.lastModified}`}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2.5 ${
                    f.isProcessed
                      ? 'bg-muted/30 opacity-60'
                      : 'bg-background'
                  }`}
                >
                  <FileSpreadsheet className={`h-5 w-5 shrink-0 ${f.isProcessed ? 'text-green-500' : 'text-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{formatFileSize(f.size)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(f.lastModified)}
                      {f.isProcessed && f.processedRecord && (
                        <span className="ml-2 text-green-600">
                          처리 완료 ({f.processedRecord.result.savedPatients}명/{f.processedRecord.result.savedItems}항목)
                        </span>
                      )}
                    </p>
                  </div>
                  {f.isProcessed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0"
                      onClick={() => handleProcessFile(f)}
                      disabled={!!processing || batchProcessing}
                    >
                      {processing === f.name ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        '가져오기'
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
