import { useState, useEffect } from 'react';
import { LabImportInbox } from '@/components/lab/LabImportInbox';
import { uploadBackupToServer, downloadBackupFromServer } from '@/services/backupService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloudDownload, CloudUpload, Check, Loader2, Database, Eye, EyeOff } from 'lucide-react';
import { db } from '@/db/database';
import { useToast } from '@/hooks/use-toast';

/**
 * Standalone Lab Import page — /lab-import
 *
 * 오픈클로 자동화용: 계정 생성/로그인 없이
 * 동기화 키+비밀번호만으로 환자 데이터 가져오기 + Lab 자동 등록
 */
const LabImportPage = () => {
  const { toast } = useToast();

  // 서버 동기화 설정 (localStorage persist)
  const [serverKey, setServerKey] = useState(() => localStorage.getItem('wardflow-server-key') || '');
  const [serverPw, setServerPw] = useState(() => localStorage.getItem('wardflow-server-pw') || '');
  const [showPw, setShowPw] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [setupDone, setSetupDone] = useState(false);

  // 환자 수 확인
  useEffect(() => {
    db.patients.count().then((c) => {
      setPatientCount(c);
      if (c > 0) setSetupDone(true);
    });
  }, []);

  const saveSettings = () => {
    localStorage.setItem('wardflow-server-key', serverKey);
    localStorage.setItem('wardflow-server-pw', serverPw);
  };

  // 서버에서 백업 다운로드 (환자 데이터 가져오기)
  const handleDownloadData = async () => {
    if (!serverKey.trim() || !serverPw) {
      toast({ title: '동기화 키와 비밀번호를 입력해주세요.', variant: 'destructive' });
      return;
    }
    saveSettings();
    setSyncing(true);
    try {
      await downloadBackupFromServer(serverPw, serverKey.trim());
      const count = await db.patients.count();
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
            폴더의 XLS 파일을 자동으로 파싱하여 환자에게 등록합니다.
          </p>
        </div>

        {/* Step 1: Server sync setup */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">서버 연결</h2>
            {patientCount !== null && (
              <span className="text-xs text-muted-foreground ml-auto">
                현재 환자: {patientCount}명
              </span>
            )}
          </div>

          {!setupDone ? (
            <p className="text-sm text-muted-foreground">
              WardFlow 본 계정의 동기화 키와 비밀번호를 입력하고 데이터를 가져오세요.
            </p>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-4 w-4" />
              환자 데이터 준비 완료 ({patientCount}명)
            </div>
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

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleDownloadData} disabled={syncing || !serverKey || !serverPw}>
              {syncing ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />가져오는 중...</>
              ) : (
                <><CloudDownload className="h-3.5 w-3.5 mr-1" />서버에서 데이터 가져오기</>
              )}
            </Button>
            {setupDone && handleServerSync && (
              <Button size="sm" variant="outline" onClick={async () => {
                setSyncing(true);
                try { await handleServerSync(); toast({ title: '서버 업로드 완료' }); }
                catch { toast({ title: '업로드 실패', variant: 'destructive' }); }
                finally { setSyncing(false); }
              }} disabled={syncing}>
                <CloudUpload className="h-3.5 w-3.5 mr-1" />업로드
              </Button>
            )}
          </div>
        </Card>

        {/* Step 2: Import Inbox */}
        {setupDone && (
          <LabImportInbox
            onServerSync={handleServerSync}
            autoRun={true}
          />
        )}

        {!setupDone && (
          <Card className="p-6 text-center text-muted-foreground">
            <p className="text-sm">먼저 서버에서 환자 데이터를 가져오세요.</p>
          </Card>
        )}

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center">
          WardFlow Lab Import — 계정 생성 불필요, 동기화 키만 있으면 됩니다.
        </p>
      </div>
    </div>
  );
};

export default LabImportPage;
