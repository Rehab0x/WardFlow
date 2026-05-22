import type { Tables } from '@/types/supabase';
import type { UserProfile } from '@/domain/user';

export function fromProfileRow(row: Tables<'profiles'>): UserProfile {
  return {
    id: row.id,
    username: row.username ?? undefined,
    displayName: row.display_name,
    department: row.department ?? undefined,
    role: row.role,
    status: row.status,
    modules: row.modules,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

