import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Patient } from '@/types/patient';

const service = vi.hoisted(() => ({ fetchDayScopedNotes: vi.fn() }));
vi.mock('@/services/briefingService', () => ({
  fetchDayScopedNotes: service.fetchDayScopedNotes,
}));

const { useRailBasisDate } = await import('./useRailBasisDate');

const patients = [
  { id: 'p1', name: '홍길동', status: 'active' } as Patient,
  { id: 'p2', name: '이영희', status: 'active' } as Patient,
  { id: 'gone', name: '퇴원함', status: 'discharged' } as Patient,
];

const todayIndicators = { p1: { note: true, antibiotic: true } };

function yesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
}

describe('useRailBasisDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.fetchDayScopedNotes.mockResolvedValue({
      reminders: [],
      progressNotes: [{ patientId: 'p2' }],
      schedules: [],
    });
  });

  it('uses the briefing indicators for today without asking the server', () => {
    const hook = renderHook(() => useRailBasisDate({ patients, todayIndicators }));

    expect(hook.result.current.indicators).toBe(todayIndicators);
    expect(hook.result.current.basisDate).toBeNull();
    expect(service.fetchDayScopedNotes).not.toHaveBeenCalled();
  });

  it('loads that day notes when the basis moves', async () => {
    const hook = renderHook(() => useRailBasisDate({ patients, todayIndicators }));

    act(() => hook.result.current.setBasisDate(yesterday()));

    await waitFor(() => expect(hook.result.current.indicators).toEqual({ p2: { note: true } }));
    // 활성 환자만, 퇴원 환자는 빼고 조회한다
    expect(service.fetchDayScopedNotes).toHaveBeenCalledWith(['p1', 'p2'], expect.any(Date));
  });

  it('treats picking today as going back to the default', async () => {
    const hook = renderHook(() => useRailBasisDate({ patients, todayIndicators }));

    act(() => hook.result.current.setBasisDate(yesterday()));
    await waitFor(() => expect(hook.result.current.basisDate).not.toBeNull());

    act(() => hook.result.current.setBasisDate(new Date()));

    expect(hook.result.current.basisDate).toBeNull();
    expect(hook.result.current.indicators).toBe(todayIndicators);
  });

  it('surfaces a failure instead of showing a wrong list', async () => {
    service.fetchDayScopedNotes.mockRejectedValue(new Error('network down'));
    const hook = renderHook(() => useRailBasisDate({ patients, todayIndicators }));

    act(() => hook.result.current.setBasisDate(yesterday()));

    await waitFor(() => expect(hook.result.current.error).toBeTruthy());
    expect(hook.result.current.indicators).toEqual({});
  });

  it('ignores a slow answer that was overtaken by a newer one', async () => {
    const slow = new Promise((resolve) =>
      setTimeout(() => resolve({ reminders: [], progressNotes: [{ patientId: 'p1' }], schedules: [] }), 30)
    );
    service.fetchDayScopedNotes.mockReturnValueOnce(slow).mockResolvedValueOnce({
      reminders: [],
      progressNotes: [{ patientId: 'p2' }],
      schedules: [],
    });

    const hook = renderHook(() => useRailBasisDate({ patients, todayIndicators }));

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    act(() => hook.result.current.setBasisDate(twoDaysAgo));
    act(() => hook.result.current.setBasisDate(yesterday()));

    await waitFor(() => expect(hook.result.current.indicators).toEqual({ p2: { note: true } }));
    // 느린 첫 응답이 나중에 도착해도 덮어쓰지 않는다
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(hook.result.current.indicators).toEqual({ p2: { note: true } });
  });
});
