import type { User } from '@/types/user';
import type { UserProfile } from '@/domain/user';

export function fromUserProfile(profile: UserProfile): User {
  return {
    id: profile.id,
    username: profile.username ?? profile.id,
    name: profile.displayName,
    role: profile.role,
    department: profile.department,
    status: profile.status,
    approvedBy: profile.approvedBy,
    approvedAt: profile.approvedAt,
    modules: profile.modules.filter((module): module is User['modules'][number] =>
      module === 'wardflow' || module === 'wardcare'
    ),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export function loginIdentifierToEmail(identifier: string): string {
  const trimmed = identifier.trim();
  return trimmed.includes('@') ? trimmed : `${trimmed}@wardflow.local`;
}

