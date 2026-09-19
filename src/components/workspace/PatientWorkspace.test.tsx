import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientWorkspace } from './PatientWorkspace';
import type { WorkspaceTabId } from './WorkspaceTabs';
import { emptyBriefingData } from '@/features/app/optimisticBriefing';
import type { Patient } from '@/types/patient';

const patient: Patient = {
  id: 'p1',
  registrationNumber: '0000004532',
  name: '김환자',
  birthDate: new Date(1965, 0, 1),
  sex: 'F',
  roomBed: '302-1',
  admissionDate: new Date(2026, 8, 1),
  attendingPhysician: '재활의학과',
  patientType: 'admitted',
  status: 'active',
  createdBy: 'u1',
  tags: [],
  chiefComplaint: 'fever',
  onset: '2026-09-01',
  presentIllness: 'cough for 3 days',
  pastHistory: '',
  reviewOfSystem: '',
  physicalExam: '',
  problemList: ['pneumonia'],
  plan: 'start abx',
  guardianExplanation: '',
  etc: '',
  createdAt: new Date(2026, 8, 1),
  updatedAt: new Date(2026, 8, 1),
};

/**
 * 탭 전환 시 렌더 자체가 깨지는 회귀를 잡는 스모크 테스트.
 * (차팅 탭이 zustand selector 무한 루프로 빈 화면이 됐던 적이 있다.)
 */
const TABS: Array<{ id: WorkspaceTabId; label: string; expect: string }> = [
  { id: 'overview', label: '요약', expect: '차팅 요약' },
  { id: 'charting', label: '차팅', expect: '차팅' },
  { id: 'lab', label: 'Lab', expect: 'Lab 수치 표' },
  { id: 'medications', label: '약제', expect: '항생제' },
  { id: 'notes', label: '메모', expect: '메모 추가' },
  { id: 'schedule', label: '일정', expect: '오늘 일정 추가' },
];

describe('PatientWorkspace tab rendering', () => {
  it.each(TABS)('renders the $label tab without crashing', async ({ id, expect: heading }) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<PatientWorkspace patient={patient} data={emptyBriefingData} initialTab={id} />);

    const messages = errorSpy.mock.calls.map((call) => String(call[0])).join('\n');
    errorSpy.mockRestore();

    expect(messages).not.toMatch(/getSnapshot should be cached|Maximum update depth/);
    expect(await screen.findAllByText(heading)).not.toHaveLength(0);
  });

  it('switches tabs from the tab bar', async () => {
    const user = userEvent.setup();
    render(<PatientWorkspace patient={patient} data={emptyBriefingData} />);

    expect(screen.getByText('차팅 요약')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /차팅/ }));
    expect(screen.getByLabelText('C/C')).toBeInTheDocument();
    expect(screen.getByDisplayValue('fever')).toBeInTheDocument();
  });
});
