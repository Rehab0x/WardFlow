import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Bot,
  Calendar,
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudDownload,
  CloudUpload,
  Download,
  Eye,
  EyeOff,
  FileText,
  FlaskConical,
  GripVertical,
  HardDrive,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Stethoscope,
  Trash2,
  Unlock,
  Upload,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LabImportInbox } from '@/components/lab/LabImportInbox';
import { useSupabaseBackend } from '@/config/backend';
import { listPatients as listSupabasePatients } from '@/data/patients.repository';
import { db } from '@/db/database';
import type { LabDisplayCategory, Patient } from '@/db/database';
import { useToast } from '@/hooks/use-toast';
import { checkHasPin, removePin, setPin as savePinToDB, usePinLockStore, verifyPin } from '@/hooks/usePinLock';
import { fromDomainPatient } from '@/mappers/legacyPatient.mapper';
import {
  createSupabaseBackupSnapshot,
  listSupabaseBackupSnapshots,
  previewSupabaseBackupSnapshot,
  type SnapshotPreview,
} from '@/services/backupSnapshotService';
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
import { DEFAULT_LAB_CATEGORIES, labCategoryService } from '@/services/labCategoryService';
import { testConnection } from '@/services/aiService';
import { COLOR_PRESETS, PRESET_KEYS, type CalendarEventType, useCalendarColorStore } from '@/stores/useCalendarColorStore';
import { useChartingSettingsStore } from '@/stores/useChartingSettingsStore';
import { useLabReferenceStore } from '@/stores/useLabReferenceStore';
import { COLOR_OPTIONS, useScheduleCategoryStore } from '@/stores/useScheduleCategoryStore';
import { useAIStore, LLM_PROVIDERS, type LLMProvider } from '@/stores/useAIStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/utils/cn';
import type { BackupSnapshotSummary } from '@/data/backupSnapshots.repository';
import type { User, UserRole, WardLinkModule } from '@/types/user';

const AVAILABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: 'doctor', label: '의사' },
  { value: 'nurse', label: '간호사' },
  { value: 'therapist', label: '치료사' },
];

const AVAILABLE_MODULES: { value: WardLinkModule; label: string; description: string }[] = [
  { value: 'wardflow', label: 'WardFlow', description: '입원환자 관리' },
  { value: 'wardcare', label: 'WardCare', description: '간호 기록 (준비 중)' },
];

type SectionId =
  | 'pin'
  | 'admin'
  | 'charting'
  | 'schedule-cat'
  | 'calendar-color'
  | 'lab-cat'
  | 'lab-ref'
  | 'lab-import'
  | 'ai'
  | 'backup';

const KNOWN_SECTIONS: SectionId[] = [
  'pin',
  'admin',
  'charting',
  'schedule-cat',
  'calendar-color',
  'lab-cat',
  'lab-ref',
  'lab-import',
  'ai',
  'backup',
];

function isSectionId(value: string | null): value is SectionId {
  return !!value && KNOWN_SECTIONS.includes(value as SectionId);
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuthStore();
  const hasPin = usePinLockStore((state) => state.hasPin);
  const isAdmin = currentUser?.role === 'admin';
  const requestedSection = searchParams.get('section');
  const [activeSection, setActiveSection] = useState<SectionId>(isSectionId(requestedSection) ? requestedSection : 'pin');

  const sections = useMemo(
    () => [
      { id: 'pin' as const, label: 'PIN 잠금', icon: hasPin ? Lock : Unlock, group: '계정' },
      ...(isAdmin ? [{ id: 'admin' as const, label: '사용자 관리', icon: Shield, group: '계정' }] : []),
      { id: 'charting' as const, label: '차팅 설정', icon: FileText, group: '업무' },
      { id: 'schedule-cat' as const, label: '일정 카테고리', icon: Calendar, group: '업무' },
      { id: 'calendar-color' as const, label: '캘린더 색상', icon: Calendar, group: '업무' },
      { id: 'lab-cat' as const, label: 'Lab 카테고리', icon: FlaskConical, group: 'Lab' },
      { id: 'lab-ref' as const, label: 'Lab 참조범위', icon: FlaskConical, group: 'Lab' },
      { id: 'lab-import' as const, label: 'Lab Import', icon: FlaskConical, group: 'Lab' },
      { id: 'ai' as const, label: 'AI 설정', icon: Bot, group: '시스템' },
      { id: 'backup' as const, label: useSupabaseBackend ? 'Supabase 백업' : '백업 / 복원', icon: HardDrive, group: '시스템' },
    ],
    [hasPin, isAdmin]
  );

  useEffect(() => {
    if (isSectionId(requestedSection) && requestedSection !== activeSection) {
      setActiveSection(requestedSection);
    }
  }, [activeSection, requestedSection]);

  const selectSection = (id: SectionId) => {
    setActiveSection(id);
    setSearchParams({ section: id }, { replace: true });
  };

  const sectionClass = (id: SectionId) => (activeSection === id ? 'block' : 'hidden');

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-zinc-950">WardFlow 설정</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {useSupabaseBackend ? 'Supabase v2 환경' : 'Legacy IndexedDB 환경'}
            </p>
          </div>
        </div>
        <Badge variant={useSupabaseBackend ? 'default' : 'outline'} className="text-[11px]">
          {useSupabaseBackend ? 'Supabase' : 'Legacy'}
        </Badge>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <nav className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3 md:block xl:w-60">
          <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-medium text-zinc-500">현재 사용자</div>
            <div className="mt-1 truncate text-sm font-semibold text-zinc-950">{currentUser?.name ?? '-'}</div>
            <div className="mt-0.5 text-xs text-zinc-500">{useSupabaseBackend ? 'Supabase' : 'Legacy'} 모드</div>
          </div>
          {['계정', '업무', 'Lab', '시스템'].map((group) => {
            const items = sections.filter((section) => section.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-4">
                <h2 className="mb-1.5 px-2 text-[11px] font-semibold text-zinc-400">{group}</h2>
                <div className="space-y-1">
                  {items.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => selectSection(section.id)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                          activeSection === section.id
                            ? 'bg-zinc-900 font-medium text-white'
                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{section.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="fixed left-0 right-0 top-14 z-20 overflow-x-auto border-b border-zinc-200 bg-white md:hidden">
          <div className="flex min-w-max gap-1 p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => selectSection(section.id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs whitespace-nowrap transition-colors',
                  activeSection === section.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                )}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        <main className="min-w-0 flex-1 p-3 pt-16 sm:p-6 sm:pt-20 md:pt-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className={sectionClass('pin')}>
              <PinSettings />
            </div>
            <div className={sectionClass('admin')}>
              {isAdmin ? <AdminSettings /> : <EmptySection title="사용자 관리" message="관리자 계정에서만 접근할 수 있습니다." />}
            </div>
            <div className={sectionClass('charting')}>
              <ChartingSettings />
            </div>
            <div className={sectionClass('schedule-cat')}>
              <ScheduleCategorySettings />
            </div>
            <div className={sectionClass('calendar-color')}>
              <CalendarColorSettings />
            </div>
            <div className={sectionClass('lab-cat')}>
              <LabCategorySettings />
            </div>
            <div className={sectionClass('lab-ref')}>
              <LabReferenceSettings />
            </div>
            <div className={sectionClass('lab-import')}>
              <LabImportSettings />
            </div>
            <div className={sectionClass('ai')}>
              <AISettings />
            </div>
            <div className={sectionClass('backup')}>
              <BackupSettings />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

function EmptySection({ title, message }: { title: string; message: string }) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </Card>
  );
}

function PinSettings() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const { hasPin, autoLockMinutes, setAutoLockMinutes, setHasPin } = usePinLockStore();
  const [mode, setMode] = useState<'idle' | 'set' | 'change' | 'remove'>('idle');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    checkHasPin(currentUser.id).then(setHasPin);
  }, [currentUser, setHasPin]);

  const resetForm = () => {
    setMode('idle');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
  };

  const savePin = async () => {
    if (!currentUser) return;
    setError('');
    setLoading(true);

    try {
      if (mode === 'change' || mode === 'remove') {
        const valid = await verifyPin(currentUser.id, currentPin);
        if (!valid) {
          setError('현재 PIN이 일치하지 않습니다.');
          return;
        }
      }

      if (mode === 'remove') {
        await removePin(currentUser.id);
        setHasPin(false);
        toast({ title: 'PIN 해제 완료', description: 'PIN 잠금이 비활성화되었습니다.' });
      } else {
        if (!/^\d{4}$/.test(newPin)) {
          setError('PIN은 4자리 숫자여야 합니다.');
          return;
        }
        if (newPin !== confirmPin) {
          setError('새 PIN과 확인 PIN이 일치하지 않습니다.');
          return;
        }
        await savePinToDB(currentUser.id, newPin);
        setHasPin(true);
        toast({ title: 'PIN 설정 완료', description: '이 기기에서 PIN 잠금이 활성화되었습니다.' });
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN 설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {hasPin ? <Lock className="h-5 w-5 text-primary" /> : <Unlock className="h-5 w-5 text-muted-foreground" />}
          <h2 className="text-lg font-semibold">PIN 잠금</h2>
          {hasPin && <Badge variant="secondary">활성</Badge>}
        </div>
        {mode === 'idle' && (
          <div className="flex gap-2">
            {hasPin ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setMode('change')}>변경</Button>
                <Button variant="outline" size="sm" onClick={() => setMode('remove')}>해제</Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setMode('set')}>PIN 설정</Button>
            )}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {hasPin ? `${autoLockMinutes}분 동안 입력이 없으면 자동 잠금됩니다.` : 'PIN은 이 기기에 저장되는 로컬 잠금 기능입니다.'}
      </p>

      {hasPin && mode === 'idle' && (
        <div className="flex items-center gap-3">
          <span className="text-sm">자동 잠금 시간</span>
          <select
            value={autoLockMinutes}
            onChange={(event) => setAutoLockMinutes(Number(event.target.value))}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            {[1, 3, 5, 10, 15, 30].map((minute) => (
              <option key={minute} value={minute}>{minute}분</option>
            ))}
          </select>
        </div>
      )}

      {mode !== 'idle' && (
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-medium">
            {mode === 'set' && 'PIN 설정'}
            {mode === 'change' && 'PIN 변경'}
            {mode === 'remove' && 'PIN 해제'}
          </h3>
          {(mode === 'change' || mode === 'remove') && (
            <PinInput label="현재 PIN" value={currentPin} onChange={setCurrentPin} />
          )}
          {mode !== 'remove' && (
            <>
              <PinInput label="새 PIN" value={newPin} onChange={setNewPin} />
              <PinInput label="새 PIN 확인" value={confirmPin} onChange={setConfirmPin} />
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={savePin} disabled={loading}>{mode === 'remove' ? '해제' : '저장'}</Button>
            <Button variant="outline" size="sm" onClick={resetForm}>취소</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function PinInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        type="password"
        maxLength={4}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        placeholder="4자리 숫자"
        className="mt-1 w-40"
      />
    </div>
  );
}

function AdminSettings() {
  const { getPendingUsers, getAllUsers, approveUser, rejectUser, deleteUser } = useAuthStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<'approval' | 'members' | 'patients'>('approval');
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [approvalState, setApprovalState] = useState<Record<string, { role: UserRole; modules: WardLinkModule[] }>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const [pending, users] = await Promise.all([getPendingUsers(), getAllUsers()]);
    setPendingUsers(pending);
    setAllUsers(users);
    setApprovalState((current) => {
      const next = { ...current };
      for (const user of pending) {
        if (!next[user.id]) next[user.id] = { role: 'doctor', modules: ['wardflow'] };
      }
      return next;
    });
  }, [getAllUsers, getPendingUsers]);

  const loadPatients = useCallback(async () => {
    const patients = useSupabaseBackend
      ? (await listSupabasePatients()).map(fromDomainPatient)
      : await db.patients.toArray();
    setAllPatients(patients);
  }, []);

  useEffect(() => {
    loadUsers();
    loadPatients();
  }, [loadPatients, loadUsers]);

  const toggleModule = (userId: string, module: WardLinkModule) => {
    setApprovalState((current) => {
      const state = current[userId] ?? { role: 'doctor', modules: ['wardflow'] };
      const modules = state.modules.includes(module)
        ? state.modules.filter((item) => item !== module)
        : [...state.modules, module];
      return { ...current, [userId]: { ...state, modules } };
    });
  };

  const approve = async (userId: string) => {
    const state = approvalState[userId];
    if (!state || state.modules.length === 0) {
      toast({ title: '모듈을 하나 이상 선택해주세요.', variant: 'destructive' });
      return;
    }
    setProcessingId(userId);
    try {
      await approveUser(userId, state.role, state.modules);
      toast({ title: '승인 완료', description: '사용자가 승인되었습니다.' });
      await loadUsers();
    } catch (err) {
      toast({ title: '승인 실패', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async (userId: string) => {
    if (!window.confirm('가입 요청을 거절하시겠습니까?')) return;
    setProcessingId(userId);
    try {
      await rejectUser(userId);
      toast({ title: '거절 완료', description: '가입 요청을 거절했습니다.' });
      await loadUsers();
    } catch (err) {
      toast({ title: '거절 실패', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const removeUser = async (user: User) => {
    if (!window.confirm(`"${user.name}" 회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    setProcessingId(user.id);
    try {
      await deleteUser(user.id);
      toast({ title: '삭제 완료', description: `${user.name} 회원을 삭제했습니다.` });
      await loadUsers();
    } catch (err) {
      toast({ title: '삭제 실패', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 sm:px-6 sm:pt-6">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">사용자 관리</h2>
      </div>
      <div className="flex border-b px-4 sm:px-6">
        <AdminTabButton active={tab === 'approval'} onClick={() => setTab('approval')} label="가입 승인" count={pendingUsers.length} />
        <AdminTabButton active={tab === 'members'} onClick={() => setTab('members')} label="회원 관리" count={allUsers.filter((user) => user.status === 'approved' && user.role !== 'admin').length} />
        <AdminTabButton active={tab === 'patients'} onClick={() => setTab('patients')} label="환자 현황" count={allPatients.filter((patient) => patient.status === 'active').length} />
      </div>
      <div className="p-4 sm:p-6">
        {tab === 'approval' && (
          <div className="space-y-3">
            {pendingUsers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">승인 대기 중인 가입 요청이 없습니다.</p>
            ) : (
              pendingUsers.map((user) => {
                const state = approvalState[user.id] ?? { role: 'doctor', modules: ['wardflow'] };
                return (
                  <Card key={user.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">@{user.username} · {user.department || '-'}</div>
                        <div className="mt-1 text-xs text-muted-foreground">가입 요청: {user.createdAt.toLocaleDateString('ko-KR')}</div>
                      </div>
                      <Badge variant="outline" className="border-amber-300 text-amber-600">대기 중</Badge>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">역할</label>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_ROLES.map((role) => (
                          <Button
                            key={role.value}
                            variant={state.role === role.value ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setApprovalState((current) => ({ ...current, [user.id]: { ...state, role: role.value } }))}
                          >
                            {role.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">모듈 권한</label>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_MODULES.map((module) => (
                          <Button
                            key={module.value}
                            variant={state.modules.includes(module.value) ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => toggleModule(user.id, module.value)}
                          >
                            {module.label}
                            <span className="ml-1 text-[10px] opacity-70">({module.description})</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1" onClick={() => approve(user.id)} disabled={processingId === user.id}>
                        <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                        승인
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => reject(user.id)} disabled={processingId === user.id}>
                        <UserX className="mr-1.5 h-3.5 w-3.5" />
                        거절
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th className="px-3 py-2 font-medium">아이디</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">진료과</th>
                  <th className="px-3 py-2 font-medium">역할</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">상태</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {allUsers.filter((user) => user.role !== 'admin').map((user) => (
                  <tr key={user.id} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{user.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">@{user.username}</td>
                    <td className="hidden px-3 py-2 sm:table-cell">{user.department || '-'}</td>
                    <td className="px-3 py-2 text-xs">{AVAILABLE_ROLES.find((role) => role.value === user.role)?.label || user.role}</td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      <Badge variant={user.status === 'approved' ? 'default' : user.status === 'pending' ? 'outline' : 'destructive'} className="text-[10px]">
                        {user.status === 'approved' ? '승인' : user.status === 'pending' ? '대기' : '거절'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeUser(user)} disabled={processingId === user.id}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'patients' && <PatientOwnershipList patients={allPatients} users={allUsers} />}
      </div>
    </Card>
  );
}

function AdminTabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn('relative px-3 py-2 text-sm font-medium transition-colors', active ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
    >
      {label}
      <span className="ml-1 text-xs text-muted-foreground">({count})</span>
      {active && <div className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-primary" />}
    </button>
  );
}

function PatientOwnershipList({ patients, users }: { patients: Patient[]; users: User[] }) {
  const entries = useMemo(() => {
    const grouped = new Map<string, { active: Patient[]; discharged: Patient[] }>();
    for (const patient of patients) {
      if (!grouped.has(patient.createdBy)) grouped.set(patient.createdBy, { active: [], discharged: [] });
      const group = grouped.get(patient.createdBy)!;
      if (patient.status === 'active') group.active.push(patient);
      else group.discharged.push(patient);
    }
    return Array.from(grouped.entries()).map(([doctorId, group]) => {
      const user = users.find((item) => item.id === doctorId);
      return {
        doctorId,
        doctorName: user?.name ?? doctorId,
        department: user?.department ?? '',
        active: group.active.sort((a, b) => a.roomBed.localeCompare(b.roomBed, undefined, { numeric: true })),
        discharged: group.discharged,
      };
    });
  }, [patients, users]);

  if (entries.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">등록된 환자가 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(({ doctorId, doctorName, department, active, discharged }) => (
        <Card key={doctorId} className="p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{doctorName}</span>
            {department && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{department}</Badge>}
            <span className="ml-auto text-xs text-muted-foreground">활성 {active.length}명 / 퇴원 {discharged.length}명</span>
          </div>
          <div className="space-y-1">
            {active.map((patient) => (
              <div key={patient.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                <Badge variant={patient.patientType === 'admitted' ? 'default' : 'outline'} className="w-12 justify-center px-1.5 py-0 text-[10px]">
                  {patient.patientType === 'admitted' ? '입원' : '협진'}
                </Badge>
                <span className="w-14 text-xs text-muted-foreground">{patient.roomBed}</span>
                <span className="font-medium">{patient.name}</span>
                {patient.attention && <span className="text-xs text-red-500">주의</span>}
              </div>
            ))}
          </div>
          {discharged.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">퇴원 환자 {discharged.length}명</summary>
              <div className="mt-1 space-y-1 opacity-70">
                {discharged.map((patient) => (
                  <div key={patient.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                    <Badge variant="secondary" className="w-12 justify-center px-1.5 py-0 text-[10px]">퇴원</Badge>
                    <span className="font-medium">{patient.name}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </Card>
      ))}
    </div>
  );
}

function ChartingSettings() {
  const {
    problemListStyle,
    setProblemListStyle,
    includeFieldNames,
    setIncludeFieldNames,
    excludeEmptySections,
    setExcludeEmptySections,
    sectionSeparator,
    setSectionSeparator,
    sectionNames,
    setSectionName,
    resetSectionNames,
  } = useChartingSettingsStore();

  return (
    <Card className="space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">차팅 복사 설정</h2>
      </div>
      <SettingRow label="Problem List 형식">
        <select
          value={problemListStyle}
          onChange={(event) => setProblemListStyle(event.target.value as 'numbered' | 'numbered_simple' | 'bulleted' | 'plain')}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          <option value="numbered_simple">#. 기본</option>
          <option value="numbered">#1. #2. #3.</option>
          <option value="bulleted">bullet</option>
          <option value="plain">표시 없음</option>
        </select>
      </SettingRow>
      <SettingRow label="섹션 간격">
        <select
          value={sectionSeparator === '\n\n' ? '2' : '1'}
          onChange={(event) => setSectionSeparator(event.target.value === '2' ? '\n\n' : '\n')}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          <option value="2">빈 줄 포함</option>
          <option value="1">줄바꿈만</option>
        </select>
      </SettingRow>
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={includeFieldNames} onChange={(event) => setIncludeFieldNames(event.target.checked)} />
          <span className="text-sm">필드명 포함</span>
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={excludeEmptySections} onChange={(event) => setExcludeEmptySections(event.target.checked)} />
          <span className="text-sm">빈 섹션 제외</span>
        </label>
      </div>
      {includeFieldNames && (
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">섹션 이름</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetSectionNames}>
              <RotateCcw className="mr-1 h-3 w-3" />
              기본값
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.entries(sectionNames) as [keyof typeof sectionNames, string][]).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">{key}</span>
                <Input className="h-7 text-xs" value={value} onChange={(event) => setSectionName(key, event.target.value)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-40 shrink-0 text-sm">{label}</span>
      {children}
    </div>
  );
}

function ScheduleCategorySettings() {
  const store = useScheduleCategoryStore();
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('gray');

  const add = () => {
    if (!label.trim()) return;
    store.addCategory(label.trim(), color);
    setLabel('');
  };

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">일정 카테고리</h2>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={store.resetCategories}>
          <RotateCcw className="mr-1 h-3 w-3" />
          기본값
        </Button>
      </div>
      <div className="space-y-2">
        {store.categories.map((category) => (
          <div key={category.id} className="flex items-center gap-2">
            <select value={category.color} onChange={(event) => store.updateCategory(category.id, { color: event.target.value })} className="w-24 rounded-md border bg-background px-1.5 py-1 text-xs">
              {COLOR_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <Input className="h-8 flex-1 text-sm" value={category.label} onChange={(event) => store.updateCategory(category.id, { label: event.target.value })} />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => store.removeCategory(category.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <select value={color} onChange={(event) => setColor(event.target.value)} className="w-24 rounded-md border bg-background px-1.5 py-1 text-xs">
          {COLOR_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <Input className="h-8 flex-1 text-sm" placeholder="새 카테고리 이름" value={label} onChange={(event) => setLabel(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && add()} />
        <Button size="sm" className="h-8" onClick={add}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          추가
        </Button>
      </div>
    </Card>
  );
}

function CalendarColorSettings() {
  const { colors, setColor } = useCalendarColorStore();
  const rows: { type: CalendarEventType; label: string }[] = [
    { type: 'schedule', label: '일정' },
    { type: 'global_alert', label: '전체 알림' },
    { type: 'reminder', label: '리마인더' },
  ];

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">캘린더 색상</h2>
      </div>
      <p className="text-sm text-muted-foreground">캘린더와 오늘 화면에서 표시되는 이벤트 색상을 조정합니다.</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.type} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="text-sm font-medium">{row.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_KEYS.map((key) => (
                <button
                  key={key}
                  title={COLOR_PRESETS[key]?.name ?? key}
                  onClick={() => setColor(row.type, key)}
                  className={cn('h-6 w-6 rounded-full border-2', COLOR_PRESETS[key]?.dot, colors[row.type] === key ? 'border-zinc-950' : 'border-transparent')}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LabCategorySettings() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<LabDisplayCategory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    labCategoryService.getAll().then(setCategories).catch((error) => {
      toast({ title: 'Lab 카테고리 로드 실패', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    });
  }, [toast]);

  const save = async () => {
    await labCategoryService.saveAll(categories.map((category, index) => ({ ...category, order: index })));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = async () => {
    if (!window.confirm('Lab 카테고리를 기본값으로 초기화하시겠습니까?')) return;
    await labCategoryService.resetToDefaults();
    setCategories(DEFAULT_LAB_CATEGORIES);
  };

  const move = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setCategories(next);
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    setCategories((current) => [...current, { id: crypto.randomUUID(), name: newCategoryName.trim(), order: current.length, items: [] }]);
    setNewCategoryName('');
  };

  const addItem = (categoryId: string) => {
    const value = newItemInputs[categoryId]?.trim();
    if (!value) return;
    setCategories((current) => current.map((category) => category.id === categoryId ? { ...category, items: [...category.items, value] } : category));
    setNewItemInputs((current) => ({ ...current, [categoryId]: '' }));
  };

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Lab 카테고리</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            기본값
          </Button>
          <Button size="sm" onClick={save}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saved ? '저장됨' : '저장'}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Lab 결과 표시 순서와 묶음을 조정합니다. Supabase 모드에서는 사용자별 설정으로 저장됩니다.</p>
      <div className="space-y-2">
        {categories.map((category, index) => (
          <Card key={category.id} className="overflow-hidden p-0">
            <div className="flex items-center gap-2 bg-muted/30 px-3 py-2">
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{category.name}</span>
              <span className="text-xs text-muted-foreground">{category.items.length}개 항목</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(index, 'up')} disabled={index === 0}>↑</Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(index, 'down')} disabled={index === categories.length - 1}>↓</Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpandedId(expandedId === category.id ? null : category.id)}>
                {expandedId === category.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setCategories((current) => current.filter((item) => item.id !== category.id))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {expandedId === category.id && (
              <div className="space-y-2 border-t p-3">
                <div className="flex flex-wrap gap-1.5">
                  {category.items.map((item) => (
                    <span key={item} className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs">
                      {item}
                      <button onClick={() => setCategories((current) => current.map((cat) => cat.id === category.id ? { ...cat, items: cat.items.filter((name) => name !== item) } : cat))} className="text-muted-foreground hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    className="h-7 flex-1 text-xs"
                    placeholder="항목명 추가"
                    value={newItemInputs[category.id] ?? ''}
                    onChange={(event) => setNewItemInputs((current) => ({ ...current, [category.id]: event.target.value }))}
                    onKeyDown={(event) => event.key === 'Enter' && addItem(category.id)}
                  />
                  <Button size="sm" className="h-7 text-xs" onClick={() => addItem(category.id)}>추가</Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      <div className="flex gap-2">
        <Input className="h-8 text-sm" placeholder="새 카테고리 이름" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addCategory()} />
        <Button size="sm" onClick={addCategory}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          추가
        </Button>
      </div>
    </Card>
  );
}

function LabReferenceSettings() {
  const { getAllReferences, setOverride, removeOverride, resetAll } = useLabReferenceStore();
  const [query, setQuery] = useState('');
  const references = getAllReferences().filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Lab 참조범위</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">비정상 Lab 표시 기준을 사용자별로 조정합니다.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetAll}>전체 초기화</Button>
      </div>
      <Input placeholder="검사항목 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
        {references.map((item) => (
          <div key={`${item.category}-${item.name}`} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_100px_100px_auto] sm:items-center">
            <div>
              <div className="text-sm font-medium">{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.category} {item.unit ? `· ${item.unit}` : ''}</div>
            </div>
            <Input
              type="number"
              className="h-8"
              placeholder="min"
              value={item.referenceMin ?? ''}
              onChange={(event) => setOverride(item.name, event.target.value === '' ? undefined : Number(event.target.value), item.referenceMax)}
            />
            <Input
              type="number"
              className="h-8"
              placeholder="max"
              value={item.referenceMax ?? ''}
              onChange={(event) => setOverride(item.name, item.referenceMin, event.target.value === '' ? undefined : Number(event.target.value))}
            />
            <Button variant="ghost" size="sm" onClick={() => removeOverride(item.name)} disabled={!item.isOverridden}>초기화</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LabImportSettings() {
  const [serverPw] = useState(() => localStorage.getItem('wardflow-server-pw') || '');
  const [serverKey] = useState(() => localStorage.getItem('wardflow-server-key') || '');

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Lab Import Inbox</h2>
      </div>
      <p className="text-sm text-muted-foreground">오픈클로가 저장하는 XLS 폴더를 연결하면 Lab 결과를 파싱해 환자와 매칭합니다.</p>
      <LabImportInbox
        onServerSync={!useSupabaseBackend && serverKey && serverPw ? async () => {
          await uploadBackupToServer(serverPw, serverKey.trim());
        } : undefined}
      />
    </Card>
  );
}

function AISettings() {
  const { provider, apiKey, model, setProvider, setApiKey, setModel, isConfigured } = useAIStore();
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const providerInfo = LLM_PROVIDERS[provider];

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection();
      setTestResult(result);
      toast({ title: result.success ? '연결 성공' : '연결 실패', description: result.message, variant: result.success ? 'default' : 'destructive' });
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">AI 설정</h2>
      </div>
      <p className="text-sm text-muted-foreground">API Key는 이 기기에 저장됩니다. 환자 정보가 외부 API로 전송될 수 있으니 실제 사용 시 주의하세요.</p>
      <div>
        <label className="mb-1.5 block text-sm font-medium">LLM 선택</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(LLM_PROVIDERS) as LLMProvider[]).map((item) => (
            <button
              key={item}
              onClick={() => setProvider(item)}
              className={cn('rounded-md border px-3 py-2 text-sm transition-colors', provider === item ? 'border-primary bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted')}
            >
              {LLM_PROVIDERS[item].name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">모델</label>
        <select value={model} onChange={(event) => setModel(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          {providerInfo.models.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">API Key</label>
        <div className="relative">
          <Input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={`${providerInfo.name} API Key`} className="pr-10" />
          <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2" onClick={() => setShowKey(!showKey)}>
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={test} disabled={testing || !isConfigured()}>
          {testing ? '테스트 중...' : '연결 테스트'}
        </Button>
        {testResult && (
          <span className={cn('text-sm', testResult.success ? 'text-green-600' : 'text-destructive')}>
            {testResult.success ? '성공' : '실패'}: {testResult.message.slice(0, 80)}
          </span>
        )}
      </div>
    </Card>
  );
}

function BackupSettings() {
  return useSupabaseBackend ? <SupabaseBackupSettings /> : <LegacyBackupSettings />;
}

function SupabaseBackupSettings() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [previewPassword, setPreviewPassword] = useState('');
  const [previewId, setPreviewId] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SnapshotPreview | null>(null);
  const [snapshots, setSnapshots] = useState<BackupSnapshotSummary[]>([]);

  const loadSnapshots = useCallback(async () => {
    if (!currentUser) return;
    const items = await listSupabaseBackupSnapshots(currentUser.id);
    setSnapshots(items);
    setPreviewId((current) => current || items[0]?.id || '');
  }, [currentUser]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const createSnapshot = async () => {
    if (!currentUser) return;
    if (password.length < 4) {
      toast({ title: '비밀번호는 4자 이상이어야 합니다.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const snapshot = await createSupabaseBackupSnapshot({ ownerId: currentUser.id, password });
      setPassword('');
      setSnapshots((current) => [snapshot, ...current]);
      setPreviewId(snapshot.id);
      toast({ title: '스냅샷 생성 완료', description: 'Supabase 데이터를 암호화 스냅샷으로 저장했습니다.' });
    } catch (err) {
      toast({ title: '스냅샷 생성 실패', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const checkSnapshot = async () => {
    if (!previewId || !previewPassword) return;
    setLoading(true);
    try {
      const result = await previewSupabaseBackupSnapshot({ snapshotId: previewId, password: previewPassword });
      setPreview(result);
      toast({ title: '스냅샷 확인 완료', description: `환자 ${result.recordCounts.patients}명, 현재 ${result.currentCounts.patients}명` });
    } catch (err) {
      toast({ title: '스냅샷 확인 실패', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center gap-2">
        <HardDrive className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Supabase 백업</h2>
      </div>
      <p className="text-sm text-muted-foreground">현재 서버 데이터를 암호화된 스냅샷으로 저장하고, 복원 전 record count를 확인합니다.</p>
      <div className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/70 p-4">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-teal-700" />
          <h3 className="text-sm font-medium text-teal-950">서버 스냅샷</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Input type={showPassword ? 'text' : 'password'} placeholder="스냅샷 암호화 비밀번호" value={password} onChange={(event) => setPassword(event.target.value)} className="pr-9" />
            <Button variant="ghost" size="icon" className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Button onClick={createSnapshot} disabled={loading || !password}>
            <CloudUpload className="mr-1 h-4 w-4" />
            스냅샷 생성
          </Button>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <select value={previewId} onChange={(event) => { setPreviewId(event.target.value); setPreview(null); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">스냅샷 선택</option>
            {snapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>{new Date(snapshot.createdAt).toLocaleString()} · {snapshot.kind}</option>
            ))}
          </select>
          <Input type="password" placeholder="확인용 비밀번호" value={previewPassword} onChange={(event) => setPreviewPassword(event.target.value)} />
          <Button variant="outline" onClick={checkSnapshot} disabled={loading || !previewId || !previewPassword}>
            <Eye className="mr-1 h-4 w-4" />
            미리보기
          </Button>
        </div>
        {preview && (
          <div className="grid gap-2 rounded-md bg-white/80 p-3 text-xs text-zinc-700 sm:grid-cols-3">
            <span>스냅샷 환자 {preview.recordCounts.patients}</span>
            <span>스냅샷 메모 {preview.recordCounts.notes}</span>
            <span>스냅샷 일정 {preview.recordCounts.schedules}</span>
            <span>현재 환자 {preview.currentCounts.patients}</span>
            <span>현재 메모 {preview.currentCounts.notes}</span>
            <span>현재 일정 {preview.currentCounts.schedules}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function LegacyBackupSettings() {
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
  const [textImportPw, setTextImportPw] = useState('');
  const [textImportData, setTextImportData] = useState('');
  const [serverPw, setServerPwState] = useState(() => localStorage.getItem('wardflow-server-pw') || '');
  const [serverKey, setServerKeyState] = useState(() => localStorage.getItem('wardflow-server-key') || '');
  const [serverInfo, setServerInfo] = useState<{ exists: boolean; updatedAt?: string } | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

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
      toast({ title: '백업 실패', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
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
      toast({ title: '복원 완료', description: `환자 ${result.patientCount}명, 메모 ${result.noteCount}건을 복원했습니다.` });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast({ title: '복원 실패', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setRestoreLoading(false);
    }
  };

  const copyTextBackup = async () => {
    if (textExportPw.length < 4) {
      toast({ title: '비밀번호는 4자 이상이어야 합니다.', variant: 'destructive' });
      return;
    }
    const text = await exportBackupAsText(textExportPw);
    await navigator.clipboard.writeText(text);
    setTextExportPw('');
    toast({ title: '클립보드에 복사했습니다.', description: '다른 기기에서 텍스트 복원에 붙여넣을 수 있습니다.' });
  };

  const importTextBackup = async () => {
    if (!textImportData.trim() || !textImportPw) return;
    if (!window.confirm('현재 데이터를 백업 텍스트 내용으로 교체합니다. 계속하시겠습니까?')) return;
    const result = await importBackupFromText(textImportData, textImportPw);
    toast({ title: '복원 완료', description: `환자 ${result.patientCount}명, 메모 ${result.noteCount}건을 복원했습니다.` });
    setTimeout(() => window.location.reload(), 1200);
  };

  const uploadServer = async () => {
    if (!serverPw || !serverKey.trim()) return;
    setServerLoading(true);
    try {
      const result = await uploadBackupToServer(serverPw, serverKey.trim());
      setServerInfo({ exists: true, updatedAt: result.updatedAt });
      toast({ title: '서버 업로드 완료', description: new Date(result.updatedAt).toLocaleString() });
    } catch (err) {
      toast({ title: '서버 업로드 실패', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setServerLoading(false);
    }
  };

  const downloadServer = async () => {
    if (!serverPw || !serverKey.trim()) return;
    if (!window.confirm('서버 데이터로 현재 데이터를 교체합니다. 계속하시겠습니까?')) return;
    setServerLoading(true);
    try {
      const result = await downloadBackupFromServer(serverPw, serverKey.trim());
      toast({ title: '서버 복원 완료', description: `환자 ${result.patientCount}명, 메모 ${result.noteCount}건을 복원했습니다.` });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast({ title: '서버 복원 실패', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setServerLoading(false);
    }
  };

  const checkServer = async () => {
    if (!serverKey.trim()) return;
    const info = await getServerBackupInfo(serverKey.trim());
    setServerInfo(info);
    toast({ title: info.exists ? '서버 백업 확인됨' : '저장된 서버 백업이 없습니다.' });
  };

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center gap-2">
        <HardDrive className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">백업 / 복원</h2>
      </div>
      <p className="text-sm text-muted-foreground">Legacy IndexedDB 데이터를 파일 또는 텍스트로 백업합니다.</p>
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
          <input ref={restoreInputRef} type="file" accept=".wardflow" className="hidden" onChange={(event) => setRestoreFile(event.target.files?.[0] ?? null)} />
          <div className="relative min-w-[220px] flex-1">
            <Input type={restoreShowPw ? 'text' : 'password'} placeholder="백업 비밀번호" value={restorePassword} onChange={(event) => setRestorePassword(event.target.value)} className="pr-9" />
            <Button variant="ghost" size="icon" className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2" onClick={() => setRestoreShowPw(!restoreShowPw)}>
              {restoreShowPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Button variant="destructive" onClick={importFile} disabled={restoreLoading || !restoreFile || !restorePassword}>복원</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-medium">텍스트로 복사</h3>
          <Input type="password" placeholder="암호화 비밀번호" value={textExportPw} onChange={(event) => setTextExportPw(event.target.value)} />
          <Button size="sm" onClick={copyTextBackup}>복사</Button>
        </div>
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-medium">텍스트에서 복원</h3>
          <textarea className="h-20 w-full resize-none rounded-md border bg-background p-2 text-xs" value={textImportData} onChange={(event) => setTextImportData(event.target.value)} />
          <Input type="password" placeholder="백업 비밀번호" value={textImportPw} onChange={(event) => setTextImportPw(event.target.value)} />
          <Button size="sm" variant="destructive" onClick={importTextBackup} disabled={!textImportPw || !textImportData.trim()}>복원</Button>
        </div>
      </div>
      <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">레거시 서버 동기화</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Input placeholder="동기화 키" value={serverKey} onChange={(event) => setServerKey(event.target.value)} />
          <Input type="password" placeholder="암호화 비밀번호" value={serverPw} onChange={(event) => setServerPw(event.target.value)} />
        </div>
        {serverInfo && <p className="text-xs text-muted-foreground">{serverInfo.exists ? `마지막 저장: ${new Date(serverInfo.updatedAt ?? '').toLocaleString()}` : '저장된 데이터 없음'}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={checkServer} disabled={serverLoading || !serverKey}>확인</Button>
          <Button size="sm" onClick={uploadServer} disabled={serverLoading || !serverKey || !serverPw}>
            <CloudUpload className="mr-1 h-3.5 w-3.5" />
            업로드
          </Button>
          <Button variant="destructive" size="sm" onClick={downloadServer} disabled={serverLoading || !serverKey || !serverPw}>
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
          <Input type={showPassword ? 'text' : 'password'} placeholder="암호화 비밀번호" value={password} onChange={(event) => setPassword(event.target.value)} className="pr-9" />
          <Button variant="ghost" size="icon" className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <Button onClick={onClick} disabled={loading || !password}>{buttonLabel}</Button>
      </div>
    </div>
  );
}

export default SettingsPage;
