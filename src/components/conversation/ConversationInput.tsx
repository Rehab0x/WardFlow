import { useState } from 'react';
import { Keyboard, Loader2, Mic, Square } from 'lucide-react';
import { useAIStore } from '@/stores/useAIStore';
import { isRecordingSupported } from '@/services/sttService';
import { cn } from '@/utils/cn';
import type { ConversationStage } from '@/hooks/useConversationNotes';

type InputMode = 'type' | 'record';

const STAGE_LABEL: Partial<Record<ConversationStage, string>> = {
  transcribing: '음성을 변환하는 중…',
  segmenting: '환자별로 나누는 중…',
};

/**
 * 대화 입력 단계.
 * 녹음이 어려운 상황(전화 인계 등)을 고려해 **직접 입력이 기본**이고,
 * 마이크는 쓸 수 있을 때만 선택지로 보여준다.
 */
export function ConversationInput({
  stage,
  onAnalyze,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
}: {
  stage: ConversationStage;
  onAnalyze: (transcript: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
}) {
  const sttReady = useAIStore((store) => store.isSttConfigured());
  const canRecord = sttReady && isRecordingSupported();
  const [mode, setMode] = useState<InputMode>('type');
  const [text, setText] = useState('');

  const busy = stage === 'transcribing' || stage === 'segmenting';

  if (busy) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-[13px]">{STAGE_LABEL[stage]}</p>
      </div>
    );
  }

  if (stage === 'recording') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <span className="absolute inset-0 animate-ping rounded-full bg-red-200 opacity-60" />
          <Mic className="relative h-6 w-6" />
        </span>
        <p className="text-[13px] text-zinc-600">듣고 있습니다…</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onStopRecording}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-zinc-900 px-4 text-[12px] font-medium text-white hover:bg-zinc-700"
          >
            <Square className="h-3.5 w-3.5" />
            녹음 완료
          </button>
          <button
            type="button"
            onClick={onCancelRecording}
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 px-3 text-[12px] font-medium hover:bg-zinc-50"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canRecord && (
        <div className="grid grid-cols-2 gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
          <ModeButton active={mode === 'type'} onClick={() => setMode('type')} icon={Keyboard}>
            직접 입력
          </ModeButton>
          <ModeButton active={mode === 'record'} onClick={() => setMode('record')} icon={Mic}>
            녹음
          </ModeButton>
        </div>
      )}

      {mode === 'record' && canRecord ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <p className="text-[12px] text-zinc-500">
            간호사 보고를 녹음하면 환자별로 나눠 정리합니다.
          </p>
          <button
            type="button"
            onClick={onStartRecording}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-900 px-4 text-[13px] font-medium text-white hover:bg-zinc-700"
          >
            <Mic className="h-4 w-4" />
            녹음 시작
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor="conversation-text" className="block text-[12px] text-zinc-500">
            전화 인계처럼 녹음이 어려우면 들은 내용을 그대로 적어주세요. 환자 이름이 들어 있으면
            자동으로 나눠 정리합니다.
          </label>
          <textarea
            id="conversation-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            placeholder={
              '예)\n302호 김철수님 새벽에 열 38.2도 나서 타이레놀 드렸고 지금 37.1도로 떨어졌습니다.\n305호 이영희님은 소변량이 좀 줄어서 확인 부탁드립니다.'
            }
            className="w-full resize-y rounded-md border border-zinc-200 px-3 py-2 text-[13px] leading-6 outline-none focus:border-zinc-400"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-400">
              {text.trim().length > 0 ? `${text.trim().length}자` : '내용을 입력해주세요'}
            </span>
            <button
              type="button"
              disabled={!text.trim()}
              onClick={() => onAnalyze(text)}
              className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-[12px] font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              환자별로 정리
            </button>
          </div>
        </div>
      )}

      {!canRecord && (
        <p className="text-[11px] text-zinc-400">
          {isRecordingSupported()
            ? '녹음을 쓰려면 설정 > AI 설정에서 Whisper API 키를 입력하세요.'
            : '이 브라우저에서는 녹음을 지원하지 않아 직접 입력만 가능합니다.'}
        </p>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Mic;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded text-[12px] font-medium transition-colors',
        active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
