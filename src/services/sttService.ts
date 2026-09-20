import { useAIStore, WHISPER_API_URL, WHISPER_MODEL } from '@/stores/useAIStore';

/**
 * 음성 인식(STT) 래퍼.
 *
 * - 녹음은 MediaRecorder로 하고, 변환은 OpenAI Whisper API로 한다.
 *   Web Speech API보다 의료 용어 인식이 정확하고 `prompt`로 도메인 힌트를 줄 수 있다.
 * - **원본 오디오와 변환 텍스트는 저장하지 않는다.** Blob은 변환 직후 버리고 DB에도 남기지 않는다.
 */

/** Whisper에 넘길 도메인 용어 힌트 — 회진에서 자주 나오는 검사·약제 용어 */
const MEDICAL_PROMPT =
  '소듐, 칼륨, 클로라이드, 칼슘, 크레아티닌, BUN, 헤모글로빈, 혈소판, 백혈구, CRP, ESR, ' +
  'AST, ALT, 빌리루빈, 알부민, 혈당, 당화혈색소, 항생제, 수액, 혈압, 체온';

export class SttError extends Error {
  constructor(
    message: string,
    /** UI가 단계별로 다른 안내를 띄울 수 있도록 실패 지점을 구분한다. */
    readonly stage: 'permission' | 'recording' | 'transcription' | 'config'
  ) {
    super(message);
    this.name = 'SttError';
  }
}

/** 이 브라우저에서 녹음이 가능한지 */
export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'
  );
}

function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export interface VoiceRecorder {
  /** 녹음을 멈추고 오디오 Blob을 돌려준다. */
  stop: () => Promise<Blob>;
  /** 결과를 버리고 마이크를 해제한다. */
  cancel: () => void;
}

/**
 * 마이크 녹음을 시작한다. 호출자는 반드시 `stop()` 또는 `cancel()`로 마무리해
 * 마이크 트랙을 해제해야 한다.
 */
export async function startRecording(): Promise<VoiceRecorder> {
  if (!isRecordingSupported()) {
    throw new SttError('이 브라우저에서는 음성 녹음을 지원하지 않습니다.', 'permission');
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new SttError('마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.', 'permission');
  }

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  recorder.start();

  const releaseMic = () => stream.getTracks().forEach((track) => track.stop());

  return {
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        recorder.addEventListener(
          'stop',
          () => {
            releaseMic();
            const blob = new Blob(chunks, { type: mimeType ?? 'audio/webm' });
            if (blob.size === 0) {
              reject(new SttError('녹음된 소리가 없습니다. 다시 시도해주세요.', 'recording'));
              return;
            }
            resolve(blob);
          },
          { once: true }
        );
        recorder.addEventListener(
          'error',
          () => {
            releaseMic();
            reject(new SttError('녹음 중 오류가 발생했습니다.', 'recording'));
          },
          { once: true }
        );
        if (recorder.state !== 'inactive') recorder.stop();
      }),
    cancel: () => {
      if (recorder.state !== 'inactive') recorder.stop();
      releaseMic();
    },
  };
}

/**
 * 오디오를 텍스트로 변환한다.
 * 반환된 텍스트는 호출자가 답변 생성에만 쓰고 저장하지 않는다.
 */
export async function transcribeAudio(audio: Blob): Promise<string> {
  const { whisperApiKey } = useAIStore.getState();
  if (!whisperApiKey.trim()) {
    throw new SttError(
      'Whisper API 키가 없습니다. 설정 > AI 설정에서 입력해주세요.',
      'config'
    );
  }

  const form = new FormData();
  form.append('file', audio, 'voice-query.webm');
  form.append('model', WHISPER_MODEL);
  form.append('language', 'ko');
  form.append('prompt', MEDICAL_PROMPT);
  form.append('response_format', 'json');

  let response: Response;
  try {
    response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${whisperApiKey.trim()}` },
      body: form,
    });
  } catch {
    throw new SttError('음성 인식 서버에 연결하지 못했습니다.', 'transcription');
  }

  if (!response.ok) {
    throw new SttError(await describeWhisperFailure(response), 'transcription');
  }

  const data = (await response.json()) as { text?: string };
  const text = data.text?.trim() ?? '';
  if (!text) {
    throw new SttError('음성에서 문장을 인식하지 못했습니다. 다시 말씀해주세요.', 'transcription');
  }
  return text;
}

async function describeWhisperFailure(response: Response): Promise<string> {
  if (response.status === 401) return 'Whisper API 키가 올바르지 않습니다.';
  if (response.status === 429) return '음성 인식 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.';
  if (response.status >= 500) return '음성 인식 서버에 일시적인 문제가 있습니다.';

  // 그 밖의 오류는 원문을 짧게 덧붙여 원인 파악을 돕는다.
  const detail = await response.text().catch(() => '');
  const trimmed = detail.slice(0, 120);
  return `음성 인식에 실패했습니다 (${response.status})${trimmed ? `: ${trimmed}` : ''}`;
}
