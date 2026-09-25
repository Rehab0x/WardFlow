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
  patient({ id: 'p1', name: '홍길동', roomBed: '101' }),
  patient({ id: 'p2', name: '이영희', roomBed: '102' }),
  patient({ id: 'p3', name: '박민수', roomBed: '103', attention: true }),
];

function renderRail(
  indicators: Record<string, { note?: boolean; reminder?: boolean }> = {},
  extra: Partial<Parameters<typeof PatientRail>[0]> = {}
) {
  render(
    <PatientRail
      patients={patients}
      patientIndicators={indicators}
      onPatientSelect={vi.fn()}
      {...extra}
    />
  );
}

function dateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

describe('PatientRail 메모 필터', () => {
  it('counts patients who already have a note today', () => {
    renderRail({ p1: { note: true }, p2: { note: true } });
    expect(screen.getByRole('button', { name: /메모 2/ })).toBeInTheDocument();
  });

  it('narrows the list to patients with a note today', async () => {
    renderRail({ p1: { note: true } });

    await userEvent.click(screen.getByRole('button', { name: /^메모 \d/ }));

    expect(screen.getByText('홍길동')).toBeInTheDocument();
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
    expect(screen.getByLabelText(/101 홍길동.*오늘 메모/)).toBeInTheDocument();
  });

});

describe('PatientRail 기준일', () => {
  it('is hidden unless the page can handle a date change', () => {
    renderRail();
    expect(screen.queryByLabelText('기준일')).not.toBeInTheDocument();
  });

  it('starts on today and steps back a day', async () => {
    const onBasisDateChange = vi.fn();
    renderRail({}, { onBasisDateChange });

    const today = new Date();
    expect(screen.getByLabelText('기준일')).toHaveValue(dateInputValue(today));

    await userEvent.click(screen.getByRole('button', { name: '하루 전' }));

    const asked = onBasisDateChange.mock.calls[0]![0] as Date;
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    expect(dateInputValue(asked)).toBe(dateInputValue(yesterday));
  });

  it('explains what the shifted basis covers and offers a way back', async () => {
    const onBasisDateChange = vi.fn();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    renderRail({}, { basisDate: yesterday, onBasisDateChange });

    expect(screen.getByText(/메모·알림·일정 기준/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '오늘' }));
    expect(onBasisDateChange).toHaveBeenCalledWith(null);
  });

  it('shows loading and error in place of the hint', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { unmount } = render(
      <PatientRail
        patients={patients}
        onPatientSelect={vi.fn()}
        basisDate={yesterday}
        basisLoading
        onBasisDateChange={vi.fn()}
      />
    );
    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();
    unmount();

    renderRail({}, { basisDate: yesterday, basisError: '불러오지 못했습니다.', onBasisDateChange: vi.fn() });
    expect(screen.getByText('불러오지 못했습니다.')).toBeInTheDocument();
  });

  it('filters by the indicators it is given, whatever date they came from', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // 어제 기준으로 받아 온 인디케이터
    renderRail({ p2: { note: true } }, { basisDate: yesterday, onBasisDateChange: vi.fn() });

    await userEvent.click(screen.getByRole('button', { name: /^메모 \d/ }));

    expect(screen.getByText('이영희')).toBeInTheDocument();
    expect(screen.queryByText('홍길동')).not.toBeInTheDocument();
  });
});

describe('PatientRail 퇴원 그룹', () => {
  const withDischarged = [
    ...patients,
    patient({ id: 'p4', name: '김퇴원', status: 'discharged', dischargeDate: new Date('2026-09-20') }),
  ];

  it('keeps the discharged toggle pinned to the bottom of the list', () => {
    renderRail({}, { patients: withDischarged });
    const toggle = screen.getByRole('button', { name: /퇴원/ });
    expect(toggle.parentElement).toHaveClass('sticky', 'bottom-0');
    expect(screen.queryByText('김퇴원')).not.toBeInTheDocument();
  });

  it('opens the discharged list and scrolls it into view', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderRail({}, { patients: withDischarged });

    await userEvent.click(screen.getByRole('button', { name: /퇴원/ }));

    expect(screen.getByText('김퇴원')).toBeInTheDocument();
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
  });
});
