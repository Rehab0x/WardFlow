import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Patient } from '@/types/patient';
import type { BriefingData } from '@/services/briefingService';
import { RoundingBoard } from './RoundingBoard';

function briefing(overrides: Partial<BriefingData> = {}): BriefingData {
  return {
    reminders: [],
    progressNotes: [],
    antibiotics: [],
    recentLabs: [],
    todaySchedules: [],
    patientSummary: { total: 0, admitted: 0, consult: 0 },
    ...overrides,
  };
}

function patient(overrides: Partial<Patient> & { id: string; roomBed: string }): Patient {
  return {
    name: '환자',
    birthDate: new Date('1970-01-01'),
    sex: 'M',
    status: 'active',
    patientType: 'admitted',
    ...overrides,
  } as Patient;
}

const patients = [
  patient({ id: 'a', roomBed: '101-1', name: '홍길동' }),
  patient({ id: 'b', roomBed: '102', name: '이영희' }),
  patient({ id: 'c', roomBed: '301', name: '박민수' }),
];

function renderBoard(overrides: Partial<Parameters<typeof RoundingBoard>[0]> = {}) {
  const props = {
    patients,
    briefing: briefing(),
    onWardChange: vi.fn(),
    onOpenPatient: vi.fn(),
    ...overrides,
  };
  render(<RoundingBoard {...props} />);
  return props;
}

describe('RoundingBoard', () => {
  it('shows one tab per ward and opens the first ward by default', () => {
    renderBoard();

    expect(screen.getByRole('button', { name: /1병동/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3병동/ })).toBeInTheDocument();
    // 1병동 환자만 보이고, 3병동 환자는 아직 안 보인다
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('이영희')).toBeInTheDocument();
    expect(screen.queryByText('박민수')).not.toBeInTheDocument();
  });

  it('groups patients under their room heading', () => {
    renderBoard();
    expect(screen.getByRole('heading', { name: '101호' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '102호' })).toBeInTheDocument();
  });

  it('shows badges with their numbers', () => {
    renderBoard({
      briefing: briefing({
        recentLabs: [
          {
            patientId: 'a',
            patientName: '홍길동',
            roomBed: '101-1',
            dateKey: '2026-09-20',
            abnormalCount: 3,
            abnormalItems: ['Na L', 'K H', 'CRP H'],
            totalItems: 20,
          },
        ],
        antibiotics: [
          {
            patientId: 'a',
            patientName: '홍길동',
            roomBed: '101-1',
            medicationId: 'm1',
            drugName: '세프트리악손주 2g',
            dDay: 7,
            isLongTerm: false,
            startDate: new Date('2026-09-14'),
          },
        ],
      }),
    });

    expect(screen.getByText('Lab 3')).toBeInTheDocument();
    expect(screen.getByText('세프트리악손주 D+7')).toBeInTheDocument();
  });

  it('shows an unresolved threshold breach with its value', () => {
    renderBoard({
      breaches: [
        {
          patientId: 'a',
          ruleId: 'r1',
          ruleName: '저나트륨혈증 (Na < 130)',
          severity: 'critical' as const,
          itemName: 'Na',
          value: 118,
          unit: 'mmol/L',
          hlFlag: 'L' as const,
          direction: 'low' as const,
          testDate: new Date('2026-09-19'),
          since: new Date('2026-09-17'),
          streak: 3,
        },
      ],
    });

    expect(screen.getByText('Na 118↓')).toBeInTheDocument();
  });

  it('switches ward through the callback', async () => {
    const props = renderBoard();
    await userEvent.click(screen.getByRole('button', { name: /3병동/ }));
    expect(props.onWardChange).toHaveBeenCalledWith('3');
  });

  it('renders the ward it is told to show', () => {
    renderBoard({ activeWard: '3' });
    expect(screen.getByText('박민수')).toBeInTheDocument();
    expect(screen.queryByText('홍길동')).not.toBeInTheDocument();
  });

  it('opens the patient workspace on tap', async () => {
    const props = renderBoard();
    await userEvent.click(screen.getByText('홍길동'));
    expect(props.onOpenPatient).toHaveBeenCalledWith('a');
  });

  it('says so when there is nobody to round on', () => {
    renderBoard({ patients: [] });
    expect(screen.getByText('회진할 환자가 없습니다.')).toBeInTheDocument();
  });
});
