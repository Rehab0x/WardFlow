import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Patient } from '@/types/patient';
import type { Medication } from '@/types/medication';

const stt = vi.hoisted(() => ({ startRecording: vi.fn(), transcribeAudio: vi.fn() }));
const ai = vi.hoisted(() => ({ parseVoiceQuery: vi.fn() }));
const labs = vi.hoisted(() => ({ getLabTrendData: vi.fn() }));
const meds = vi.hoisted(() => ({ fetchMedicationsByPatient: vi.fn(), medications: [] as Medication[] }));

vi.mock('@/services/sttService', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/services/sttService');
  return { ...actual, startRecording: stt.startRecording, transcribeAudio: stt.transcribeAudio };
});
vi.mock('@/services/aiService', () => ({ parseVoiceQuery: ai.parseVoiceQuery }));

const patient = { id: 'p1', name: '이몽룡', status: 'active' } as Patient;
const discharged = { id: 'p2', name: '퇴원환자', status: 'discharged' } as Patient;

vi.mock('@/stores/usePatientStore', () => ({
  usePatientStore: (selector: (s: unknown) => unknown) =>
    selector({ patients: [patient, discharged] }),
}));
vi.mock('@/stores/useLabStore', () => ({
  useLabStore: Object.assign((selector: (s: unknown) => unknown) => selector(labs), {
    getState: () => labs,
  }),
}));
vi.mock('@/stores/useMedicationStore', () => ({
  useMedicationStore: Object.assign((selector: (s: unknown) => unknown) => selector(meds), {
    getState: () => meds,
  }),
}));

const { useVoiceQuery } = await import('./useVoiceQuery');

const recorder = { stop: vi.fn(), cancel: vi.fn() };

describe('useVoiceQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recorder.stop.mockResolvedValue(new Blob(['audio']));
    stt.startRecording.mockResolvedValue(recorder);
    stt.transcribeAudio.mockResolvedValue('이몽룡 소듐 요즘 어땠지');
    meds.medications = [];
  });

  async function run(hook: ReturnType<typeof renderHook<ReturnType<typeof useVoiceQuery>, unknown>>) {
    await act(async () => {
      await hook.result.current.start();
    });
    await act(async () => {
      await hook.result.current.stopAndAnswer();
    });
  }

  it('answers a lab question with a trend and a summary line', async () => {
    ai.parseVoiceQuery.mockResolvedValue({ patientName: '이몽룡', queryType: 'lab', item: 'Na' });
    labs.getLabTrendData.mockResolvedValue({
      itemCode: '',
      itemName: 'Na',
      unit: 'mmol/L',
      dataPoints: [
        { date: '2026-09-17', value: 130, hlFlag: 'L' },
        { date: '2026-09-19', value: 134, hlFlag: 'L' },
      ],
    });

    const hook = renderHook(() => useVoiceQuery());
    await run(hook);

    await waitFor(() => expect(hook.result.current.state.stage).toBe('done'));
    const answer = hook.result.current.state.answer!;
    expect(answer.headline).toContain('이몽룡');
    expect(answer.headline).toContain('134');
    expect(answer.headline).toContain('이전 대비 +4');
    expect(answer.trend?.dataPoints).toHaveLength(2);
    expect(answer.lines[0]).toContain('2026-09-19');
  });

  it('only offers active patients to the parser', async () => {
    ai.parseVoiceQuery.mockResolvedValue({ patientName: '이몽룡', queryType: 'lab', item: 'Na' });
    labs.getLabTrendData.mockResolvedValue(null);

    const hook = renderHook(() => useVoiceQuery());
    await run(hook);

    expect(ai.parseVoiceQuery).toHaveBeenCalledWith('이몽룡 소듐 요즘 어땠지', ['이몽룡']);
  });

  it('reports a missing lab result instead of failing', async () => {
    ai.parseVoiceQuery.mockResolvedValue({ patientName: '이몽룡', queryType: 'lab', item: 'Na' });
    labs.getLabTrendData.mockResolvedValue(null);

    const hook = renderHook(() => useVoiceQuery());
    await run(hook);

    await waitFor(() => expect(hook.result.current.state.stage).toBe('done'));
    expect(hook.result.current.state.answer?.headline).toContain('결과가 없습니다');
  });

  it('answers a medication question from the store', async () => {
    ai.parseVoiceQuery.mockResolvedValue({
      patientName: '이몽룡',
      queryType: 'medication',
      item: null,
    });
    meds.medications = [
      {
        id: 'm1',
        patientId: 'p1',
        category: 'antibiotic',
        drugName: 'Meropenem',
        dosage: '1g',
        frequency: '#3',
        isActive: true,
        startDate: new Date(2026, 8, 15),
      } as Medication,
      { id: 'm2', patientId: 'p1', category: 'hospital', drugName: '아스피린', isActive: false } as Medication,
    ];

    const hook = renderHook(() => useVoiceQuery());
    await run(hook);

    await waitFor(() => expect(hook.result.current.state.stage).toBe('done'));
    expect(meds.fetchMedicationsByPatient).toHaveBeenCalledWith('p1');
    const answer = hook.result.current.state.answer!;
    expect(answer.headline).toContain('현재 투약 1건');
    expect(answer.lines[0]).toContain('Meropenem');
    expect(answer.lines.join('\n')).not.toContain('아스피린'); // isActive=false는 제외
  });

  it('explains when the patient could not be identified', async () => {
    ai.parseVoiceQuery.mockResolvedValue({ patientName: null, queryType: 'lab', item: 'Na' });

    const hook = renderHook(() => useVoiceQuery());
    await run(hook);

    await waitFor(() => expect(hook.result.current.state.stage).toBe('error'));
    expect(hook.result.current.state.error).toContain('환자를 특정할 수 없습니다');
  });

  it('explains when the question type was not understood', async () => {
    ai.parseVoiceQuery.mockResolvedValue({
      patientName: '이몽룡',
      queryType: 'unknown',
      item: null,
    });

    const hook = renderHook(() => useVoiceQuery());
    await run(hook);

    await waitFor(() => expect(hook.result.current.state.stage).toBe('error'));
    expect(hook.result.current.state.error).toContain('이해하지 못했습니다');
  });

  it('surfaces transcription failures without losing the flow', async () => {
    stt.transcribeAudio.mockRejectedValue(new Error('마이크 권한이 필요합니다.'));

    const hook = renderHook(() => useVoiceQuery());
    await run(hook);

    await waitFor(() => expect(hook.result.current.state.stage).toBe('error'));
    expect(hook.result.current.state.error).toContain('마이크 권한');
    expect(ai.parseVoiceQuery).not.toHaveBeenCalled();
  });

  it('drops the transcript on reset so nothing is retained', async () => {
    ai.parseVoiceQuery.mockResolvedValue({ patientName: '이몽룡', queryType: 'lab', item: 'Na' });
    labs.getLabTrendData.mockResolvedValue(null);

    const hook = renderHook(() => useVoiceQuery());
    await run(hook);
    await waitFor(() => expect(hook.result.current.state.transcript).not.toBe(''));

    act(() => hook.result.current.reset());

    expect(hook.result.current.state).toMatchObject({
      stage: 'idle',
      transcript: '',
      parsed: null,
      answer: null,
    });
  });

  it('releases the microphone when cancelled mid-recording', async () => {
    const hook = renderHook(() => useVoiceQuery());
    await act(async () => {
      await hook.result.current.start();
    });

    act(() => hook.result.current.cancel());

    expect(recorder.cancel).toHaveBeenCalled();
    expect(hook.result.current.state.stage).toBe('idle');
  });
});
