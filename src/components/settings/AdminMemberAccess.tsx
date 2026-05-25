import { Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabaseBackend } from '@/config/backend';
import {
  ROLE_LABELS,
  STATUS_LABELS,
  createUserAccessDraft,
  hasAccessDraftChanged,
  type MemberStatusFilter,
  type UserAccessDraft,
} from '@/lib/adminAccess';
import type { User, UserRole, WardLinkModule } from '@/types/user';
import { AVAILABLE_MODULES, AVAILABLE_ROLES } from './adminAccessOptions';

const MEMBER_FILTERS: { value: MemberStatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'approved', label: '승인' },
  { value: 'pending', label: '대기' },
  { value: 'rejected', label: '거절' },
];

export function AdminMemberAccess({
  memberUsers,
  visibleMemberUsers,
  memberCounts,
  memberQuery,
  memberStatusFilter,
  memberAccessDrafts,
  processingId,
  onQueryChange,
  onStatusFilterChange,
  onRoleChange,
  onModuleToggle,
  onResetDraft,
  onSave,
  onDeactivate,
}: {
  memberUsers: User[];
  visibleMemberUsers: User[];
  memberCounts: Record<MemberStatusFilter, number>;
  memberQuery: string;
  memberStatusFilter: MemberStatusFilter;
  memberAccessDrafts: Record<string, UserAccessDraft>;
  processingId: string | null;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: MemberStatusFilter) => void;
  onRoleChange: (user: User, role: UserRole) => void;
  onModuleToggle: (user: User, module: WardLinkModule) => void;
  onResetDraft: (user: User) => void;
  onSave: (user: User) => void;
  onDeactivate: (user: User) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={memberQuery}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="이름, 아이디, 진료과, 역할 검색"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MEMBER_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={memberStatusFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onStatusFilterChange(filter.value)}
              aria-pressed={memberStatusFilter === filter.value}
            >
              {filter.label} {memberCounts[filter.value]}
            </Button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium">이름</th>
              <th className="px-3 py-2 font-medium">아이디</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">진료과</th>
              <th className="px-3 py-2 font-medium">역할</th>
              <th className="px-3 py-2 font-medium">모듈</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">상태</th>
              <th className="px-3 py-2 font-medium">작업</th>
            </tr>
          </thead>
          <tbody>
            {visibleMemberUsers.map((user) => (
              <MemberAccessRow
                key={user.id}
                user={user}
                draft={memberAccessDrafts[user.id] ?? createUserAccessDraft(user)}
                processing={processingId === user.id}
                onRoleChange={onRoleChange}
                onModuleToggle={onModuleToggle}
                onResetDraft={onResetDraft}
                onSave={onSave}
                onDeactivate={onDeactivate}
              />
            ))}
            {memberUsers.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="border-t px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  관리자를 제외한 회원이 아직 없습니다.
                </td>
              </tr>
            )}
            {memberUsers.length > 0 && visibleMemberUsers.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="border-t px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  조건에 맞는 회원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MemberAccessRow({
  user,
  draft,
  processing,
  onRoleChange,
  onModuleToggle,
  onResetDraft,
  onSave,
  onDeactivate,
}: {
  user: User;
  draft: UserAccessDraft;
  processing: boolean;
  onRoleChange: (user: User, role: UserRole) => void;
  onModuleToggle: (user: User, module: WardLinkModule) => void;
  onResetDraft: (user: User) => void;
  onSave: (user: User) => void;
  onDeactivate: (user: User) => void;
}) {
  const changed = hasAccessDraftChanged(user, draft);
  const canDeactivate = user.status === 'approved';

  return (
    <tr className="border-t align-top hover:bg-muted/20">
      <td className="px-3 py-3 font-medium">
        <div>{user.name}</div>
        <div className="mt-1 sm:hidden">
          <MemberStatusBadge status={user.status} />
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-muted-foreground">@{user.username}</td>
      <td className="hidden px-3 py-3 sm:table-cell">{user.department || '-'}</td>
      <td className="px-3 py-3">
        <select
          value={draft.role}
          onChange={(event) => onRoleChange(user, event.target.value as UserRole)}
          disabled={processing}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          aria-label={`${user.name} 역할 선택`}
        >
          {AVAILABLE_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {ROLE_LABELS[role.value]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_MODULES.map((module) => (
            <Button
              key={module.value}
              variant={draft.modules.includes(module.value) ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => onModuleToggle(user, module.value)}
              aria-pressed={draft.modules.includes(module.value)}
              disabled={processing}
              title={module.description}
            >
              {module.label}
            </Button>
          ))}
        </div>
      </td>
      <td className="hidden px-3 py-3 sm:table-cell">
        <MemberStatusBadge status={user.status} />
      </td>
      <td className="min-w-[170px] px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onSave(user)}
            disabled={processing || (user.status === 'approved' && !changed)}
          >
            {processing ? '저장 중' : user.status === 'approved' ? '저장' : '재승인'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onResetDraft(user)}
            disabled={processing || !changed}
          >
            되돌리기
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDeactivate(user)}
            disabled={processing || !canDeactivate}
            aria-label={`${user.name} 회원 비활성화`}
            title={
              canDeactivate
                ? useSupabaseBackend
                  ? '거절 상태로 전환'
                  : '회원 삭제'
                : '이미 비활성화된 회원'
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function MemberStatusBadge({ status }: { status: User['status'] }) {
  return (
    <Badge
      variant={status === 'approved' ? 'default' : status === 'pending' ? 'outline' : 'destructive'}
      className="text-[10px]"
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
