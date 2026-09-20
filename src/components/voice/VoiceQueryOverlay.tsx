import { lazy, Suspense, useEffect } from 'react';
import { ArrowRight, Loader2, Mic, Square, X } from 'lucide-react';
import type { useVoiceQuery } from '@/hooks/useVoiceQuery';

// Lab 추이 차트는 실제로 그릴 때만 불러온다 (첫 화면 번들에서 제외).
const LabChart = lazy(() =>
  import('@/components/lab/LabChart').then((module) => ({ default: module.LabChart }))
);

interface VoiceQueryOverlayProps {
  voice: ReturnType<typeof useVoiceQuery>;
  onClose: () => void;
  onOpenPatient?: (patientId: string, tab?: string) => void;
}

const STAGE_LABEL: Record<string, string> = {
  recording: '듣고 있습니다…',
  transcribing: '음성을 변환하는 중…',
  parsing: '질문을 이해하는 중…',
  loading: '기록을 찾는 중…',
};

export function VoiceQueryOverlay({ voice, onClose, onOpenPatient }: VoiceQueryOverlayProps) {
  const { stage, transcript, parsed, answer, error } = voice.state;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const busy = stage === 'transcribing' || stage === 'parsing' || stage === 'loading';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="음성 질의"
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
          <span className="text-[13px] font-medium text-zinc-900">음성 질의</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-3">
          {stage === 'recording' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <span className="absolute inset-0 animate-ping rounded-full bg-red-200 opacity-60" />
                <Mic className="relative h-6 w-6" />
              </span>
              <p className="text-[13px] text-zinc-600">{STAGE_LABEL.recording}</p>
              <p className="text-[11px] text-zinc-400">예: "김환자 소듐 요즘 어땠지?"</p>
              <button
                type="button"
                onClick={() => void voice.stopAndAnswer()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-zinc-900 px-4 text-[12px] font-medium text-white hover:bg-zinc-700"
              >
                <Square className="h-3.5 w-3.5" />
                말하기 완료
              </button>
            </div>
          )}

          {busy && (
            <div className="flex flex-col items-center gap-2 py-8 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-[13px]">{STAGE_LABEL[stage]}</p>
              {transcript && <p className="text-[12px] text-zinc-400">"{transcript}"</p>}
            </div>
          )}

          {transcript && !busy && stage !== 'recording' && (
            <p className="rounded-md bg-zinc-50 px-2 py-1.5 text-[12px] text-zinc-500">
              들은 내용: "{transcript}"
            </p>
          )}

          {stage === 'error' && error && (
            <div className="space-y-2">
              <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[12px] text-red-700">
                {error}
              </div>
              <button
                type="button"
                onClick={() => void voice.start()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 px-3 text-[12px] font-medium hover:bg-zinc-50"
              >
                <Mic className="h-3.5 w-3.5" />
                다시 말하기
              </button>
            </div>
          )}

          {stage === 'done' && answer && (
            <div className="space-y-3">
              <p className="text-[14px] font-medium text-zinc-900">{answer.headline}</p>

              {answer.trend && answer.trend.dataPoints.length > 1 && (
                <Suspense
                  fallback={
                    <div className="flex h-40 items-center justify-center text-zinc-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  }
                >
                  <LabChart trendData={answer.trend} height={220} />
                </Suspense>
              )}

              {answer.lines.length > 0 && (
                <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
                  {answer.lines.map((line, index) => (
                    <li
                      key={`${line}-${index}`}
                      className="px-2 py-1.5 font-mono text-[12px] tabular-nums text-zinc-700"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2">
                {onOpenPatient && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPatient(
                        answer.patientId,
                        parsed?.queryType === 'medication' ? 'medications' : 'lab'
                      );
                      onClose();
                    }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-[12px] font-medium text-white hover:bg-zinc-700"
                  >
                    환자 열기
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void voice.start()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 px-3 text-[12px] font-medium hover:bg-zinc-50"
                >
                  <Mic className="h-3.5 w-3.5" />
                  다시 질문
                </button>
              </div>

              <p className="text-[11px] text-zinc-400">
                음성과 변환된 텍스트는 저장되지 않습니다. 창을 닫으면 사라집니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
