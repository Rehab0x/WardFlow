import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Patient } from '@/types/patient';
import { PatientRail } from './PatientRail';

function patient(overrides: Partial<Patient> & { id: string; name: string }): Patient {
  return {
    roomBed: '101',
    birthDate: new Date('1970-01-01'),
    sex: 'M',
    status: 'active',
    patientType: 'admitted',
    registrationNumber: '',
    chiefComplaint: '',
    ...overrides,
  } as Patient;
}

const patients = [
  patient({ id: 'p1', name: '김부경', roomBed: '101' }),
  patient({ id: 'p2', name: '이영희', roomBed: '102' }),
  patient({ id: 'p3', name: '박민수', roomBed: '103', attention: true }),
];

function renderRail(indicators: Record<string, { note?: boolean; reminder?: boolean }> = {}) {
  render(
    <PatientRail patients={patients} patientIndicators={indicators} onPatientSelect={vi.fn()} />
  );
}

describe('PatientRail 메모 필터', () => {
  it('counts patients who already have a note today', () => {
    renderRail({ p1: { note: true }, p2: { note: true } });
    expect(screen.getByRole('button', { name: /메모 2/ })).toBeInTheDocument();
  });

  it('narrows the list to patients with a note today', async () => {
    renderRail({ p1: { note: true } });

    await userEvent.click(screen.getByRole('button', { name: /^메모 \d/ }));

    expect(screen.getByText('김부경')).toBeInTheDocument();
    expect(screen.queryByText('이영희')).not.toBeInTheDocument();
    expect(screen.queryByText('박민수')).not.toBeInTheDocument();
  });

  it('shows everyone again after resetting', async () => {
    renderRail({ p1: { note: true } });

    await userEvent.click(screen.getByRole('button', { name: /^메모 \d/ }));
    await userEvent.click(screen.getByRole('button', { name: '초기화' }));

    expect(screen.getByText('이영희')).toBeInTheDocument();
  });

  it('keeps the note flag out of the 할 일 count', async () => {
    // 메모는 "이미 한 일"이라 할 일에 섞이면 안 된다
    renderRail({ p1: { note: true }, p2: { reminder: true } });
    expect(screen.getByRole('button', { name: /할 일 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /메모 1/ })).toBeInTheDocument();
  });

  it('marks the row itself so it is visible in the 전체 list too', () => {
    renderRail({ p1: { note: true } });
    expect(screen.getByLabelText(/101 김부경.*오늘 메모/)).toBeInTheDocument();
  });
});
