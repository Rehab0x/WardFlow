import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientWorkspace } from './PatientWorkspace';
import { emptyBriefingData } from '@/features/app/optimisticBriefing';
import type { Patient } from '@/types/patient';

const make = (id: string, name: string): Patient => ({
  id,
  registrationNumber: '4532',
  name,
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
  presentIllness: 'pi',
  pastHistory: '',
  reviewOfSystem: '',
  physicalExam: '',
  problemList: ['pneumonia'],
  plan: 'abx',
  guardianExplanation: '',
  etc: '',
  createdAt: new Date(2026, 8, 1),
  updatedAt: new Date(2026, 8, 1),
});

const unsavedMark = () => screen.queryByLabelText('미저장 변경');

/**
 * 미저장 플래그는 "현재 마운트된 탭"의 것이다.
 * 탭/환자가 바뀌면 이전 상태가 남아서는 안 된다 —
 * 남으면 아무것도 고치지 않은 요약 탭에서도 이동 확인창이 뜬다.
 */
describe('workspace unsaved state', () => {
  it('is clean on a freshly opened patient', () => {
    const onUnsavedChange = vi.fn();
    render(
      <PatientWorkspace
        patient={make('p1', '김환자')}
        data={emptyBriefingData}
        onUnsavedChange={onUnsavedChange}
      />
    );

    expect(unsavedMark()).toBeNull();
    expect(onUnsavedChange).not.toHaveBeenCalledWith(true);
  });

  it('flags an actual edit in the current tab', async () => {
    const user = userEvent.setup();
    const onUnsavedChange = vi.fn();
    render(
      <PatientWorkspace
        patient={make('p1', '김환자')}
        data={emptyBriefingData}
        initialTab="charting"
        onUnsavedChange={onUnsavedChange}
      />
    );

    await user.type(screen.getByLabelText('Plan'), ' 추가');

    expect(unsavedMark()).not.toBeNull();
    expect(onUnsavedChange).toHaveBeenLastCalledWith(true);
  });

  it('asks before leaving a tab that has a real edit', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <PatientWorkspace patient={make('p1', '김환자')} data={emptyBriefingData} initialTab="charting" />
    );

    await user.type(screen.getByLabelText('Plan'), ' 추가');
    await user.click(screen.getByRole('button', { name: /^요약/ }));

    expect(confirmSpy).toHaveBeenCalledWith('저장하지 않은 변경이 있습니다. 이동할까요?');
    expect(screen.getByLabelText('Plan')).toBeInTheDocument(); // 취소했으므로 그대로
    confirmSpy.mockRestore();
  });

  it('does not carry the flag over to another patient', async () => {
    const user = userEvent.setup();
    const onUnsavedChange = vi.fn();
    const { rerender } = render(
      <PatientWorkspace
        patient={make('p1', '김환자')}
        data={emptyBriefingData}
        initialTab="charting"
        onUnsavedChange={onUnsavedChange}
      />
    );
    await user.type(screen.getByLabelText('Plan'), ' 추가');
    expect(onUnsavedChange).toHaveBeenLastCalledWith(true);

    // AppPage는 환자를 바꿔도 같은 PatientWorkspace를 재사용하고 탭만 요약으로 되돌린다
    rerender(
      <PatientWorkspace
        patient={make('p2', '이환자')}
        data={emptyBriefingData}
        initialTab="overview"
        onUnsavedChange={onUnsavedChange}
      />
    );

    expect(unsavedMark()).toBeNull();
    expect(onUnsavedChange).toHaveBeenLastCalledWith(false);
  });

  it('does not carry the flag over when the tab changes from outside', async () => {
    const user = userEvent.setup();
    const onUnsavedChange = vi.fn();
    const patient = make('p1', '김환자');
    const { rerender } = render(
      <PatientWorkspace
        patient={patient}
        data={emptyBriefingData}
        initialTab="charting"
        onUnsavedChange={onUnsavedChange}
      />
    );
    await user.type(screen.getByLabelText('Plan'), ' 추가');

    // Today 큐/딥링크는 handleTabChange를 거치지 않고 initialTab만 바꾼다
    rerender(
      <PatientWorkspace
        patient={patient}
        data={emptyBriefingData}
        initialTab="overview"
        onUnsavedChange={onUnsavedChange}
      />
    );

    expect(unsavedMark()).toBeNull();
    expect(onUnsavedChange).toHaveBeenLastCalledWith(false);
  });

  it('clears the flag when a quick-entry tab is left', async () => {
    const user = userEvent.setup();
    const onUnsavedChange = vi.fn();
    render(
      <PatientWorkspace
        patient={make('p1', '김환자')}
        data={emptyBriefingData}
        initialTab="notes"
        onUnsavedChange={onUnsavedChange}
      />
    );

    await user.type(screen.getByPlaceholderText('빠른 메모 입력'), '메모');
    expect(onUnsavedChange).toHaveBeenLastCalledWith(true);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /^요약/ }));

    expect(unsavedMark()).toBeNull();
    expect(onUnsavedChange).toHaveBeenLastCalledWith(false);
    vi.mocked(window.confirm).mockRestore();
  });
});
