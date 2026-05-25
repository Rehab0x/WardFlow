import { useRef, useState } from 'react';
import {
  Bell,
  Cloud,
  CloudDownload,
  CloudUpload,
  Download,
  Eye,
  EyeOff,
  HardDrive,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { formatUserFacingError } from '@/lib/errorMessages';
import {
  downloadBackupFromServer,
  downloadBlob,
  exportBackup,
  exportBackupAsText,
  getServerBackupInfo,
  importBackup,
  importBackupFromText,
  isDailyBackupEnabled,
  setDailyBackupEnabled,
  uploadBackupToServer,
} from '@/services/backupService';

export function LegacyBackupSettings() {
  const { toast } = useToast();
  const [backupPassword, setBackupPassword] = useState('');
  const [backupShowPw, setBackupShowPw] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreShowPw, setRestoreShowPw] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [dailyBackup, setDailyBackup] = useState(isDailyBackupEnabled);
  const [textExportPw, setTextExportPw] = useState('');
  const [textExportLoading, setTextExportLoading] = useState(false);
  const [textImportPw, setTextImportPw] = useState('');
  const [textImportData, setTextImportData] = useState('');
  const [textImportLoading, setTextImportLoading] = useState(false);
  const [serverPw, setServerPwState] = useState(
    () => localStorage.getItem('wardflow-server-pw') || ''
  );
  const [serverKey, setServerKeyState] = useState(
    () => localStorage.getItem('wardflow-server-key') || ''
  );
  const [serverInfo, setServerInfo] = useState<{ exists: boolean; updatedAt?: string } | null>(
    null
  );
  const [serverLoading, setServerLoading] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const trimmedServerKey = serverKey.trim();

  const setServerPw = (value: string) => {
    setServerPwState(value);
    localStorage.setItem('wardflow-server-pw', value);
  };
  const setServerKey = (value: string) => {
    setServerKeyState(value);
    localStorage.setItem('wardflow-server-key', value);
  };

  const exportFile = async () => {
    if (backupPassword.length < 4) {
      toast({ title: '비밀번호는 4자 이상이어야 합니다.', variant: 'destructive' });
      return;
    }
    setBackupLoading(true);
    try {
      const blob = await exportBackup(backupPassword);
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      downloadBlob(blob, `wardflow_backup_${date}.wardflow`);
      setBackupPassword('');
      toast({ title: '백업 완료', description: '암호화된 백업 파일을 다운로드했습니다.' });
    } catch (err) {
      toast({
        title: '백업 실패',
        description: formatUserFacingError(err, '백업 파일을 만들지 못했습니다.'),
        variant: 'destructive',
      });
    } finally {
      setBackupLoading(false);
    }
  };

  const importFile = async () => {
    if (!restoreFile || !restorePassword) return;
    if (!window.confirm('현재 데이터를 백업 파일 내용으로 교체합니다. 계속하시겠습니까?')) return;
    setRestoreLoading(true);
    try {
      const result = await importBackup(restoreFile, restorePassword);
      toast({
        title: '복원 완료',
        description: `환자 ${result.patientCount}명, 메모 ${result.noteCount}건을 복원했습니다.`,
      });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast({
        title: '복원 실패',
        description: formatUserFacingError(err, '백업 파일을 복원하지 못했습니다.'),
        variant: 'destructive',
      });
    } finally {
      setRestoreLoading(false);
    }
  };

  const copyTextBackup = async () => {
    if (textExportPw.length < 4) {
      toast({ title: '비밀번호는 4자 이상이어야 합니다.', variant: 'destructive' });
      return;
    }
    setTextExportLoading(true);
    try {
      const text = await exportBackupAsText(textExportPw);
      await navigator.clipboard.writeText(text);
      setTextExportPw('');
      toast({
        title: '클립보드에 복사했습니다.',
        description: '다른 기기에서 텍스트 복원에 붙여넣을 수 있습니다.',
      });
    } catch (err) {
      toast({
        title: '텍스트 백업 실패',
        description: formatUserFacingError(err, '백업 텍스트를 만들지 못했습니다.'),
        variant: 'destructive',
      });
    } finally {
      setTextExportLoading(false);
    }
  };

  const importTextBackup = async () => {
    if (!textImportData.trim() || !textImportPw) return;
    if (!window.confirm('현재 데이터를 백업 텍스트 내용으로 교체합니다. 계속하시겠습니까?')) return;
    setTextImportLoading(true);
    try {
      const result = await importBackupFromText(textImportData, textImportPw);
      toast({
        title: '복원 완료',
        description: `환자 ${result.patientCount}명, 메모 ${result.noteCount}건을 복원했습니다.`,
      });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast({
        title: '텍스트 복원 실패',
        description: formatUserFacingError(err, '백업 텍스트를 복원하지 못했습니다.'),
        variant: 'destructive',
      });
    } finally {
      setTextImportLoading(false);
    }
  };

  const uploadServer = async () => {
    if (!serverPw || !trimmedServerKey) return;
    setServerLoading(true);
    try {
      const result = await uploadBackupToServer(serverPw, trimmedServerKey);
      setServerInfo({ exists: true, updatedAt: result.updatedAt });
      toast({
        title: '서버 업로드 완료',
        description: new Date(result.updatedAt).toLocaleString(),
      });
    } catch (err) {
      toast({
        title: '서버 업로드 실패',
        description: formatUserFacingError(err, '서버 백업을 업로드하지 못했습니다.'),
        variant: 'destructive',
      });
    } finally {
      setServerLoading(false);
    }
  };

  const downloadServer = async () => {
    if (!serverPw || !trimmedServerKey) return;
    if (!window.confirm('서버 데이터로 현재 데이터를 교체합니다. 계속하시겠습니까?')) return;
    setServerLoading(true);
    try {
      const result = await downloadBackupFromServer(serverPw, trimmedServerKey);
      toast({
        title: '서버 복원 완료',
        description: `환자 ${result.patientCount}명, 메모 ${result.noteCount}건을 복원했습니다.`,
      });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast({
        title: '서버 복원 실패',
        description: formatUserFacingError(err, '서버 백업을 복원하지 못했습니다.'),
        variant: 'destructive',
      });
    } finally {
      setServerLoading(false);
    }
  };

  const checkServer = async () => {
    if (!trimmedServerKey) return;
    setServerLoading(true);
    try {
      const info = await getServerBackupInfo(trimmedServerKey);
      setServerInfo(info);
      toast({ title: info.exists ? '서버 백업 확인됨' : '저장된 서버 백업이 없습니다.' });
    } catch (err) {
      toast({
        title: '서버 백업 확인 실패',
        description: formatUserFacingError(err, '서버 백업 정보를 확인하지 못했습니다.'),
        variant: 'destructive',
      });
    } finally {
      setServerLoading(false);
    }
  };

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center gap-2">
        <HardDrive className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">백업 / 복원</h2>
      </div>
      <p className="text-sm text-muted-foreground">로컬 데이터를 파일 또는 텍스트로 백업합니다.</p>
      <label className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">매일 첫 실행 시 백업 알림</span>
        </div>
        <input
          type="checkbox"
          checked={dailyBackup}
          onChange={(event) => {
            setDailyBackup(event.target.checked);
            setDailyBackupEnabled(event.target.checked);
          }}
        />
      </label>
      <BackupPasswordRow
        title="백업 내보내기"
        icon={<Download className="h-4 w-4 text-green-600" />}
        password={backupPassword}
        setPassword={setBackupPassword}
        showPassword={backupShowPw}
        setShowPassword={setBackupShowPw}
        buttonLabel="내보내기"
        onClick={exportFile}
        loading={backupLoading}
      />
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-medium">백업 복원</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => restoreInputRef.current?.click()}>
            {restoreFile ? restoreFile.name : '파일 선택'}
          </Button>
          <input
            ref={restoreInputRef}
            type="file"
            accept=".wardflow"
            className="hidden"
            onChange={(event) => setRestoreFile(event.target.files?.[0] ?? null)}
          />
          <div className="relative min-w-[220px] flex-1">
            <Input
              type={restoreShowPw ? 'text' : 'password'}
              placeholder="백업 비밀번호"
              value={restorePassword}
              onChange={(event) => setRestorePassword(event.target.value)}
              className="pr-9"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
              onClick={() => setRestoreShowPw(!restoreShowPw)}
            >
              {restoreShowPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Button
            variant="destructive"
            onClick={importFile}
            disabled={restoreLoading || !restoreFile || !restorePassword}
          >
            {restoreLoading ? '복원 중...' : '복원'}
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-medium">텍스트로 복사</h3>
          <Input
            type="password"
            placeholder="암호화 비밀번호"
            value={textExportPw}
            onChange={(event) => setTextExportPw(event.target.value)}
          />
          <Button size="sm" onClick={copyTextBackup} disabled={textExportLoading || !textExportPw}>
            {textExportLoading ? '복사 중...' : '복사'}
          </Button>
        </div>
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-medium">텍스트에서 복원</h3>
          <textarea
            className="h-20 w-full resize-none rounded-md border bg-background p-2 text-xs"
            value={textImportData}
            onChange={(event) => setTextImportData(event.target.value)}
          />
          <Input
            type="password"
            placeholder="백업 비밀번호"
            value={textImportPw}
            onChange={(event) => setTextImportPw(event.target.value)}
          />
          <Button
            size="sm"
            variant="destructive"
            onClick={importTextBackup}
            disabled={textImportLoading || !textImportPw || !textImportData.trim()}
          >
            {textImportLoading ? '복원 중...' : '복원'}
          </Button>
        </div>
      </div>
      <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">레거시 서버 동기화</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            placeholder="동기화 키"
            value={serverKey}
            onChange={(event) => setServerKey(event.target.value)}
          />
          <Input
            type="password"
            placeholder="암호화 비밀번호"
            value={serverPw}
            onChange={(event) => setServerPw(event.target.value)}
          />
        </div>
        {serverInfo && (
          <p className="text-xs text-muted-foreground">
            {serverInfo.exists
              ? `마지막 저장: ${new Date(serverInfo.updatedAt ?? '').toLocaleString()}`
              : '저장된 데이터 없음'}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkServer}
            disabled={serverLoading || !trimmedServerKey}
          >
            {serverLoading ? '확인 중...' : '확인'}
          </Button>
          <Button
            size="sm"
            onClick={uploadServer}
            disabled={serverLoading || !trimmedServerKey || !serverPw}
          >
            <CloudUpload className="mr-1 h-3.5 w-3.5" />
            업로드
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={downloadServer}
            disabled={serverLoading || !trimmedServerKey || !serverPw}
          >
            <CloudDownload className="mr-1 h-3.5 w-3.5" />
            다운로드
          </Button>
        </div>
      </div>
    </Card>
  );
}

function BackupPasswordRow({
  title,
  icon,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  buttonLabel,
  onClick,
  loading,
}: {
  title: string;
  icon: React.ReactNode;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  buttonLabel: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="암호화 비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pr-9"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <Button onClick={onClick} disabled={loading || !password}>
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
