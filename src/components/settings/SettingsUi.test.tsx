import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUserAccessDraft } from '@/lib/adminAccess';
import { DEFAULT_CATEGORIES, useScheduleCategoryStore } from '@/stores/useScheduleCategoryStore';
import type { Patient } from '@/db/database';
import type { User } from '@/types/user';
import { AdminMemberAccess } from './AdminMemberAccess';
import { AdminPatientOwnership } from './AdminPatientOwnership';
import { ScheduleCategorySettings } from './ScheduleCategorySettings';

const baseUser: User = {
  id: 'doctor-1',
  username: 'doctor',
  name: '김의사',
  role: 'doctor',
  department: '재활의학과',
  status: 'approved',
  modules: ['wardflow'],
  createdAt: new Date('2026-05-25T00:00:00Z'),
  updatedAt: new Date('2026-05-25T00:00:00Z'),
};

const makePatient = (overrides: Partial<Patient>): Patient => ({
  id: 'patient-1',
  name: '홍길동',
  birthDate: new Date('1956-01-01'),
  sex: 'M',
  registrationNumber: '12345678',
  roomBed: '101-1',
  admissionDate: new Date('2026-05-01'),
  attendingPhysician: '김의사',
  patientType: 'admitted',
  status: 'active',
  createdBy: 'doctor-1',
  tags: [],
  attention: false,
  chiefComplaint: 'Stroke',
  onset: '',
  presentIllness: '',
  pastHistory: '',
  reviewOfSystem: '',
  physicalExam: '',
  problemList: [],
  plan: '',
  guardianExplanation: '',
  etc: '',
  createdAt: new Date('2026-05-25T00:00:00Z'),
  updatedAt: new Date('2026-05-25T00:00:00Z'),
  ...overrides,
});

describe('Settings UI behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    useScheduleCategoryStore.setState({ categories: [...DEFAULT_CATEGORIES] });
  });

  it('wires admin member search, status filters, role changes, module toggles, and saves', () => {
    const onQueryChange = vi.fn();
    const onStatusFilterChange = vi.fn();
    const onRoleChange = vi.fn();
    const onModuleToggle = vi.fn();
    const onResetDraft = vi.fn();
    const onSave = vi.fn();
    const onDeactivate = vi.fn();
    const draft = { ...createUserAccessDraft(baseUser), role: 'nurse' as const };

    render(
      <AdminMemberAccess
        memberUsers={[baseUser]}
        visibleMemberUsers={[baseUser]}
        memberCounts={{ all: 1, approved: 1, pending: 0, rejected: 0 }}
        memberQuery=""
        memberStatusFilter="all"
        memberAccessDrafts={{ [baseUser.id]: draft }}
        processingId={null}
        onQueryChange={onQueryChange}
        onStatusFilterChange={onStatusFilterChange}
        onRoleChange={onRoleChange}
        onModuleToggle={onModuleToggle}
        onResetDraft={onResetDraft}
        onSave={onSave}
        onDeactivate={onDeactivate}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('이름, 아이디, 진료과, 역할 검색'), {
      target: { value: '김의사' },
    });
    expect(onQueryChange).toHaveBeenCalledWith('김의사');

    fireEvent.click(screen.getByRole('button', { name: '승인 1' }));
    expect(onStatusFilterChange).toHaveBeenCalledWith('approved');

    fireEvent.change(screen.getByLabelText('김의사 역할 선택'), { target: { value: 'therapist' } });
    expect(onRoleChange).toHaveBeenCalledWith(baseUser, 'therapist');

    fireEvent.click(screen.getByRole('button', { name: 'WardCare' }));
    expect(onModuleToggle).toHaveBeenCalledWith(baseUser, 'wardcare');

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(onSave).toHaveBeenCalledWith(baseUser);

    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(onResetDraft).toHaveBeenCalledWith(baseUser);
  });

  it('filters patient ownership by search text and status tabs', () => {
    const patients = [
      makePatient({ id: 'active', name: '홍길동', roomBed: '101-1', attention: true }),
      makePatient({
        id: 'consult',
        name: '박협진',
        roomBed: '협진',
        patientType: 'consult',
        chiefComplaint: 'Back pain',
      }),
      makePatient({ id: 'discharged', name: '김퇴원', status: 'discharged', roomBed: '201-1' }),
    ];

    render(<AdminPatientOwnership patients={patients} users={[baseUser]} />);

    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.queryByText('김퇴원')).not.toBeInTheDocument();
    expect(screen.getByText('주의 환자 1명')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('환자명, 등록번호, 병실, 진단명 검색');
    fireEvent.change(searchInput, {
      target: { value: 'Back pain' },
    });
    expect(screen.getByText('박협진')).toBeInTheDocument();
    expect(screen.queryByText('홍길동')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '퇴원 1' }));
    expect(screen.getByText('김퇴원')).toBeInTheDocument();
  });

  it('adds and saves schedule categories through the Settings UI', () => {
    render(<ScheduleCategorySettings />);

    fireEvent.change(screen.getByPlaceholderText('새 카테고리 이름'), {
      target: { value: '  MRI   follow  up  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '추가' }));

    expect(screen.getByText('저장하지 않은 일정 카테고리 변경이 있습니다.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MRI follow up')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(
      useScheduleCategoryStore
        .getState()
        .categories.some((category) => category.label === 'MRI follow up')
    ).toBe(true);
    expect(screen.getByRole('button', { name: '저장됨' })).toBeInTheDocument();
  });

  it('shows the empty member and empty patient states', () => {
    const handlers = {
      onQueryChange: vi.fn(),
      onStatusFilterChange: vi.fn(),
      onRoleChange: vi.fn(),
      onModuleToggle: vi.fn(),
      onResetDraft: vi.fn(),
      onSave: vi.fn(),
      onDeactivate: vi.fn(),
    };

    const { rerender } = render(
      <AdminMemberAccess
        memberUsers={[]}
        visibleMemberUsers={[]}
        memberCounts={{ all: 0, approved: 0, pending: 0, rejected: 0 }}
        memberQuery=""
        memberStatusFilter="all"
        memberAccessDrafts={{}}
        processingId={null}
        {...handlers}
      />
    );

    expect(screen.getByText('관리자를 제외한 회원이 아직 없습니다.')).toBeInTheDocument();

    rerender(<AdminPatientOwnership patients={[]} users={[]} />);
    expect(screen.getByText('등록된 환자가 없습니다.')).toBeInTheDocument();
  });

  it('keeps per-row member controls scoped to the rendered row', () => {
    const onSave = vi.fn();
    const otherUser = { ...baseUser, id: 'doctor-2', username: 'other', name: '이의사' };

    render(
      <AdminMemberAccess
        memberUsers={[baseUser, otherUser]}
        visibleMemberUsers={[baseUser, otherUser]}
        memberCounts={{ all: 2, approved: 2, pending: 0, rejected: 0 }}
        memberQuery=""
        memberStatusFilter="all"
        memberAccessDrafts={{
          [baseUser.id]: { ...createUserAccessDraft(baseUser), role: 'nurse' },
          [otherUser.id]: createUserAccessDraft(otherUser),
        }}
        processingId={null}
        onQueryChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onRoleChange={vi.fn()}
        onModuleToggle={vi.fn()}
        onResetDraft={vi.fn()}
        onSave={onSave}
        onDeactivate={vi.fn()}
      />
    );

    const row = screen.getByText('김의사').closest('tr');
    expect(row).not.toBeNull();
    fireEvent.click(within(row as HTMLTableRowElement).getByRole('button', { name: '저장' }));
    expect(onSave).toHaveBeenCalledWith(baseUser);
  });
});
