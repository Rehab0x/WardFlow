import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, RotateCcw, Save, UserCheck, UserX, Shield, Lock, Unlock, Stethoscope, FlaskConical, FileText, Calendar, Download, Upload, Eye, EyeOff, HardDrive, Bell, Cloud, CloudUpload, CloudDownload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { labCategoryService, DEFAULT_LAB_CATEGORIES } from '@/services/labCategoryService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToast } from '@/hooks/use-toast';
import { usePinLockStore, checkHasPin, setPin as savePinToDB, removePin, verifyPin } from '@/hooks/usePinLock';
import { useChartingSettingsStore } from '@/stores/useChartingSettingsStore';
import { useScheduleCategoryStore, COLOR_OPTIONS } from '@/stores/useScheduleCategoryStore';
import { useCalendarColorStore, COLOR_PRESETS, PRESET_KEYS, type CalendarEventType } from '@/stores/useCalendarColorStore';
import { db } from '@/db/database';
import type { LabDisplayCategory, Patient } from '@/db/database';
import type { User, UserRole, WardLinkModule } from '@/types/user';
import { exportBackup, downloadBlob, importBackup, isDailyBackupEnabled, setDailyBackupEnabled, exportBackupAsText, importBackupFromText, uploadBackupToServer, downloadBackupFromServer, getServerBackupInfo } from '@/services/backupService';
import { LabImportInbox } from '@/components/lab/LabImportInbox';

const AVAILABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: 'doctor', label: '의사' },
  { value: 'nurse', label: '간호사' },
  { value: 'therapist', label: '치료사' },
];

const AVAILABLE_MODULES: { value: WardLinkModule; label: string; description: string }[] = [
  { value: 'wardflow', label: 'WardFlow', description: '입원환자 관리' },
  { value: 'wardcare', label: 'WardCare', description: '간호 기록 (준비 중)' },
];

const SettingsPage = () => {
  const { currentUser, getPendingUsers, getAllUsers, approveUser, rejectUser, deleteUser } = useAuthStore();
  const { toast } = useToast();
  const isAdmin = currentUser?.role === 'admin';

  // Admin: pending users
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [approvalState, setApprovalState] = useState<Record<string, { role: UserRole; modules: WardLinkModule[] }>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Admin: all users
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Admin: all patients (for doctor-patient overview)
  const [allPatients, setAllPatients] = useState<Patient[]>([]);

  // Backup/Restore
  const [backupPassword, setBackupPassword] = useState('');
  const [backupShowPw, setBackupShowPw] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreShowPw, setRestoreShowPw] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const backupSectionRef = useRef<HTMLDivElement>(null);
  const [dailyBackup, setDailyBackup] = useState(isDailyBackupEnabled);

  // Text transfer
  const [textExportPw, setTextExportPw] = useState('');
  const [textExportShowPw, setTextExportShowPw] = useState(false);
  const [textExportLoading, setTextExportLoading] = useState(false);
  const [textExportResult, setTextExportResult] = useState('');
  const [textImportPw, setTextImportPw] = useState('');
  const [textImportShowPw, setTextImportShowPw] = useState(false);
  const [textImportLoading, setTextImportLoading] = useState(false);
  const [textImportData, setTextImportData] = useState('');

  // Server sync (persist to localStorage for lab-import page)
  const [serverPw, setServerPwState] = useState(() => localStorage.getItem('wardflow-server-pw') || '');
  const [serverShowPw, setServerShowPw] = useState(false);
  const [serverKey, setServerKeyState] = useState(() => localStorage.getItem('wardflow-server-key') || '');

  const setServerPw = (v: string) => { setServerPwState(v); localStorage.setItem('wardflow-server-pw', v); };
  const setServerKey = (v: string) => { setServerKeyState(v); localStorage.setItem('wardflow-server-key', v); };
  const [serverLoading, setServerLoading] = useState(false);
  const [serverInfo, setServerInfo] = useState<{ exists: boolean; updatedAt?: string } | null>(null);

  const handleServerUpload = async () => {
    if (!serverPw || serverPw.length < 4) {
      toast({ title: '비밀번호는 4자 이상이어야 합니다.', variant: 'destructive' });
      return;
    }
    if (!serverKey.trim()) {
      toast({ title: '동기화 키를 입력해주세요.', variant: 'destructive' });
      return;
    }
    setServerLoading(true);
    try {
      const result = await uploadBackupToServer(serverPw, serverKey.trim());
      toast({ title: '서버 업로드 완료', description: `업로드 시간: ${new Date(result.updatedAt).toLocaleString()}` });
      setServerInfo({ exists: true, updatedAt: result.updatedAt });
    } catch (err) {
      toast({ title: '업로드 실패', description: err instanceof Error ? err.message : '알 수 없는 오류', variant: 'destructive' });
    } finally {
      setServerLoading(false);
    }
  };

  const handleServerDownload = async () => {
    if (!serverPw) {
      toast({ title: '비밀번호를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!serverKey.trim()) {
      toast({ title: '동기화 키를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!confirm('서버 데이터로 현재 모든 데이터가 교체됩니다. 계속하시겠습니까?')) return;
    setServerLoading(true);
    try {
      const result = await downloadBackupFromServer(serverPw, serverKey.trim());
      toast({ title: '서버 복원 완료', description: `환자 ${result.patientCount}명, 메모 ${result.noteCount}건 복원됨` });
    } catch (err) {
      toast({ title: '복원 실패', description: err instanceof Error ? err.message : '알 수 없는 오류', variant: 'destructive' });
    } finally {
      setServerLoading(false);
    }
  };

  const handleCheckServerInfo = async () => {
    if (!serverKey.trim()) {
      toast({ title: '동기화 키를 입력해주세요.', variant: 'destructive' });
      return;
    }
    try {
      const info = await getServerBackupInfo(serverKey.trim());
      setServerInfo(info);
      if (!info.exists) {
        toast({ title: '서버에 저장된 데이터가 없습니다.' });
      }
    } catch {
      toast({ title: '서버 확인 실패', variant: 'destructive' });
    }
  };

  const handleTextExport = async () => {
    if (!textExportPw || textExportPw.length < 4) {
      toast({ title: '비밀번호는 4자 이상이어야 합니다.', variant: 'destructive' });
      return;
    }
    setTextExportLoading(true);
    try {
      const text = await exportBackupAsText(textExportPw);
      setTextExportResult(text);
      await navigator.clipboard.writeText(text);
      toast({ title: '클립보드에 복사되었습니다!', description: '카톡이나 메모에 붙여넣기 하세요.' });
      setTextExportPw('');
    } catch (err) {
      toast({ title: '텍스트 백업 실패', description: String(err), variant: 'destructive' });
    } finally {
      setTextExportLoading(false);
    }
  };

  const handleTextImport = async () => {
    if (!textImportData.trim()) {
      toast({ title: '백업 텍스트를 붙여넣어 주세요.', variant: 'destructive' });
      return;
    }
    if (!textImportPw) {
      toast({ title: '비밀번호를 입력해주세요.', variant: 'destructive' });
      return;
    }
    setTextImportLoading(true);
    try {
      const result = await importBackupFromText(textImportData, textImportPw);
      toast({ title: '복원 완료', description: `환자 ${result.patientCount}명, 메모 ${result.noteCount}건이 복원되었습니다.` });
      setTextImportPw('');
      setTextImportData('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast({ title: '복원 실패', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setTextImportLoading(false);
    }
  };
  const [searchParams] = useSearchParams();

  // section=backup 쿼리 파라미터 시 자동 스크롤
  useEffect(() => {
    if (searchParams.get('section') === 'backup' && backupSectionRef.current) {
      setTimeout(() => {
        backupSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [searchParams]);

  const handleExportBackup = async () => {
    if (!backupPassword || backupPassword.length < 4) {
      toast({ title: '비밀번호는 4자 이상이어야 합니다.', variant: 'destructive' });
      return;
    }
    setBackupLoading(true);
    try {
      const blob = await exportBackup(backupPassword);
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      downloadBlob(blob, `wardflow_backup_${date}.wardflow`);
      toast({ title: '백업 완료', description: '암호화된 백업 파일이 다운로드되었습니다.' });
      setBackupPassword('');
    } catch (err) {
      toast({ title: '백업 실패', description: String(err), variant: 'destructive' });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = async () => {
    if (!restoreFile) {
      toast({ title: '파일을 선택해주세요.', variant: 'destructive' });
      return;
    }
    if (!restorePassword) {
      toast({ title: '비밀번호를 입력해주세요.', variant: 'destructive' });
      return;
    }
    setRestoreLoading(true);
    try {
      const result = await importBackup(restoreFile, restorePassword);
      toast({ title: '복원 완료', description: `환자 ${result.patientCount}명, 메모 ${result.noteCount}건이 복원되었습니다. 페이지를 새로고침합니다.` });
      setRestorePassword('');
      setRestoreFile(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast({ title: '복원 실패', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setRestoreLoading(false);
    }
  };

  const loadPendingUsers = useCallback(async () => {
    if (!isAdmin) return;
    const users = await getPendingUsers();
    setPendingUsers(users);
    // Initialize approval state for each user
    const state: Record<string, { role: UserRole; modules: WardLinkModule[] }> = {};
    for (const u of users) {
      state[u.id] = { role: 'doctor', modules: ['wardflow'] };
    }
    setApprovalState(state);
  }, [isAdmin, getPendingUsers]);

  const loadAllUsers = useCallback(async () => {
    if (!isAdmin) return;
    const users = await getAllUsers();
    setAllUsers(users);
  }, [isAdmin, getAllUsers]);

  const loadAllPatients = useCallback(async () => {
    if (!isAdmin) return;
    const patients = await db.patients.toArray();
    setAllPatients(patients);
  }, [isAdmin]);

  useEffect(() => {
    loadPendingUsers();
    loadAllUsers();
    loadAllPatients();
  }, [loadPendingUsers, loadAllUsers, loadAllPatients]);

  const handleApprove = async (userId: string) => {
    const state = approvalState[userId];
    if (!state) return;
    if (state.modules.length === 0) {
      toast({ title: '모듈을 1개 이상 선택하세요.', variant: 'destructive' });
      return;
    }
    setProcessingId(userId);
    try {
      await approveUser(userId, state.role, state.modules);
      toast({ title: '승인 완료', description: '사용자가 승인되었습니다.' });
      await loadPendingUsers();
      await loadAllUsers();
    } catch (err) {
      toast({ title: '승인 실패', description: err instanceof Error ? err.message : '오류', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('이 가입 요청을 거절하시겠습니까?')) return;
    setProcessingId(userId);
    try {
      await rejectUser(userId);
      toast({ title: '거절 완료', description: '가입 요청이 거절되었습니다.' });
      await loadPendingUsers();
      await loadAllUsers();
    } catch (err) {
      toast({ title: '거절 실패', description: err instanceof Error ? err.message : '오류', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`"${userName}" 회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    setProcessingId(userId);
    try {
      await deleteUser(userId);
      toast({ title: '삭제 완료', description: `${userName} 회원이 삭제되었습니다.` });
      await loadAllUsers();
      await loadPendingUsers();
    } catch (err) {
      toast({ title: '삭제 실패', description: err instanceof Error ? err.message : '오류', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const toggleModule = (userId: string, module: WardLinkModule) => {
    setApprovalState((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      const modules = current.modules.includes(module)
        ? current.modules.filter((m) => m !== module)
        : [...current.modules, module];
      return { ...prev, [userId]: { ...current, modules } };
    });
  };

  // Admin tab
  const [adminTab, setAdminTab] = useState<'approval' | 'members' | 'patients'>('approval');

  // Schedule category settings
  const scheduleCatStore = useScheduleCategoryStore();
  const [newSchedLabel, setNewSchedLabel] = useState('');
  const [newSchedColor, setNewSchedColor] = useState('gray');

  // Charting settings
  const {
    problemListStyle, setProblemListStyle,
    includeFieldNames, setIncludeFieldNames,
    excludeEmptySections, setExcludeEmptySections,
    sectionSeparator, setSectionSeparator,
    sectionNames, setSectionName, resetSectionNames,
  } = useChartingSettingsStore();

  // PIN settings
  const { hasPin, autoLockMinutes, setAutoLockMinutes } = usePinLockStore();
  const [pinMode, setPinMode] = useState<'idle' | 'set' | 'change' | 'remove'>('idle');
  const [pinCurrent, setPinCurrent] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      checkHasPin(currentUser.id).then((result) => {
        usePinLockStore.getState().setHasPin(result);
      });
    }
  }, [currentUser]);

  const handlePinSave = async () => {
    if (!currentUser) return;
    setPinError('');
    setPinLoading(true);

    try {
      // 변경/삭제 시 현재 PIN 확인
      if (pinMode === 'change' || pinMode === 'remove') {
        const valid = await verifyPin(currentUser.id, pinCurrent);
        if (!valid) {
          setPinError('현재 PIN이 일치하지 않습니다.');
          setPinLoading(false);
          return;
        }
      }

      if (pinMode === 'remove') {
        await removePin(currentUser.id);
        toast({ title: 'PIN 해제됨', description: 'PIN 잠금이 비활성화되었습니다.' });
      } else {
        // set or change
        if (pinNew.length !== 4 || !/^\d{4}$/.test(pinNew)) {
          setPinError('PIN은 4자리 숫자여야 합니다.');
          setPinLoading(false);
          return;
        }
        if (pinNew !== pinConfirm) {
          setPinError('PIN이 일치하지 않습니다.');
          setPinLoading(false);
          return;
        }
        await savePinToDB(currentUser.id, pinNew);
        toast({ title: 'PIN 설정 완료', description: 'PIN이 설정되었습니다.' });
      }

      setPinMode('idle');
      setPinCurrent('');
      setPinNew('');
      setPinConfirm('');
    } catch (err) {
      setPinError('오류가 발생했습니다.');
    } finally {
      setPinLoading(false);
    }
  };

  // Lab categories
  const [categories, setCategories] = useState<LabDisplayCategory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    labCategoryService.getAll().then(setCategories);
  }, []);

  const handleSave = async () => {
    await labCategoryService.saveAll(categories);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    if (!confirm('기본값으로 초기화하시겠습니까?')) return;
    await labCategoryService.resetToDefaults();
    setCategories(DEFAULT_LAB_CATEGORIES);
  };

  const moveCategory = (idx: number, dir: 'up' | 'down') => {
    const newCats = [...categories];
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newCats.length) return;
    [newCats[idx], newCats[targetIdx]] = [newCats[targetIdx]!, newCats[idx]!];
    setCategories(newCats);
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    setCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: newCatName.trim(), order: prev.length, items: [] },
    ]);
    setNewCatName('');
  };

  const addItem = (catId: string) => {
    const val = newItemInputs[catId]?.trim();
    if (!val) return;
    setCategories((prev) =>
      prev.map((c) => c.id === catId ? { ...c, items: [...c.items, val] } : c)
    );
    setNewItemInputs((prev) => ({ ...prev, [catId]: '' }));
  };

  const removeItem = (catId: string, item: string) => {
    setCategories((prev) =>
      prev.map((c) => c.id === catId ? { ...c, items: c.items.filter((i) => i !== item) } : c)
    );
  };

  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      {/* PIN Lock Settings */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasPin ? <Lock className="h-5 w-5 text-primary" /> : <Unlock className="h-5 w-5 text-muted-foreground" />}
            <h2 className="text-lg font-semibold">PIN 잠금</h2>
            {hasPin && <Badge variant="secondary" className="text-xs">활성</Badge>}
          </div>
          {pinMode === 'idle' && (
            <div className="flex gap-2">
              {hasPin ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setPinMode('change')}>변경</Button>
                  <Button variant="outline" size="sm" onClick={() => setPinMode('remove')}>해제</Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setPinMode('set')}>PIN 설정</Button>
              )}
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {hasPin
            ? `${autoLockMinutes}분 비활동 시 자동 잠금됩니다.`
            : 'PIN을 설정하면 비활동 시 자동으로 화면이 잠깁니다.'
          }
        </p>

        {/* Auto-lock time setting */}
        {hasPin && pinMode === 'idle' && (
          <div className="flex items-center gap-3">
            <span className="text-sm">자동 잠금 시간:</span>
            <select
              value={autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
              className="rounded-md border px-2 py-1 text-sm bg-background"
            >
              <option value={1}>1분</option>
              <option value={3}>3분</option>
              <option value={5}>5분</option>
              <option value={10}>10분</option>
              <option value={15}>15분</option>
              <option value={30}>30분</option>
            </select>
          </div>
        )}

        {/* PIN Form */}
        {pinMode !== 'idle' && (
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-medium">
              {pinMode === 'set' && 'PIN 설정'}
              {pinMode === 'change' && 'PIN 변경'}
              {pinMode === 'remove' && 'PIN 해제'}
            </h3>

            {(pinMode === 'change' || pinMode === 'remove') && (
              <div>
                <label className="text-xs text-muted-foreground">현재 PIN</label>
                <Input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pinCurrent}
                  onChange={(e) => setPinCurrent(e.target.value.replace(/\D/g, ''))}
                  placeholder="현재 4자리 PIN"
                  className="mt-1 w-40"
                />
              </div>
            )}

            {pinMode !== 'remove' && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">새 PIN</label>
                  <Input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pinNew}
                    onChange={(e) => setPinNew(e.target.value.replace(/\D/g, ''))}
                    placeholder="4자리 숫자"
                    className="mt-1 w-40"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">새 PIN 확인</label>
                  <Input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                    placeholder="4자리 숫자 재입력"
                    className="mt-1 w-40"
                  />
                </div>
              </>
            )}

            {pinError && <p className="text-sm text-red-500">{pinError}</p>}

            <div className="flex gap-2">
              <Button size="sm" onClick={handlePinSave} disabled={pinLoading}>
                {pinMode === 'remove' ? '해제' : '저장'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPinMode('idle');
                  setPinCurrent('');
                  setPinNew('');
                  setPinConfirm('');
                  setPinError('');
                }}
              >
                취소
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Charting Settings */}
      <Card className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">차팅 복사 설정</h2>
        </div>

        {/* Problem List style */}
        <div className="flex items-center gap-3">
          <span className="text-sm w-40 shrink-0">Problem List 형식</span>
          <select
            value={problemListStyle}
            onChange={(e) => setProblemListStyle(e.target.value as 'numbered' | 'numbered_simple' | 'bulleted' | 'plain')}
            className="rounded-md border px-2 py-1 text-sm bg-background"
          >
            <option value="numbered_simple">#. (기본)</option>
            <option value="numbered">#1. #2. #3.</option>
            <option value="bulleted">• (bullet)</option>
            <option value="plain">없음</option>
          </select>
        </div>

        {/* Section separator */}
        <div className="flex items-center gap-3">
          <span className="text-sm w-40 shrink-0">섹션 간격</span>
          <select
            value={sectionSeparator === '\n\n' ? '2' : '1'}
            onChange={(e) => setSectionSeparator(e.target.value === '2' ? '\n\n' : '\n')}
            className="rounded-md border px-2 py-1 text-sm bg-background"
          >
            <option value="2">빈 줄 포함 (기본)</option>
            <option value="1">줄바꿈만</option>
          </select>
        </div>

        {/* Toggle options */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeFieldNames}
              onChange={(e) => setIncludeFieldNames(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">필드명 포함 (C/C, PI, Plan 등)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeEmptySections}
              onChange={(e) => setExcludeEmptySections(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">빈 섹션 제외</span>
          </label>
        </div>

        {/* Section names customization */}
        {includeFieldNames && (
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">섹션 이름 커스텀</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetSectionNames}>
                <RotateCcw className="h-3 w-3 mr-1" />
                기본값
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(sectionNames) as [keyof typeof sectionNames, string][]).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">{key}</span>
                  <Input
                    className="h-7 text-xs"
                    value={value}
                    onChange={(e) => setSectionName(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Schedule Category Settings */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">일정 카테고리</h2>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={scheduleCatStore.resetCategories}>
            <RotateCcw className="h-3 w-3 mr-1" />
            기본값
          </Button>
        </div>

        <div className="space-y-2">
          {scheduleCatStore.categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              <select
                value={cat.color}
                onChange={(e) => scheduleCatStore.updateCategory(cat.id, { color: e.target.value })}
                className="rounded-md border px-1.5 py-1 text-xs bg-background w-20"
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <Input
                className="h-8 text-sm flex-1"
                value={cat.label}
                onChange={(e) => scheduleCatStore.updateCategory(cat.id, { label: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                onClick={() => scheduleCatStore.removeCategory(cat.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            value={newSchedColor}
            onChange={(e) => setNewSchedColor(e.target.value)}
            className="rounded-md border px-1.5 py-1 text-xs bg-background w-20"
          >
            {COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Input
            className="h-8 text-sm flex-1"
            placeholder="새 카테고리 이름"
            value={newSchedLabel}
            onChange={(e) => setNewSchedLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSchedLabel.trim()) {
                scheduleCatStore.addCategory(newSchedLabel.trim(), newSchedColor);
                setNewSchedLabel('');
              }
            }}
          />
          <Button
            size="sm"
            className="h-8"
            onClick={() => {
              if (newSchedLabel.trim()) {
                scheduleCatStore.addCategory(newSchedLabel.trim(), newSchedColor);
                setNewSchedLabel('');
              }
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            추가
          </Button>
        </div>
      </Card>

      {/* Admin Section */}
      {isAdmin && (
        <Card className="p-0 overflow-hidden">
          {/* Admin header */}
          <div className="flex items-center gap-2 px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">관리자</h2>
          </div>

          {/* Admin tabs */}
          <div className="flex border-b px-4 sm:px-6">
            <button
              onClick={() => setAdminTab('approval')}
              className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                adminTab === 'approval' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              가입 승인
              {pendingUsers.length > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1.5 absolute -top-0.5 -right-1">
                  {pendingUsers.length}
                </Badge>
              )}
              {adminTab === 'approval' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
            <button
              onClick={() => setAdminTab('members')}
              className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                adminTab === 'members' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              회원 관리
              <span className="text-xs text-muted-foreground ml-1">
                ({allUsers.filter((u) => u.status === 'approved' && u.role !== 'admin').length})
              </span>
              {adminTab === 'members' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
            <button
              onClick={() => setAdminTab('patients')}
              className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                adminTab === 'patients' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              환자 현황
              <span className="text-xs text-muted-foreground ml-1">
                ({allPatients.filter((p) => p.status === 'active').length})
              </span>
              {adminTab === 'patients' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4 sm:p-6">
            {/* Approval tab */}
            {adminTab === 'approval' && (
              <div className="space-y-3">
                {pendingUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">승인 대기 중인 가입 요청이 없습니다.</p>
                ) : (
                  pendingUsers.map((user) => {
                    const state = approvalState[user.id];
                    const isProcessing = processingId === user.id;
                    return (
                      <Card key={user.id} className="p-4 space-y-3">
                        {/* User info */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              @{user.username} · {user.department}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              가입 신청: {user.createdAt.toLocaleDateString('ko-KR')}
                            </div>
                          </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        대기 중
                      </Badge>
                    </div>

                    {/* Role selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">역할</label>
                      <div className="flex gap-2">
                        {AVAILABLE_ROLES.map((r) => (
                          <Button
                            key={r.value}
                            variant={state?.role === r.value ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              setApprovalState((prev) => ({
                                ...prev,
                                [user.id]: { ...prev[user.id]!, role: r.value },
                              }))
                            }
                          >
                            {r.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Module selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">모듈 권한</label>
                      <div className="flex gap-2">
                        {AVAILABLE_MODULES.map((m) => (
                          <Button
                            key={m.value}
                            variant={state?.modules.includes(m.value) ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => toggleModule(user.id, m.value)}
                          >
                            {m.label}
                            <span className="ml-1 text-[10px] opacity-70">({m.description})</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleApprove(user.id)}
                        disabled={isProcessing}
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                        승인
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleReject(user.id)}
                        disabled={isProcessing}
                      >
                        <UserX className="h-3.5 w-3.5 mr-1.5" />
                        거절
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

            {/* Members tab */}
            {adminTab === 'members' && (
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-3 py-2 font-medium">이름</th>
                      <th className="px-3 py-2 font-medium">아이디</th>
                      <th className="px-3 py-2 font-medium hidden sm:table-cell">진료과</th>
                      <th className="px-3 py-2 font-medium">역할</th>
                      <th className="px-3 py-2 font-medium hidden sm:table-cell">모듈</th>
                      <th className="px-3 py-2 font-medium hidden sm:table-cell">상태</th>
                      <th className="px-3 py-2 font-medium hidden md:table-cell">가입일</th>
                      <th className="px-3 py-2 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers
                      .filter((u) => u.role !== 'admin')
                      .sort((a, b) => {
                        const statusOrder = { approved: 0, pending: 1, rejected: 2 };
                        const diff = statusOrder[a.status] - statusOrder[b.status];
                        if (diff !== 0) return diff;
                        return a.name.localeCompare(b.name, 'ko');
                      })
                      .map((user) => (
                        <tr key={user.id} className="border-t hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">{user.name}</td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">@{user.username}</td>
                          <td className="px-3 py-2 hidden sm:table-cell">{user.department || '-'}</td>
                          <td className="px-3 py-2 text-xs">
                            {AVAILABLE_ROLES.find((r) => r.value === user.role)?.label || user.role}
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell">
                            <div className="flex gap-1">
                              {user.modules?.map((m) => (
                                <Badge key={m} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {m === 'wardflow' ? 'WF' : m === 'wardcare' ? 'WC' : m}
                                </Badge>
                              ))}
                              {(!user.modules || user.modules.length === 0) && (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell">
                            <Badge
                              variant={user.status === 'approved' ? 'default' : user.status === 'pending' ? 'outline' : 'destructive'}
                              className={`text-[10px] ${user.status === 'approved' ? 'bg-green-600' : user.status === 'pending' ? 'text-amber-600 border-amber-300' : ''}`}
                            >
                              {user.status === 'approved' ? '승인' : user.status === 'pending' ? '대기' : '거절'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">
                            {user.createdAt instanceof Date
                              ? user.createdAt.toLocaleDateString('ko-KR')
                              : new Date(user.createdAt).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              disabled={processingId === user.id}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    {allUsers.filter((u) => u.role !== 'admin').length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground text-sm">
                          등록된 회원이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Patients tab */}
            {adminTab === 'patients' && (() => {
              const grouped = new Map<string, { active: Patient[]; discharged: Patient[] }>();
              for (const p of allPatients) {
                if (!grouped.has(p.createdBy)) {
                  grouped.set(p.createdBy, { active: [], discharged: [] });
                }
                const group = grouped.get(p.createdBy)!;
                if (p.status === 'active') {
                  group.active.push(p);
                } else {
                  group.discharged.push(p);
                }
              }

              const doctorEntries = Array.from(grouped.entries()).map(([doctorId, group]) => {
                const user = allUsers.find((u) => u.id === doctorId);
                return {
                  doctorId,
                  doctorName: user?.name ?? doctorId,
                  department: user?.department ?? '',
                  active: group.active.sort((a, b) => a.roomBed.localeCompare(b.roomBed, undefined, { numeric: true })),
                  discharged: group.discharged.sort((a, b) => {
                    const da = a.dischargeDate ? new Date(a.dischargeDate).getTime() : 0;
                    const db2 = b.dischargeDate ? new Date(b.dischargeDate).getTime() : 0;
                    return db2 - da;
                  }),
                };
              }).sort((a, b) => a.doctorName.localeCompare(b.doctorName, 'ko'));

              if (doctorEntries.length === 0) {
                return <p className="text-sm text-muted-foreground py-4 text-center">등록된 환자가 없습니다.</p>;
              }

              return (
                <div className="space-y-3">
                  {doctorEntries.map(({ doctorId, doctorName, department, active, discharged }) => (
                    <Card key={doctorId} className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Stethoscope className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{doctorName}</span>
                        {department && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{department}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          입원 {active.filter((p) => p.patientType === 'admitted').length}명
                          {active.some((p) => p.patientType === 'consult') &&
                            ` / 컨설트 ${active.filter((p) => p.patientType === 'consult').length}명`}
                          {discharged.length > 0 && ` / 퇴원 ${discharged.length}명`}
                        </span>
                      </div>

                      {active.length > 0 && (
                        <div className="space-y-1">
                          {active.map((p) => (
                            <div key={p.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-muted/50">
                              <Badge
                                variant={p.patientType === 'admitted' ? 'default' : 'outline'}
                                className={`text-[10px] px-1.5 py-0 w-12 justify-center ${p.patientType === 'admitted' ? 'bg-blue-600' : 'text-violet-600 border-violet-300'}`}
                              >
                                {p.patientType === 'admitted' ? '입원' : '컨설트'}
                              </Badge>
                              <span className="text-muted-foreground w-14 text-xs">{p.roomBed}</span>
                              <span className="font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground">{p.sex}/{new Date().getFullYear() - new Date(p.birthDate).getFullYear()}</span>
                              {p.attention && (
                                <span className="text-red-500 text-xs">⚠️</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {discharged.length > 0 && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            퇴원환자 {discharged.length}명
                          </summary>
                          <div className="mt-1 space-y-1 opacity-60">
                            {discharged.map((p) => (
                              <div key={p.id} className="flex items-center gap-2 text-sm px-2 py-1">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 w-12 justify-center">퇴원</Badge>
                                <span className="font-medium">{p.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {p.dischargeDate instanceof Date
                                    ? p.dischargeDate.toLocaleDateString('ko-KR')
                                    : p.dischargeDate ? new Date(p.dischargeDate).toLocaleDateString('ko-KR') : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </Card>
                  ))}
                </div>
              );
            })()}
          </div>
        </Card>
      )}

      {/* Lab Category Settings */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Lab 카테고리</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              기본값
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saved ? '저장됨!' : '저장'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Lab 결과 표시 순서와 카테고리를 설정합니다. 상하 버튼으로 카테고리 순서를 변경할 수 있습니다.
        </p>

        <div className="space-y-2">
          {categories.map((cat, idx) => (
            <Card key={cat.id} className="p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm flex-1">{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.items.length}개 항목</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCategory(idx, 'up')} disabled={idx === 0}>↑</Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCategory(idx, 'down')} disabled={idx === categories.length - 1}>↓</Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                  >
                    {expandedId === cat.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteCategory(cat.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {expandedId === cat.id && (
                <div className="p-3 space-y-2 border-t">
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs"
                      >
                        {item}
                        <button onClick={() => removeItem(cat.id, item)} className="text-muted-foreground hover:text-destructive">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      className="h-7 text-xs flex-1"
                      placeholder="항목명 추가 (예: WBC, Hb)"
                      value={newItemInputs[cat.id] ?? ''}
                      onChange={(e) => setNewItemInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addItem(cat.id)}
                    />
                    <Button size="sm" className="h-7 text-xs" onClick={() => addItem(cat.id)}>추가</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Add new category */}
        <div className="flex gap-2">
          <Input
            className="h-8 text-sm"
            placeholder="새 카테고리 이름 (예: Thyroid, Cardiac)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <Button size="sm" onClick={addCategory}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            추가
          </Button>
        </div>
      </Card>

      {/* Calendar Event Colors */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">캘린더 색상</h2>
        </div>
        <p className="text-sm text-muted-foreground">캘린더와 Today's Note에서 표시되는 이벤트 색상을 변경합니다.</p>
        <CalendarColorSettings />
      </Card>

      {/* Lab Import Inbox */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Lab Import Inbox</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          오픈클로가 XLS를 저장하는 폴더를 연결하면 Lab 결과를 자동으로 파싱하여 환자와 매칭, 저장합니다.
        </p>
        <LabImportInbox
          onServerSync={serverKey && serverPw ? async () => {
            await uploadBackupToServer(serverPw, serverKey.trim());
          } : undefined}
        />
      </Card>

      {/* Backup & Restore */}
      <Card ref={backupSectionRef} className="p-6 space-y-5">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">데이터 백업 / 복원</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          모든 데이터를 AES-256 암호화된 파일(.wardflow)로 내보내거나 복원합니다.
        </p>

        {/* Daily backup reminder toggle */}
        <label className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">매일 첫 실행 시 백업 알림</span>
          </div>
          <div
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dailyBackup ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            onClick={() => {
              const next = !dailyBackup;
              setDailyBackup(next);
              setDailyBackupEnabled(next);
              toast({ title: next ? '매일 백업 알림이 활성화되었습니다.' : '매일 백업 알림이 비활성화되었습니다.' });
            }}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${dailyBackup ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
        </label>

        {/* Export */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-green-600" />
            <h3 className="font-medium text-sm">백업 내보내기</h3>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={backupShowPw ? 'text' : 'password'}
                placeholder="암호화 비밀번호 (4자 이상)"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                className="pr-9"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setBackupShowPw(!backupShowPw)}
              >
                {backupShowPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button onClick={handleExportBackup} disabled={backupLoading || !backupPassword}>
              {backupLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  내보내기
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Import */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-600" />
            <h3 className="font-medium text-sm">백업 복원</h3>
          </div>
          <p className="text-xs text-destructive">
            복원 시 현재 모든 데이터가 백업 파일의 내용으로 교체됩니다.
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => restoreInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                {restoreFile ? restoreFile.name : '파일 선택 (.wardflow)'}
              </Button>
              <input
                ref={restoreInputRef}
                type="file"
                accept=".wardflow"
                className="hidden"
                onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={restoreShowPw ? 'text' : 'password'}
                  placeholder="백업 시 설정한 비밀번호"
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  className="pr-9"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setRestoreShowPw(!restoreShowPw)}
                >
                  {restoreShowPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button variant="destructive" onClick={handleImportBackup} disabled={restoreLoading || !restoreFile || !restorePassword}>
                {restoreLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    복원
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">또는 텍스트로 전송</span>
          </div>
        </div>

        {/* Text Export */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-green-600" />
            <h3 className="font-medium text-sm">텍스트로 복사 (다른 기기로 전송)</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            암호화된 백업 텍스트를 클립보드에 복사합니다. 카톡 나에게 보내기 등으로 다른 기기에 전달하세요.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={textExportShowPw ? 'text' : 'password'}
                placeholder="암호화 비밀번호 (4자 이상)"
                value={textExportPw}
                onChange={(e) => setTextExportPw(e.target.value)}
                className="pr-9"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setTextExportShowPw(!textExportShowPw)}
              >
                {textExportShowPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button onClick={handleTextExport} disabled={textExportLoading || !textExportPw}>
              {textExportLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-1" />
                  복사
                </>
              )}
            </Button>
          </div>
          {textExportResult && (
            <div className="space-y-2">
              <textarea
                readOnly
                value={textExportResult}
                className="w-full h-20 rounded-md border bg-muted/50 p-2 text-[10px] font-mono resize-none"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <p className="text-xs text-green-600">위 텍스트가 클립보드에 복사되었습니다.</p>
            </div>
          )}
        </div>

        {/* Text Import */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-600" />
            <h3 className="font-medium text-sm">텍스트에서 복원 (다른 기기에서 받은 데이터)</h3>
          </div>
          <p className="text-xs text-destructive">
            복원 시 현재 모든 데이터가 교체됩니다.
          </p>
          <textarea
            placeholder="WARDFLOW:로 시작하는 백업 텍스트를 붙여넣으세요..."
            value={textImportData}
            onChange={(e) => setTextImportData(e.target.value)}
            className="w-full h-20 rounded-md border bg-background p-2 text-xs font-mono resize-none placeholder:font-sans"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={textImportShowPw ? 'text' : 'password'}
                placeholder="백업 시 설정한 비밀번호"
                value={textImportPw}
                onChange={(e) => setTextImportPw(e.target.value)}
                className="pr-9"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setTextImportShowPw(!textImportShowPw)}
              >
                {textImportShowPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button variant="destructive" onClick={handleTextImport} disabled={textImportLoading || !textImportData || !textImportPw}>
              {textImportLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  복원
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">또는 서버 동기화</span>
          </div>
        </div>

        {/* Server Sync */}
        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-sm">서버 동기화 (Supabase)</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            암호화된 데이터를 서버에 업로드/다운로드하여 기기 간 동기화할 수 있습니다.
            동일한 동기화 키와 비밀번호를 사용해야 합니다.
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">동기화 키 (아이디 또는 고유 키)</label>
              <Input
                type="text"
                placeholder="예: myward, doctor-kim"
                value={serverKey}
                onChange={(e) => setServerKey(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">암호화 비밀번호 (4자 이상)</label>
              <div className="relative mt-1">
                <Input
                  type={serverShowPw ? 'text' : 'password'}
                  placeholder="암호화 비밀번호"
                  value={serverPw}
                  onChange={(e) => setServerPw(e.target.value)}
                  className="pr-9"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setServerShowPw(!serverShowPw)}
                >
                  {serverShowPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          {serverInfo && serverInfo.exists && (
            <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-xs text-green-700 dark:text-green-400">
              마지막 업로드: {new Date(serverInfo.updatedAt!).toLocaleString()}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheckServerInfo}
              disabled={serverLoading || !serverKey}
            >
              <Cloud className="h-3.5 w-3.5 mr-1" />
              확인
            </Button>
            <Button
              size="sm"
              onClick={handleServerUpload}
              disabled={serverLoading || !serverKey || !serverPw}
            >
              {serverLoading ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <CloudUpload className="h-3.5 w-3.5 mr-1" />
                  서버 업로드
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleServerDownload}
              disabled={serverLoading || !serverKey || !serverPw}
            >
              {serverLoading ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <CloudDownload className="h-3.5 w-3.5 mr-1" />
                  서버 다운로드
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// --- Calendar Color Settings Sub-component ---

const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  schedule: '일정',
  global_alert: '범용 알림',
  reminder: '알림 메모',
};

function CalendarColorSettings() {
  const { colors, setColor, getColor } = useCalendarColorStore();

  return (
    <div className="space-y-3">
      {(Object.keys(EVENT_TYPE_LABELS) as CalendarEventType[]).map((type) => {
        const currentColor = getColor(type);
        return (
          <div key={type} className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full shrink-0 ${currentColor.dot}`} />
            <span className="text-sm font-medium w-20 shrink-0">{EVENT_TYPE_LABELS[type]}</span>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_KEYS.map((key) => {
                const preset = COLOR_PRESETS[key]!;
                const isSelected = colors[type] === key;
                return (
                  <button
                    key={key}
                    onClick={() => setColor(type, key)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${preset.dot} ${
                      isSelected ? 'border-foreground scale-110 ring-2 ring-offset-1 ring-foreground/20' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    title={preset.name}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SettingsPage;
