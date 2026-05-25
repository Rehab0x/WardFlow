import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Cloud,
  CloudUpload,
  Eye,
  EyeOff,
  HardDrive,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  createSupabaseBackupSnapshot,
  deleteSupabaseBackupSnapshot,
  formatBackupSnapshotError,
  listSupabaseBackupSnapshots,
  previewSupabaseBackupSnapshot,
  type SnapshotPreview,
} from '@/services/backupSnapshotService';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/utils/cn';
import type { BackupSnapshotSummary } from '@/data/backupSnapshots.repository';

export function SupabaseBackupSettings() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [previewPassword, setPreviewPassword] = useState('');
  const [previewId, setPreviewId] = useState('');
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SnapshotPreview | null>(null);
  const [snapshots, setSnapshots] = useState<BackupSnapshotSummary[]>([]);

  const loadSnapshots = useCallback(async () => {
    if (!currentUser) return;
    setLoadingSnapshots(true);
    try {
      const items = await listSupabaseBackupSnapshots(currentUser.id);
      setSnapshots(items);
      setPreviewId((current) => current || items[0]?.id || '');
      setError(null);
    } catch (err) {
      const message = formatBackupSnapshotError(err, '스냅샷 목록을 불러오지 못했습니다.');
      setError(message);
      toast({ title: '스냅샷 목록 로드 실패', description: message, variant: 'destructive' });
    } finally {
      setLoadingSnapshots(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const createSnapshot = async () => {
    if (!currentUser) return;
    if (password.trim().length < 4) {
      toast({ title: '비밀번호는 4자 이상이어야 합니다.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const snapshot = await createSupabaseBackupSnapshot({ ownerId: currentUser.id, password });
      setPassword('');
      setSnapshots((current) => [snapshot, ...current]);
      setPreviewId(snapshot.id);
      setPreview(null);
      setError(null);
      toast({
        title: '스냅샷 생성 완료',
        description: 'Supabase 데이터를 암호화 스냅샷으로 저장했습니다.',
      });
    } catch (err) {
      const message = formatBackupSnapshotError(err, '스냅샷을 생성하지 못했습니다.');
      setError(message);
      toast({ title: '스냅샷 생성 실패', description: message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const checkSnapshot = async () => {
    if (!previewId || !previewPassword) return;
    setPreviewing(true);
    try {
      const result = await previewSupabaseBackupSnapshot({
        snapshotId: previewId,
        password: previewPassword,
      });
      setPreview(result);
      setError(null);
      toast({
        title: '스냅샷 확인 완료',
        description: `환자 ${result.recordCounts.patients}명, 현재 ${result.currentCounts.patients}명`,
      });
    } catch (err) {
      const message = formatBackupSnapshotError(err, '스냅샷을 확인하지 못했습니다.');
      setPreview(null);
      setError(message);
      toast({ title: '스냅샷 확인 실패', description: message, variant: 'destructive' });
    } finally {
      setPreviewing(false);
    }
  };

  const selectedSnapshot = snapshots.find((snapshot) => snapshot.id === previewId);
  const isBusy = loadingSnapshots || creating || previewing || Boolean(deletingId);

  const deleteSnapshot = async () => {
    if (!selectedSnapshot) return;
    const confirmed = window.confirm(
      `${formatSnapshotOption(selectedSnapshot)} 스냅샷을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    setDeletingId(selectedSnapshot.id);
    try {
      await deleteSupabaseBackupSnapshot(selectedSnapshot.id);
      setSnapshots((current) => {
        const next = current.filter((snapshot) => snapshot.id !== selectedSnapshot.id);
        setPreviewId(next[0]?.id || '');
        return next;
      });
      setPreview(null);
      setPreviewPassword('');
      setError(null);
      toast({ title: '스냅샷 삭제 완료', description: '선택한 스냅샷을 삭제했습니다.' });
    } catch (err) {
      const message = formatBackupSnapshotError(err, '스냅샷을 삭제하지 못했습니다.');
      setError(message);
      toast({ title: '스냅샷 삭제 실패', description: message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Supabase 백업</h2>
        </div>
        <Button variant="outline" size="sm" onClick={loadSnapshots} disabled={isBusy}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          {loadingSnapshots ? '새로고침 중' : '목록 새로고침'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        현재 서버 데이터를 암호화된 스냅샷으로 저장하고, 복원 전 데이터 개수를 확인합니다.
      </p>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/70 p-4">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-teal-700" />
          <h3 className="text-sm font-medium text-teal-950">서버 스냅샷</h3>
          <span className="text-xs text-teal-800">{snapshots.length}개</span>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              aria-label="스냅샷 암호화 비밀번호"
              placeholder="스냅샷 암호화 비밀번호"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-9"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? '스냅샷 비밀번호 숨기기' : '스냅샷 비밀번호 표시'}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Button onClick={createSnapshot} disabled={isBusy || password.trim().length < 4}>
            <CloudUpload className="mr-1 h-4 w-4" />
            {creating ? '생성 중' : '스냅샷 생성'}
          </Button>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <select
            aria-label="미리보기할 스냅샷"
            value={previewId}
            onChange={(event) => {
              setPreviewId(event.target.value);
              setPreview(null);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{loadingSnapshots ? '스냅샷 불러오는 중' : '스냅샷 선택'}</option>
            {snapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {formatSnapshotOption(snapshot)}
              </option>
            ))}
          </select>
          <Input
            type="password"
            aria-label="스냅샷 미리보기 비밀번호"
            placeholder="확인용 비밀번호"
            value={previewPassword}
            onChange={(event) => setPreviewPassword(event.target.value)}
          />
          <Button
            variant="outline"
            onClick={checkSnapshot}
            disabled={isBusy || !previewId || !previewPassword.trim()}
          >
            <Eye className="mr-1 h-4 w-4" />
            {previewing ? '확인 중' : '미리보기'}
          </Button>
        </div>
        {selectedSnapshot && (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-white/70 p-3 text-xs text-zinc-700">
            <span className="min-w-0 flex-1">
              선택됨: {formatSnapshotOption(selectedSnapshot)} ·{' '}
              {formatSnapshotCounts(selectedSnapshot.recordCounts)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={deleteSnapshot}
              disabled={isBusy}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {deletingId === selectedSnapshot.id ? '삭제 중' : '삭제'}
            </Button>
          </div>
        )}
        {!loadingSnapshots && snapshots.length === 0 && (
          <div className="rounded-md bg-white/70 p-3 text-sm text-muted-foreground">
            아직 저장된 스냅샷이 없습니다.
          </div>
        )}
        {preview && (
          <div className="space-y-3 rounded-md bg-white/80 p-3 text-xs text-zinc-700">
            <div className="grid gap-2 sm:grid-cols-3">
              <span>스냅샷 환자 {preview.recordCounts.patients}</span>
              <span>스냅샷 메모 {preview.recordCounts.notes}</span>
              <span>스냅샷 일정 {preview.recordCounts.schedules}</span>
              <span>스냅샷 약제 {preview.recordCounts.medications}</span>
              <span>스냅샷 Lab {preview.recordCounts.labResults}</span>
              <span>스냅샷 Lab 항목 {preview.recordCounts.labItems}</span>
              <span>현재 환자 {preview.currentCounts.patients}</span>
              <span>현재 메모 {preview.currentCounts.notes}</span>
              <span>현재 일정 {preview.currentCounts.schedules}</span>
              <span>현재 약제 {preview.currentCounts.medications}</span>
              <span>현재 Lab {preview.currentCounts.labResults}</span>
              <span>현재 Lab 항목 {preview.currentCounts.labItems}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {preview.restoreCheck.impacts.map((impact) => (
                <div
                  key={impact.key}
                  className={cn(
                    'space-y-1 rounded-md border p-2',
                    impact.level === 'danger'
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : impact.level === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-zinc-200 bg-white text-zinc-700'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 font-medium">
                    <span>{impact.label}</span>
                    <span>{formatRestoreDelta(impact.delta)}</span>
                  </div>
                  <div className="text-[11px] opacity-80">
                    스냅샷 {impact.snapshotCount} / 현재 {impact.currentCount}
                  </div>
                  <p className="text-[11px] leading-relaxed">{impact.message}</p>
                </div>
              ))}
            </div>
            <div
              className={cn(
                'rounded-md border p-3',
                preview.restoreCheck.blocked
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : preview.restoreCheck.warnings.length > 0
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              )}
            >
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {preview.restoreCheck.blocked
                  ? '복원 차단 조건이 감지되었습니다.'
                  : preview.restoreCheck.warnings.length > 0
                    ? '복원 전 확인이 필요합니다.'
                    : '복원 미리보기에서 위험 신호가 없습니다.'}
              </div>
              <p className="mt-2">{preview.restoreCheck.summary}</p>
              {preview.restoreCheck.warnings.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {preview.restoreCheck.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2">
                실제 복원 실행은 아직 열려 있지 않습니다. 현재 화면은 스냅샷 유효성 확인만
                수행합니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export function formatRestoreDelta(delta: number): string {
  if (delta === 0) return '동일';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export function formatSnapshotOption(snapshot: BackupSnapshotSummary): string {
  return `${snapshot.createdAt.toLocaleString('ko-KR')} · ${snapshot.kind}`;
}

export function formatSnapshotCounts(recordCounts: BackupSnapshotSummary['recordCounts']): string {
  if (!recordCounts || typeof recordCounts !== 'object' || Array.isArray(recordCounts)) {
    return '데이터 개수 없음';
  }

  const counts = recordCounts as Record<string, unknown>;
  const patients = typeof counts.patients === 'number' ? counts.patients : 0;
  const notes = typeof counts.notes === 'number' ? counts.notes : 0;
  const schedules = typeof counts.schedules === 'number' ? counts.schedules : 0;
  const labs = typeof counts.labResults === 'number' ? counts.labResults : 0;

  return `환자 ${patients}, 메모 ${notes}, 일정 ${schedules}, Lab ${labs}`;
}
