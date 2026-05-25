import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSupabaseBackend } from '@/config/backend';
import { listPatients as listSupabasePatients } from '@/data/patients.repository';
import { db } from '@/db/database';
import type { Patient } from '@/db/database';
import { useToast } from '@/hooks/use-toast';
import {
  createUserAccessDraft,
  countMembersByStatus,
  filterAdminMembers,
  hasAccessDraftChanged,
  normalizeWardModules,
  toggleAccessModule,
  type MemberStatusFilter,
  type UserAccessDraft,
} from '@/lib/adminAccess';
import { formatUserFacingError } from '@/lib/errorMessages';
import { fromDomainPatient } from '@/mappers/legacyPatient.mapper';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/utils/cn';
import type { User, UserRole, WardLinkModule } from '@/types/user';
import { AdminApprovalPanel } from './AdminApprovalPanel';
import { AdminMemberAccess } from './AdminMemberAccess';
import { AdminPatientOwnership } from './AdminPatientOwnership';

export function AdminSettings() {
  const { getPendingUsers, getAllUsers, approveUser, updateUserAccess, rejectUser, deleteUser } =
    useAuthStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<'approval' | 'members' | 'patients'>('approval');
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [approvalState, setApprovalState] = useState<
    Record<string, { role: UserRole; modules: WardLinkModule[] }>
  >({});
  const [memberAccessDrafts, setMemberAccessDrafts] = useState<Record<string, UserAccessDraft>>({});
  const [memberQuery, setMemberQuery] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<MemberStatusFilter>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const memberUsers = useMemo(() => allUsers.filter((user) => user.role !== 'admin'), [allUsers]);
  const memberCounts = useMemo(() => countMembersByStatus(memberUsers), [memberUsers]);
  const visibleMemberUsers = useMemo(
    () => filterAdminMembers(memberUsers, memberQuery, memberStatusFilter),
    [memberQuery, memberStatusFilter, memberUsers]
  );
  const approvedMemberCount = memberCounts.approved;
  const activePatientCount = useMemo(
    () => allPatients.filter((patient) => patient.status === 'active').length,
    [allPatients]
  );
  const isLoading = usersLoading || patientsLoading;

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
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
      setMemberAccessDrafts((current) => {
        const next: Record<string, UserAccessDraft> = {};
        for (const user of users) {
          if (user.role === 'admin') continue;
          const currentDraft = current[user.id];
          next[user.id] =
            currentDraft && hasAccessDraftChanged(user, currentDraft)
              ? currentDraft
              : createUserAccessDraft(user);
        }
        return next;
      });
      setLoadError(null);
    } catch (err) {
      setLoadError(formatUserFacingError(err, '사용자 정보를 불러오지 못했습니다.'));
    } finally {
      setUsersLoading(false);
    }
  }, [getAllUsers, getPendingUsers]);

  const loadPatients = useCallback(async () => {
    setPatientsLoading(true);
    try {
      const patients = useSupabaseBackend
        ? (await listSupabasePatients()).map(fromDomainPatient)
        : await db.patients.toArray();
      setAllPatients(patients);
      setLoadError(null);
    } catch (err) {
      setLoadError(formatUserFacingError(err, '환자 현황을 불러오지 못했습니다.'));
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  const refreshAdminData = useCallback(async () => {
    await Promise.all([loadUsers(), loadPatients()]);
    setLastLoadedAt(new Date());
  }, [loadPatients, loadUsers]);

  useEffect(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  const toggleApprovalModule = (userId: string, module: WardLinkModule) => {
    setApprovalState((current) => {
      const state = current[userId] ?? { role: 'doctor', modules: ['wardflow'] };
      return {
        ...current,
        [userId]: { ...state, modules: toggleAccessModule(state.modules, module) },
      };
    });
  };

  const updateMemberRole = (user: User, role: UserRole) => {
    setMemberAccessDrafts((current) => ({
      ...current,
      [user.id]: {
        ...(current[user.id] ?? createUserAccessDraft(user)),
        role,
      },
    }));
  };

  const toggleMemberModule = (user: User, module: WardLinkModule) => {
    setMemberAccessDrafts((current) => {
      const draft = current[user.id] ?? createUserAccessDraft(user);
      return {
        ...current,
        [user.id]: {
          ...draft,
          modules: toggleAccessModule(draft.modules, module),
        },
      };
    });
  };

  const resetMemberDraft = (user: User) => {
    setMemberAccessDrafts((current) => ({ ...current, [user.id]: createUserAccessDraft(user) }));
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
      setLastLoadedAt(new Date());
    } catch (err) {
      toast({
        title: '승인 실패',
        description: formatUserFacingError(err, '사용자 승인에 실패했습니다.'),
        variant: 'destructive',
      });
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
      setLastLoadedAt(new Date());
    } catch (err) {
      toast({
        title: '거절 실패',
        description: formatUserFacingError(err, '가입 요청 거절에 실패했습니다.'),
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const saveMemberAccess = async (user: User) => {
    const draft = memberAccessDrafts[user.id] ?? createUserAccessDraft(user);
    const modules = normalizeWardModules(draft.modules);
    setProcessingId(user.id);
    try {
      if (user.status === 'approved') {
        await updateUserAccess(user.id, draft.role, modules);
        toast({ title: '권한 저장 완료', description: `${user.name} 회원 권한을 갱신했습니다.` });
      } else {
        await approveUser(user.id, draft.role, modules);
        toast({
          title: '재승인 완료',
          description: `${user.name} 회원을 승인 상태로 전환했습니다.`,
        });
      }
      await loadUsers();
      setLastLoadedAt(new Date());
    } catch (err) {
      toast({
        title: '권한 저장 실패',
        description: formatUserFacingError(err, '회원 권한을 저장하지 못했습니다.'),
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const removeUser = async (user: User) => {
    const message = useSupabaseBackend
      ? `"${user.name}" 회원을 거절 상태로 전환하시겠습니까? Supabase Auth 계정 자체는 대시보드에서 별도로 관리해야 합니다.`
      : `"${user.name}" 회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`;
    if (!window.confirm(message)) return;
    setProcessingId(user.id);
    try {
      await deleteUser(user.id);
      toast({
        title: useSupabaseBackend ? '회원 비활성화 완료' : '삭제 완료',
        description: useSupabaseBackend
          ? `${user.name} 회원을 거절 상태로 전환했습니다.`
          : `${user.name} 회원을 삭제했습니다.`,
      });
      await loadUsers();
      setLastLoadedAt(new Date());
    } catch (err) {
      toast({
        title: useSupabaseBackend ? '회원 비활성화 실패' : '삭제 실패',
        description: formatUserFacingError(
          err,
          useSupabaseBackend ? '회원 비활성화에 실패했습니다.' : '회원 삭제에 실패했습니다.'
        ),
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">사용자 관리</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={refreshAdminData}
          disabled={isLoading || Boolean(processingId)}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          {isLoading ? '새로고침 중' : '새로고침'}
        </Button>
      </div>
      <div className="mx-4 mb-4 rounded-lg border border-sky-200 bg-sky-50/80 p-3 text-sm text-sky-950 sm:mx-6">
        {useSupabaseBackend
          ? '새 가입자는 승인 대기 상태로 생성됩니다. 승인된 사용자만 앱에 로그인할 수 있으며, 회원 비활성화는 프로필을 거절 상태로 바꿉니다.'
          : '로컬 모드의 사용자와 권한을 관리합니다.'}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-sky-800">
          <span>대기 {pendingUsers.length}명</span>
          <span>회원 {approvedMemberCount}명</span>
          <span>활성 환자 {activePatientCount}명</span>
          {lastLoadedAt && (
            <span>
              마지막 갱신{' '}
              {lastLoadedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
      <div className="flex border-b px-4 sm:px-6">
        <AdminTabButton
          active={tab === 'approval'}
          onClick={() => setTab('approval')}
          label="가입 승인"
          count={pendingUsers.length}
        />
        <AdminTabButton
          active={tab === 'members'}
          onClick={() => setTab('members')}
          label="회원 관리"
          count={approvedMemberCount}
        />
        <AdminTabButton
          active={tab === 'patients'}
          onClick={() => setTab('patients')}
          label="환자 현황"
          count={activePatientCount}
        />
      </div>
      <div className="p-4 sm:p-6">
        {loadError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {loadError}
          </div>
        )}
        {tab === 'approval' && (
          <AdminApprovalPanel
            pendingUsers={pendingUsers}
            approvalState={approvalState}
            processingId={processingId}
            usersLoading={usersLoading}
            onApprove={approve}
            onReject={reject}
            onToggleModule={toggleApprovalModule}
            onRoleChange={(user, role) =>
              setApprovalState((current) => ({
                ...current,
                [user.id]: {
                  ...(current[user.id] ?? { role: 'doctor', modules: ['wardflow'] }),
                  role,
                },
              }))
            }
          />
        )}
        {tab === 'members' &&
          (usersLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              회원 목록을 불러오는 중입니다.
            </p>
          ) : (
            <AdminMemberAccess
              memberUsers={memberUsers}
              visibleMemberUsers={visibleMemberUsers}
              memberCounts={memberCounts}
              memberQuery={memberQuery}
              memberStatusFilter={memberStatusFilter}
              memberAccessDrafts={memberAccessDrafts}
              processingId={processingId}
              onQueryChange={setMemberQuery}
              onStatusFilterChange={setMemberStatusFilter}
              onRoleChange={updateMemberRole}
              onModuleToggle={toggleMemberModule}
              onResetDraft={resetMemberDraft}
              onSave={saveMemberAccess}
              onDeactivate={removeUser}
            />
          ))}
        {tab === 'patients' &&
          (patientsLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              환자 현황을 불러오는 중입니다.
            </p>
          ) : (
            <AdminPatientOwnership patients={allPatients} users={allUsers} />
          ))}
      </div>
    </Card>
  );
}

function AdminTabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'relative px-3 py-2 text-sm font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
      <span className="ml-1 text-xs text-muted-foreground">({count})</span>
      {active && <div className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-primary" />}
    </button>
  );
}
