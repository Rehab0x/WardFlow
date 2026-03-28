import { useState, useCallback, useEffect } from 'react';
import { Cloud, RefreshCw, Play, CheckCircle2, FileSpreadsheet, Loader2, Trash2, CloudUpload, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  listInboxFiles,
  processStorageFile,
  processAllStorageFiles,
  clearStorageProcessedHistory,
  type StorageFile,
  type StorageImportSummary,
} from '@/services/storageInbox';

interface StorageLabInboxProps {
  syncKey: string;
  onServerSync?: () => Promise<void>;
  autoRun?: boolean;
}

export function StorageLabInbox({ syncKey, onServerSync, autoRun }: StorageLabInboxProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoStatus, setAutoStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<StorageImportSummary | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const unprocessedCount = files.filter((f) => !f.isProcessed).length;

  // ── Scan Storage ───

  const doScan = useCallback(async () => {
    if (!syncKey) return;
    setScanning(true);
    setScanError(null);
    try {
      const result = await listInboxFiles(syncKey);
      setFiles(result);
    } catch (err) {
      const msg = (err as Error).message;
      setScanError(msg);
      toast({ title: 'Storage 스캔 실패', description: msg, variant: 'destructive' });
    } finally {
      setScanning(false);
      setInitialized(true);
    }
  }, [syncKey]);

  // Initial scan
  useEffect(() => {
    if (syncKey) doScan();
  }, [syncKey, doScan]);

  // ── Auto-run (once) ───

  const [autoRan, setAutoRan] = useState(false);

  useEffect(() => {
    if (!autoRun || !initialized || !syncKey || autoRan) return;
    if (batchProcessing) return; // already running

    const unprocessed = files.filter((f) => !f.isProcessed);
    console.log('[StorageLabInbox] autoRun check — initialized:', initialized, 'files:', files.length, 'unprocessed:', unprocessed.length);

    if (unprocessed.length === 0) {
      setAutoStatus(files.length === 0 ? 'Storage에 파일 없음' : '새 파일 없음 — 모든 파일 처리 완료');
      return;
    }

    setAutoRan(true);

    const run = async () => {
      setBatchProcessing(true);
      setAutoStatus(`${unprocessed.length}개 파일 처리 중...`);
      try {
        const result = await processAllStorageFiles(files);
        setSummary(result);
        setAutoStatus(`처리 완료: ${result.totalPatients}명 / ${result.totalItems}개 항목`);
        await doScan();

        if (onServerSync) {
          setAutoStatus('서버 동기화 중...');
          setSyncing(true);
          await onServerSync();
          setSyncing(false);
          setAutoStatus(`완료: ${result.totalPatients}명 저장 + 서버 동기화`);
        }
      } catch (err) {
        setAutoStatus(`오류: ${(err as Error).message}`);
      } finally {
        setBatchProcessing(false);
        setSyncing(false);
      }
    };

    run();
  }, [autoRun, initialized, syncKey, autoRan, batchProcessing, files]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Process single ───

  const handleProcessFile = async (file: StorageFile) => {
    setProcessing(file.name);
    try {
      const result = await processStorageFile(file);
      toast({
        title: `${file.name} 처리 완료`,
        description: `${result.savedPatients}명 / ${result.savedItems}개 항목`,
      });
      await doScan();
    } catch (err) {
      toast({ title: '처리 실패', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  // ── Process all + sync ───

  const handleAutoImport = async () => {
    setBatchProcessing(true);
    setSummary(null);
    try {
      const unprocessed = files.filter((f) => !f.isProcessed);
      if (unprocessed.length === 0) {
        toast({ title: '처리할 새 파일이 없습니다.' });
        setBatchProcessing(false);
        return;
      }

      const result = await processAllStorageFiles(files);
      setSummary(result);
      toast({
        title: `처리 완료 (${result.totalFiles}개 파일)`,
        description: `${result.totalPatients}명 / ${result.totalItems}개 항목`,
      });
      await doScan();
      setBatchProcessing(false);

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
      toast({ title: '처리 실패', description: (err as Error).message, variant: 'destructive' });
      setBatchProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes}B`;
    return `${(bytes / 1024).toFixed(1)}KB`;
  };

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Cloud className="h-4 w-4 text-blue-500" />
            Storage Inbox
          </h3>
          <p className="text-xs text-muted-foreground">
            경로: lab-inbox/{syncKey}/
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={doScan} disabled={scanning}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${scanning ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* Auto-run status */}
      {autoRun && autoStatus && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2">
            {(batchProcessing || syncing) && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {!batchProcessing && !syncing && autoStatus.startsWith('완료') && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {!batchProcessing && !syncing && autoStatus.startsWith('오류') && <XCircle className="h-4 w-4 text-destructive" />}
            <p className="text-sm font-medium">{autoStatus}</p>
          </div>
        </Card>
      )}

      {/* Summary */}
      {summary && (
        <Card className="p-4 space-y-2">
          <h4 className="text-sm font-medium">처리 결과</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-lg font-bold">{summary.totalFiles}</p>
              <p className="text-[10px] text-muted-foreground">전체 파일</p>
            </div>
            <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2">
              <p className="text-lg font-bold text-green-600">{summary.successCount}</p>
              <p className="text-[10px] text-muted-foreground">성공</p>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-lg font-bold">{summary.totalPatients}명/{summary.totalItems}항목</p>
              <p className="text-[10px] text-muted-foreground">저장</p>
            </div>
            {summary.failedCount > 0 && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-2">
                <p className="text-lg font-bold text-destructive">{summary.failedCount}</p>
                <p className="text-[10px] text-muted-foreground">실패</p>
              </div>
            )}
          </div>
          {summary.details.some((d) => d.error) && (
            <div className="space-y-1 mt-2">
              {summary.details.filter((d) => d.error).map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{d.fileName}: {d.error}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

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
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={async () => {
              setSyncing(true);
              try { await onServerSync(); toast({ title: '서버 동기화 완료' }); }
              catch { toast({ title: '동기화 실패', variant: 'destructive' }); }
              finally { setSyncing(false); }
            }} disabled={syncing}>
              {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5 mr-1" />}
              서버 동기화
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => { clearStorageProcessedHistory(); doScan(); }}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            처리 기록 초기화
          </Button>
        </div>
      )}

      {/* Loading */}
      {scanning && !initialized && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Storage 스캔 중...</span>
        </div>
      )}

      {/* Error */}
      {scanError && (
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-2">
            <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Storage 조회 오류</p>
              <p className="text-xs text-muted-foreground mt-1">{scanError}</p>
              <p className="text-xs text-muted-foreground mt-1">
                버킷 이름: <code className="bg-muted px-1 rounded">lab-inbox</code> /
                경로: <code className="bg-muted px-1 rounded">{syncKey}/</code>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Empty */}
      {initialized && files.length === 0 && !scanning && (
        <Card className="p-6 text-center">
          <Cloud className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Storage에 XLS 파일이 없습니다.</p>
          <p className="text-xs text-muted-foreground mt-1">
            OpenClaw가 lab-inbox/{syncKey}/ 에 파일을 업로드하면 여기에 표시됩니다.
          </p>
        </Card>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div
              key={f.fullPath}
              className={`flex items-center gap-3 rounded-md border px-3 py-2.5 ${
                f.isProcessed ? 'bg-muted/30 opacity-60' : 'bg-background'
              }`}
            >
              <FileSpreadsheet className={`h-5 w-5 shrink-0 ${f.isProcessed ? 'text-green-500' : 'text-blue-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{f.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatSize(f.size)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(f.updatedAt)}
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
    </div>
  );
}
