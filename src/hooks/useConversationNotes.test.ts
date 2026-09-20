import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Patient } from '@/types/patient';

const ai = vi.hoisted(() => ({ segmentConversation: vi.fn() }));
const stt = vi.hoisted(() => ({ startRecording: vi.fn(), transcribeAudio: vi.fn() }));

vi.mock('@/services/aiService', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/services/aiService');
  return { ...actual, segmentConversation: ai.segmentConversation };
});
vi.mock('@/services/sttService', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/services/sttService');
  return { ...actual, startRecording: stt.startRecording, transcribeAudio: stt.transcribeAudio };
});

const kim = { id: 'p1', name: '김철수', roomBed: '302', status: 'active' } as Patient;
const lee = { id: 'p2', name: '이영희', roomBed: '305', status: 'active' } as Patient;
const gone = { id: 'p3', name: '퇴원환자', roomBed: '-', status: 'discharged' } as Patient;

vi.mock('@/stores/usePatientStore', () => ({
  usePatientStore: (selector: (s: unknown) => unknown) => selector({ patients: [kim, lee, gone] }),
}));

const { useConversationNotes } = await import('./useConversationNotes');

const recorder = { stop: vi.fn(), cancel: vi.fn() };

describe('useConversationNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recorder.stop.mockResolvedValue(new Blob(['audio']));
    stt.startRecording.mockResolvedValue(recorder);
    stt.transcribeAudio.mockResolvedValue('김철수님 열나고 이영희님 소변량 감소');
    ai.segmentConversation.mockResolvedValue([
      { patientName: '김철수', excerpt: '열', subjective: '열감', objective: 'BT 38.2', assessment: '', plan: '타이레놀' },
      { patientName: '이영희', excerpt: '소변', subjective: '', objective: '소변량 감소', assessment: '', plan: '확인 요망' },
    ]);
  });

  it('analyses typed input without needing the microphone', async () => {
    const hook = renderHook(() => useConversationNotes());

    await act(async () => {
      await hook.result.current.analyze('  김철수님 열나고 이영희님 소변량 감소  ');
    });

    await waitFor(() => expect(hook.result.current.state.stage).toBe('review'));
    expect(stt.startRecording).not.toHaveBeenCalled();
    expect(stt.transcribeAudio).not.toHaveBeenCalled();
    // 앞뒤 공백은 정리되어 넘어간다
    expect(ai.segmentConversation).toHaveBeenCalledWith(
      '김철수님 열나고 이영희님 소변량 감소',
      ['김철수', '이영희']
    );
    expect(hook.result.current.state.drafts).toHaveLength(2);
  });

  it('matches drafts to patients and preselects only the matched ones', async () => {
    ai.segmentConversation.mockResolvedValue([
      { patientName: '김철수', excerpt: '', subjective: '열감', objective: '', assessment: '', plan: '' },
      { patientName: null, excerpt: '누군가', subjective: '통증', objective: '', assessment: '', plan: '' },
    ]);
    const hook = renderHook(() => useConversationNotes());

    await act(async () => {
      await hook.result.current.analyze('대화');
    });

    const [matched, unmatched] = hook.result.current.state.drafts;
    expect(matched).toMatchObject({ patientId: 'p1', selected: true });
    // 환자를 특정하지 못한 조각은 사용자가 직접 고르도록 선택 해제 상태로 둔다
    expect(unmatched).toMatchObject({ patientId: undefined, selected: false });
  });

  it('rejects empty input', async () => {
    const hook = renderHook(() => useConversationNotes());
    await act(async () => {
      await hook.result.current.analyze('   ');
    });
    expect(hook.result.current.state.stage).toBe('error');
    expect(ai.segmentConversation).not.toHaveBeenCalled();
  });

  it('explains when nothing could be segmented', async () => {
    ai.segmentConversation.mockResolvedValue([]);
    const hook = renderHook(() => useConversationNotes());

    await act(async () => {
      await hook.result.current.analyze('의미 없는 잡담');
    });

    expect(hook.result.current.state.stage).toBe('error');
    expect(hook.result.current.state.error).toContain('찾지 못했습니다');
  });

  it('goes through transcription when recording is used', async () => {
    const hook = renderHook(() => useConversationNotes());

    await act(async () => {
      await hook.result.current.startRecordingInput();
    });
    expect(hook.result.current.state.stage).toBe('recording');

    await act(async () => {
      await hook.result.current.stopRecordingAndAnalyze();
    });

    await waitFor(() => expect(hook.result.current.state.stage).toBe('review'));
    expect(stt.transcribeAudio).toHaveBeenCalled();
  });

  it('saves only the selected drafts and marks them saved', async () => {
    const addNote = vi.fn().mockResolvedValue(undefined);
    const hook = renderHook(() => useConversationNotes());
    await act(async () => {
      await hook.result.current.analyze('대화');
    });

    act(() => hook.result.current.updateDraft(1, { selected: false }));

    let saved = 0;
    await act(async () => {
      saved = await hook.result.current.saveSelected(addNote);
    });

    expect(saved).toBe(1);
    expect(addNote).toHaveBeenCalledTimes(1);
    expect(addNote).toHaveBeenCalledWith('p1', 'S) 열감\nO) BT 38.2\nP) 타이레놀');
    expect(hook.result.current.state.drafts[0]?.saved).toBe(true);
    expect(hook.result.current.state.drafts[1]?.saved).toBe(false);
  });

  it('records a per-draft error when one save fails', async () => {
    const addNote = vi
      .fn()
      .mockRejectedValueOnce(new Error('권한이 없습니다.'))
      .mockResolvedValueOnce(undefined);
    const hook = renderHook(() => useConversationNotes());
    await act(async () => {
      await hook.result.current.analyze('대화');
    });

    let saved = 0;
    await act(async () => {
      saved = await hook.result.current.saveSelected(addNote);
    });

    expect(saved).toBe(1);
    expect(hook.result.current.state.drafts[0]).toMatchObject({
      saved: false,
      saveError: '권한이 없습니다.',
    });
    expect(hook.result.current.state.drafts[1]?.saved).toBe(true);
  });

  it('does not save the same draft twice', async () => {
    const addNote = vi.fn().mockResolvedValue(undefined);
    const hook = renderHook(() => useConversationNotes());
    await act(async () => {
      await hook.result.current.analyze('대화');
    });

    await act(async () => {
      await hook.result.current.saveSelected(addNote);
    });
    await act(async () => {
      await hook.result.current.saveSelected(addNote);
    });

    expect(addNote).toHaveBeenCalledTimes(2); // 첫 번째 호출에서 2건, 두 번째는 0건
  });

  it('drops the transcript on reset', async () => {
    const hook = renderHook(() => useConversationNotes());
    await act(async () => {
      await hook.result.current.analyze('대화 원문');
    });
    expect(hook.result.current.state.transcript).toBe('대화 원문');

    act(() => hook.result.current.reset());

    expect(hook.result.current.state).toMatchObject({ stage: 'idle', transcript: '', drafts: [] });
  });
});
