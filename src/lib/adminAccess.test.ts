import { describe, expect, it } from 'vitest';
import {
  createUserAccessDraft,
  countMembersByStatus,
  filterAdminMembers,
  hasAccessDraftChanged,
  normalizeUserRole,
  normalizeWardModules,
  toggleAccessModule,
} from './adminAccess';
import type { User } from '@/types/user';

const baseUser: User = {
  id: 'user-1',
  username: 'member',
  name: 'Member',
  role: 'doctor',
  department: 'Rehab',
  status: 'approved',
  modules: ['wardflow'],
  createdAt: new Date('2026-05-25T00:00:00Z'),
  updatedAt: new Date('2026-05-25T00:00:00Z'),
};

describe('adminAccess helpers', () => {
  it('normalizes roles and modules to supported values', () => {
    expect(normalizeUserRole('nurse')).toBe('nurse');
    expect(normalizeUserRole('owner')).toBe('doctor');
    expect(normalizeWardModules(['wardcare', 'bad', 'wardflow', 'wardcare'])).toEqual([
      'wardflow',
      'wardcare',
    ]);
    expect(normalizeWardModules([])).toEqual(['wardflow']);
  });

  it('creates stable access drafts and detects changes', () => {
    const draft = createUserAccessDraft(baseUser);
    expect(draft).toEqual({ role: 'doctor', modules: ['wardflow'] });
    expect(hasAccessDraftChanged(baseUser, draft)).toBe(false);
    expect(hasAccessDraftChanged(baseUser, { role: 'nurse', modules: ['wardflow'] })).toBe(true);
    expect(
      hasAccessDraftChanged(baseUser, { role: 'doctor', modules: ['wardflow', 'wardcare'] })
    ).toBe(true);
  });

  it('keeps at least one module selected while toggling access modules', () => {
    expect(toggleAccessModule(['wardflow'], 'wardcare')).toEqual(['wardflow', 'wardcare']);
    expect(toggleAccessModule(['wardflow'], 'wardflow')).toEqual(['wardflow']);
    expect(toggleAccessModule(['wardflow', 'wardcare'], 'wardflow')).toEqual(['wardcare']);
  });

  it('counts and filters members by status and search text', () => {
    const users: User[] = [
      baseUser,
      {
        ...baseUser,
        id: 'user-2',
        username: 'pending',
        name: 'Pending Nurse',
        role: 'nurse',
        status: 'pending',
      },
      {
        ...baseUser,
        id: 'user-3',
        username: 'rejected',
        name: 'Rejected Therapist',
        role: 'therapist',
        status: 'rejected',
        modules: ['wardcare'],
      },
    ];

    expect(countMembersByStatus(users)).toEqual({ all: 3, pending: 1, approved: 1, rejected: 1 });
    expect(filterAdminMembers(users, 'nurse', 'all').map((user) => user.id)).toEqual(['user-2']);
    expect(filterAdminMembers(users, 'wardcare', 'rejected').map((user) => user.id)).toEqual([
      'user-3',
    ]);
    expect(filterAdminMembers(users, 'member', 'approved').map((user) => user.id)).toEqual([
      'user-1',
    ]);
  });
});
