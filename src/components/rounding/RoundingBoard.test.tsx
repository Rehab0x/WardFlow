import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Patient } from '@/types/patient';
import { RoundingBoard } from './RoundingBoard';

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
  patient({ id: 'a', roomBed: '101-1', name: '김부경' }),
  patient({ id: 'b', roomBed: '102', name: '이영희' }),
  patient({ id: 'c', roomBed: '301', name: '박민수' }),
];

function renderBoard(overrides: Partial<Parameters<typeof RoundingBoard>[0]> = {}) {
  const props = {
    patients,
    patientIndicators: { a: { reminder: true } },
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
    expect(screen.getByText('김부경')).toBeInTheDocument();
    expect(screen.getByText('이영희')).toBeInTheDocument();
    expect(screen.queryByText('박민수')).not.toBeInTheDocument();
  });

  it('groups patients under their room heading', () => {
    renderBoard();
    expect(screen.getByRole('heading', { name: '101호' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '102호' })).toBeInTheDocument();
  });

  it('shows flags as readable labels', () => {
    renderBoard({ patientIndicators: { a: { reminder: true, antibiotic: true } } });
    expect(screen.getByText('알림')).toBeInTheDocument();
    expect(screen.getByText('항생제')).toBeInTheDocument();
  });

  it('switches ward through the callback', async () => {
    const props = renderBoard();
    await userEvent.click(screen.getByRole('button', { name: /3병동/ }));
    expect(props.onWardChange).toHaveBeenCalledWith('3');
  });

  it('renders the ward it is told to show', () => {
    renderBoard({ activeWard: '3' });
    expect(screen.getByText('박민수')).toBeInTheDocument();
    expect(screen.queryByText('김부경')).not.toBeInTheDocument();
  });

  it('opens the patient workspace on tap', async () => {
    const props = renderBoard();
    await userEvent.click(screen.getByText('김부경'));
    expect(props.onOpenPatient).toHaveBeenCalledWith('a');
  });

  it('says so when there is nobody to round on', () => {
    renderBoard({ patients: [] });
    expect(screen.getByText('회진할 환자가 없습니다.')).toBeInTheDocument();
  });
});
