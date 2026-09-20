import { useCallback, useRef, useState } from 'react';
import {
  formatSegmentAsNote,
  segmentConversation,
  type ConversationSegment,
} from '@/services/aiService';
import { SttError, startRecording, transcribeAudio, type VoiceRecorder } from '@/services/sttService';
import { useAIStore } from '@/stores/useAIStore';
import { usePatientStore } from '@/stores/usePatientStore';

export type ConversationStage =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'segmenting'
  | 'review'
  | 'error';

/** 검토 화면에서 사용자가 고치고 고를 수 있는 형태 */
export interface ConversationDraft extends ConversationSegment {
  /** 매칭된 환자 id. 특정 못 했으면 undefined */
  patientId?: string;
  /**
   * 저장 대상으로 선택됐는지.
   * 철자가 정확히 맞은 조각만 기본 선택이다 — 발음으로 이어 붙인 조각(`nameMatch: 'similar'`)과
   * 특정 못 한 조각은 사람이 확인하고 체크해야 한다 (환자 오배정은 되돌리기 어렵다).
   */
  selected: boolean;
  saved: boolean;
  saveError?: string;
}

export interface ConversationState {
  stage: ConversationStage;
  /** 녹음 또는 직접 입력으로 확보한 대화 원문 */
  transcript: string;
  drafts: ConversationDraft[];
  error: string | null;
}

const initialState: ConversationState = {
  stage: 'idle',
  transcript: '',
  drafts: [],
  error: null,
};

/**
 * 간호사 대화(구두 보고·전화 인계)를 환자별 SOAP 초안으로 나누는 플로우.
 *
 * 입력은 두 가지를 **동등하게** 지원한다.
 *  - 녹음: Whisper STT (마이크를 쓸 수 있을 때)
 *  - 직접 입력: 전화 통화처럼 녹음이 어려울 때 받아 적은 내용을 그대로 넣는다
 * 직접 입력 경로는 Whisper 키가 없어도 동작한다 — 텍스트 LLM 키만 있으면 된다.
 *
 * 음성과 대화 원문은 저장하지 않는다. 사용자가 고른 SOAP 초안만 메모로 저장된다.
 */
export function useConversationNotes() {
  const [state, setState] = useState<ConversationState>(initialState);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const patients = usePatientStore((store) => store.patients);

  const reset = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setState(initialState);
  }, []);

  const startRecordingInput = useCallback(async () => {
    if (recorderRef.current) return;
    setState({ ...initialState, stage: 'recording' });
    try {
      recorderRef.current = await startRecording();
    } catch (error) {
      recorderRef.current = null;
      setState({ ...initialState, stage: 'error', error: toMessage(error) });
    }
  }, []);

  const cancelRecording = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setState(initialState);
  }, []);

  const analyze = useCallback(
    async (transcript: string) => {
      const text = transcript.trim();
      if (!text) {
        setState((current) => ({
          ...current,
          stage: 'error',
          error: '대화 내용이 비어 있습니다.',
        }));
        return;
      }

      setState((current) => ({ ...current, stage: 'segmenting', transcript: text, error: null }));

      try {
        const activePatients = patients.filter((patient) => patient.status === 'active');
        const segments = await segmentConversation(
          text,
          activePatients.map((patient) => patient.name)
        );

        if (segments.length === 0) {
          setState((current) => ({
            ...current,
            stage: 'error',
            error: '대화에서 환자별 기록을 찾지 못했습니다. 내용을 확인해주세요.',
          }));
          return;
        }

        setState((current) => ({
          ...current,
          stage: 'review',
          drafts: segments.map((segment) => {
            const patient = activePatients.find((item) => item.name === segment.patientName);
            return {
              ...segment,
              patientId: patient?.id,
              // 특정하지 못했거나 발음으로만 이어 붙인 조각은 사용자가 확인하고 체크하게 둔다.
              selected: Boolean(patient) && segment.nameMatch !== 'similar',
              saved: false,
            };
          }),
        }));
      } catch (error) {
        setState((current) => ({ ...current, stage: 'error', error: toMessage(error) }));
      }
    },
    [patients]
  );

  /** 녹음을 끝내고 바로 분석까지 진행한다. */
  const stopRecordingAndAnalyze = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;

    try {
      setState((current) => ({ ...current, stage: 'transcribing' }));
      const transcript = await transcribeAudio(await recorder.stop());
      await analyze(transcript);
    } catch (error) {
      setState((current) => ({ ...current, stage: 'error', error: toMessage(error) }));
    }
  }, [analyze]);

  const updateDraft = useCallback((index: number, patch: Partial<ConversationDraft>) => {
    setState((current) => ({
      ...current,
      drafts: current.drafts.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)),
    }));
  }, []);

  /**
   * 선택된 초안을 메모로 저장한다.
   * @returns 저장에 성공한 개수
   */
  const saveSelected = useCallback(
    async (addNote: (patientId: string, content: string) => Promise<void>) => {
      const targets = state.drafts
        .map((draft, index) => ({ draft, index }))
        .filter(({ draft }) => draft.selected && !draft.saved && draft.patientId);

      let saved = 0;
      for (const { draft, index } of targets) {
        const content = formatSegmentAsNote(draft);
        if (!content) {
          updateDraft(index, { saveError: '저장할 내용이 없습니다.' });
          continue;
        }
        try {
          await addNote(draft.patientId!, content);
          updateDraft(index, { saved: true, saveError: undefined });
          saved++;
        } catch (error) {
          updateDraft(index, { saveError: toMessage(error) });
        }
      }
      return saved;
    },
    [state.drafts, updateDraft]
  );

  return {
    state,
    startRecordingInput,
    stopRecordingAndAnalyze,
    cancelRecording,
    analyze,
    updateDraft,
    saveSelected,
    reset,
  };
}

/** 텍스트 LLM 키만 있으면 직접 입력 경로는 쓸 수 있다. */
export function useConversationNotesReady(): boolean {
  return useAIStore((store) => store.isConfigured());
}

function toMessage(error: unknown): string {
  if (error instanceof SttError) return error.message;
  return error instanceof Error ? error.message : String(error);
}
