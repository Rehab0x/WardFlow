import type { User, UserRole, UserStatus, WardLinkModule } from '@/types/user';

export interface UserAccessDraft {
  role: UserRole;
  modules: WardLinkModule[];
}

export type MemberStatusFilter = 'all' | UserStatus;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  doctor: '의사',
  nurse: '간호사',
  therapist: '치료사',
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '거절',
};

const MODULE_ORDER: WardLinkModule[] = ['wardflow', 'wardcare'];

export function normalizeUserRole(role: unknown, fallback: UserRole = 'doctor'): UserRole {
  return role === 'admin' || role === 'doctor' || role === 'nurse' || role === 'therapist'
    ? role
    : fallback;
}

export function normalizeWardModules(
  modules: unknown,
  fallback: WardLinkModule[] = ['wardflow']
): WardLinkModule[] {
  if (!Array.isArray(modules)) return [...fallback];

  const allowed = new Set<WardLinkModule>();
  for (const module of modules) {
    if (module === 'wardflow' || module === 'wardcare') {
      allowed.add(module);
    }
  }

  const normalized = MODULE_ORDER.filter((module) => allowed.has(module));
  return normalized.length > 0 ? normalized : [...fallback];
}

export function createUserAccessDraft(user: User): UserAccessDraft {
  return {
    role: normalizeUserRole(user.role),
    modules: normalizeWardModules(user.modules),
  };
}

export function hasAccessDraftChanged(user: User, draft: UserAccessDraft | undefined): boolean {
  if (!draft) return false;
  const current = createUserAccessDraft(user);
  return (
    current.role !== draft.role ||
    current.modules.join('|') !== normalizeWardModules(draft.modules).join('|')
  );
}

export function toggleAccessModule(
  modules: WardLinkModule[],
  module: WardLinkModule
): WardLinkModule[] {
  const normalized = normalizeWardModules(modules);
  const next = normalized.includes(module)
    ? normalized.filter((item) => item !== module)
    : [...normalized, module];
  return normalizeWardModules(next, normalized);
}

export function countMembersByStatus(users: User[]): Record<MemberStatusFilter, number> {
  return users.reduce(
    (counts, user) => {
      counts.all += 1;
      counts[user.status] += 1;
      return counts;
    },
    { all: 0, pending: 0, approved: 0, rejected: 0 } satisfies Record<MemberStatusFilter, number>
  );
}

export function filterAdminMembers(
  users: User[],
  query: string,
  status: MemberStatusFilter
): User[] {
  const normalizedQuery = query.trim().toLowerCase();
  return users.filter((user) => {
    if (status !== 'all' && user.status !== status) return false;
    if (!normalizedQuery) return true;
    return [
      user.name,
      user.username,
      user.department ?? '',
      ROLE_LABELS[user.role],
      STATUS_LABELS[user.status],
      ...user.modules,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}
