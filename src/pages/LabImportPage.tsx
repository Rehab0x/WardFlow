import { useState, useEffect } from 'react';
import { LabImportInbox } from '@/components/lab/LabImportInbox';
import { StorageLabInbox } from '@/components/lab/StorageLabInbox';
import { uploadBackupToServer, downloadBackupFromServer } from '@/services/backupService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloudDownload, Loader2, Database, Eye, EyeOff, Cloud, FolderOpen } from 'lucide-react';
import { db } from '@/db/database';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseBackend } from '@/config/backend';
import { listActivePatients } from '@/data/patients.repository';

type ImportMode = 'storage' | 'local';

/**
 * Standalone Lab Import page — /lab-import
 *
 * 두 가지 모드 지원:
 * 1. Storage 모드 (기본): Supabase Storage에서 XLS 가져오기 — 터미널 환경
 * 2. Local 모드: File System Access API로 로컬 폴더 — GUI 환경
 */
const LabImportPage = () => {
  const { toast } = useToast();

  const [serverKey, setServerKey] = useState(() => localStorage.getItem('wardflow-server-key') || '');
  const [serverPw, setServerPw] = useState(() => localStorage.getItem('wardflow-server-pw') || '');
  const [showPw, setShowPw] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [setupDone, setSetupDone] = useState(false);
  const [mode, setMode] = useState<ImportMode>('storage');

  useEffect(() => {
    const loadPatientCount = async () => {
      const c = useSupabaseBackend
        ? (await listActivePatients()).length
        : await db.patients.where('status').equals('active').count();
      setPatientCount(c);
      if (c > 0) setSetupDone(true);
    };

    loadPatientCount();
  }, []);

  const saveSettings = () => {
    localStorage.setItem('wardflow-server-key', serverKey);
    localStorage.setItem('wardflow-server-pw', serverPw);
  };

  const handleDownloadData = async () => {
    if (!serverKey.trim() || !serverPw) {
      toast({ title: '동기화 키와 비밀번호를 입력해주세요.', variant: 'destructive' });
      return;
    }
    saveSettings();
    setSyncing(true);
    try {
      await downloadBackupFromServer(serverPw, serverKey.trim());
      const count = useSupabaseBackend
        ? (await listActivePatients()).length
        : await db.patients.where('status').equals('active').count();
      setPatientCount(count);
      setSetupDone(true);
      toast({ title: '데이터 가져오기 완료', description: `환자 ${count}명 로드됨` });
    } catch (err) {
      toast({ title: '다운로드 실패', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleServerSync = serverKey && serverPw
    ? async () => {
        saveSettings();
        await uploadBackupToServer(serverPw, serverKey.trim());
      }
    : undefined;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-primary">Lab Auto Import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            XLS 파일을 자동으로 파싱하여 환자에게 등록합니다.
          </p>
        </div>

        {/* Step 1: Server connection + data download */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">서버 연결</h2>
            {patientCount !== null && (
              <span className="text-xs text-muted-foreground ml-auto">
                환자: {patientCount}명
              </span>
            )}
          </div>

          {setupDone ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Database className="h-4 w-4" />
              환자 데이터 준비 완료 ({patientCount}명)
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              동기화 키와 비밀번호를 입력하고 환자 데이터를 가져오세요.
            </p>
          )}

          <div className="space-y-2">
            <Input
              placeholder="동기화 키"
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              className="text-sm"
            />
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="비밀번호"
                value={serverPw}
                onChange={(e) => setServerPw(e.target.value)}
                className="text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <Button size="sm" onClick={handleDownloadData} disabled={syncing || !serverKey || !serverPw}>
            {syncing ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />가져오는 중...</>
            ) : (
              <><CloudDownload className="h-3.5 w-3.5 mr-1" />서버에서 데이터 가져오기</>
            )}
          </Button>
        </Card>

        {/* Step 2: Import mode selector + inbox */}
        {setupDone && (
          <>
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === 'storage' ? 'default' : 'outline'}
                className="h-8 text-xs"
                onClick={() => setMode('storage')}
              >
                <Cloud className="h-3.5 w-3.5 mr-1" />
                Storage (원격)
              </Button>
              <Button
                size="sm"
                variant={mode === 'local' ? 'default' : 'outline'}
                className="h-8 text-xs"
                onClick={() => setMode('local')}
              >
                <FolderOpen className="h-3.5 w-3.5 mr-1" />
                로컬 폴더
              </Button>
            </div>

            {/* Storage mode */}
            {mode === 'storage' && serverKey && (
              <StorageLabInbox
                syncKey={serverKey.trim()}
                onServerSync={handleServerSync}
                autoRun={true}
              />
            )}

            {/* Local folder mode */}
            {mode === 'local' && (
              <LabImportInbox
                onServerSync={handleServerSync}
                autoRun={false}
              />
            )}
          </>
        )}

        {!setupDone && (
          <Card className="p-6 text-center text-muted-foreground">
            <p className="text-sm">먼저 서버에서 환자 데이터를 가져오세요.</p>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            WardFlow Lab Import — 계정 생성 불필요, 동기화 키만 있으면 됩니다.
          </p>
          {mode === 'storage' && serverKey && (
            <p className="text-[10px] text-muted-foreground font-mono">
              curl 업로드 경로: lab-inbox/{serverKey.trim()}/filename.xls
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabImportPage;
