import { useCallback, useRef, useState } from 'react';
import { parseVoiceQuery, type ParsedVoiceQuery } from '@/services/aiService';
import { SttError, startRecording, transcribeAudio, type VoiceRecorder } from '@/services/sttService';
import { useAIStore } from '@/stores/useAIStore';
import { useLabStore } from '@/stores/useLabStore';
import { useMedicationStore } from '@/stores/useMedicationStore';
import { usePatientStore } from '@/stores/usePatientStore';
import type { LabTrendData } from '@/types/lab';
import type { Medication } from '@/types/medication';
import { formatDate } from '@/utils/dateUtils';

export type VoiceQueryStage =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'parsing'
  | 'loading'
  | 'done'
  | 'error';

export interface VoiceQueryAnswer {
  patientId: string;
  patientName: string;
  /** 화면에 그대로 보여줄 요약 문장 */
  headline: string;
  /** 표 형태로 보여줄 상세 줄 (투약 목록 등) */
  lines: string[];
  /** Lab 질의일 때만 채워진다 */
  trend?: LabTrendData;
}

export interface VoiceQueryState {
  stage: VoiceQueryStage;
  /** 변환된 질문. 답변을 보여주는 동안에만 유지하고 저장하지 않는다. */
  transcript: string;
  parsed: ParsedVoiceQuery | null;
  answer: VoiceQueryAnswer | null;
  error: string | null;
}

const initialState: VoiceQueryState = {
  stage: 'idle',
  transcript: '',
  parsed: null,
  answer: null,
  error: null,
};

/**
 * 회진 중 음성 질의 플로우 전체를 담당한다.
 * 녹음 → Whisper STT → LLM 구조화 → 기존 스토어 조회 → 답변.
 *
 * **원본 음성과 STT 텍스트는 저장하지 않는다.** 오디오 Blob은 변환 직후 참조를 버리고,
 * transcript는 이 훅의 state로만 들고 있다가 `reset()`에서 사라진다. DB에는 쓰지 않는다.
 */
export function useVoiceQuery() {
  const [state, setState] = useState<VoiceQueryState>(initialState);
  const recorderRef = useRef<VoiceRecorder | null>(null);

  const patients = usePatientStore((store) => store.patients);
  const getLabTrendData = useLabStore((store) => store.getLabTrendData);
  const fetchMedicationsByPatient = useMedicationStore((store) => store.fetchMedicationsByPatient);

  const reset = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setState(initialState);
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    setState({ ...initialState, stage: 'recording' });
    try {
      recorderRef.current = await startRecording();
    } catch (error) {
      recorderRef.current = null;
      setState({ ...initialState, stage: 'error', error: toMessage(error) });
    }
  }, []);

  const cancel = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setState(initialState);
  }, []);

  const stopAndAnswer = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;

    try {
      setState((current) => ({ ...current, stage: 'transcribing' }));
      // 오디오는 여기서만 존재하고, 변환 후 참조를 놓아 버린다.
      const transcript = await transcribeAudio(await recorder.stop());

      setState((current) => ({ ...current, stage: 'parsing', transcript }));
      const activePatients = patients.filter((patient) => patient.status === 'active');
      const parsed = await parseVoiceQuery(
        transcript,
        activePatients.map((patient) => patient.name)
      );

      setState((current) => ({ ...current, stage: 'loading', parsed }));

      const patient = parsed.patientName
        ? activePatients.find((item) => item.name === parsed.patientName)
        : undefined;
      if (!patient) {
        // 들린 이름을 그대로 돌려줘야 사용자가 왜 못 찾았는지 알 수 있다.
        throw new Error(
          parsed.heardName
            ? `"${parsed.heardName}"으로 들렸지만 담당 환자 명단에서 찾지 못했습니다.`
            : '환자를 특정할 수 없습니다. 환자 이름을 함께 말씀해주세요.'
        );
      }

      if (parsed.queryType === 'unknown') {
        throw new Error(
          'Lab 수치나 투약에 대한 질문으로 이해하지 못했습니다. 예: "김환자 소듐 요즘 어땠지?"'
        );
      }

      const answer =
        parsed.queryType === 'lab'
          ? await buildLabAnswer(patient.id, patient.name, parsed.item, getLabTrendData)
          : await buildMedicationAnswer(patient.id, patient.name, fetchMedicationsByPatient);

      setState({ stage: 'done', transcript, parsed, answer, error: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        stage: 'error',
        answer: null,
        error: toMessage(error),
      }));
    }
  }, [patients, getLabTrendData, fetchMedicationsByPatient]);

  return { state, start, stopAndAnswer, cancel, reset };
}

/** 설정이 끝났는지 — 마이크 버튼 노출 여부 판단에 쓴다. */
export function useVoiceQueryReady(): boolean {
  return useAIStore((store) => store.isConfigured() && store.isSttConfigured());
}

async function buildLabAnswer(
  patientId: string,
  patientName: string,
  item: string | null,
  getLabTrendData: ReturnType<typeof useLabStore.getState>['getLabTrendData']
): Promise<VoiceQueryAnswer> {
  if (!item) {
    throw new Error('어떤 검사 항목인지 알아듣지 못했습니다. 항목 이름을 함께 말씀해주세요.');
  }

  const trend = await getLabTrendData(patientId, '', item);
  if (!trend || trend.dataPoints.length === 0) {
    return {
      patientId,
      patientName,
      headline: `${patientName} 환자의 ${item} 결과가 없습니다.`,
      lines: [],
    };
  }

  const points = trend.dataPoints;
  const latest = points[points.length - 1]!;
  const previous = points.length > 1 ? points[points.length - 2] : undefined;
  const unit = trend.unit ? ` ${trend.unit}` : '';

  const headline = [
    `${patientName} 환자의 ${trend.itemName}`,
    `최근 ${latest.date} ${latest.value}${unit}`,
    latest.hlFlag ? `(${latest.hlFlag})` : '',
    describeChange(latest.value, previous?.value),
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    patientId,
    patientName,
    headline,
    lines: points
      .slice(-6)
      .reverse()
      .map((point) => `${point.date}  ${point.value}${unit}${point.hlFlag ? ` ${point.hlFlag}` : ''}`),
    trend,
  };
}

function describeChange(latest: number | string, previous: number | string | undefined): string {
  const a = typeof latest === 'number' ? latest : Number(latest);
  const b = typeof previous === 'number' ? previous : Number(previous);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '';
  if (a === b) return '이전과 동일';
  const diff = Math.round((a - b) * 100) / 100;
  return diff > 0 ? `이전 대비 +${diff}` : `이전 대비 ${diff}`;
}

async function buildMedicationAnswer(
  patientId: string,
  patientName: string,
  fetchMedicationsByPatient: (patientId: string) => Promise<void>
): Promise<VoiceQueryAnswer> {
  await fetchMedicationsByPatient(patientId);
  const active = useMedicationStore
    .getState()
    .medications.filter((item) => item.patientId === patientId && item.isActive);

  if (active.length === 0) {
    return {
      patientId,
      patientName,
      headline: `${patientName} 환자의 현재 투약이 없습니다.`,
      lines: [],
    };
  }

  const antibiotics = active.filter((item) => item.category === 'antibiotic');
  const headline = [
    `${patientName} 환자 현재 투약 ${active.length}건`,
    antibiotics.length > 0 ? `항생제 ${antibiotics.length}건` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    patientId,
    patientName,
    headline,
    lines: [...antibiotics, ...active.filter((item) => item.category !== 'antibiotic')].map(
      describeMedication
    ),
  };
}

function describeMedication(medication: Medication): string {
  const parts = [
    medication.category === 'antibiotic' ? '[항생제]' : '',
    medication.drugName,
    medication.dosage,
    medication.frequency,
    medication.singleDose ? `${medication.singleDose}T` : '',
    medication.schedule,
    medication.category === 'antibiotic' ? `시작 ${formatDate(medication.startDate)}` : '',
  ];
  return parts.filter(Boolean).join(' ');
}

function toMessage(error: unknown): string {
  if (error instanceof SttError) return error.message;
  return error instanceof Error ? error.message : String(error);
}
