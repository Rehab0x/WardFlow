import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { useConversationNotes } from '@/hooks/useConversationNotes';
import { usePatientStore } from '@/stores/usePatientStore';
import { useToast } from '@/hooks/use-toast';
import { ConversationInput } from './ConversationInput';
import { ConversationReview } from './ConversationReview';

/**
 * 간호사 대화(구두 보고·전화 인계)를 환자별 경과기록으로 정리하는 다이얼로그.
 * 입력 → 검토 → 선택 저장의 3단계이며, 저장은 항상 사용자가 확인한 것만 이뤄진다.
 */
export function ConversationNoteDialog({
  onClose,
  onAddNote,
}: {
  onClose: () => void;
  /** 저장 경로는 호출자가 준다 — 기존 메모 저장 핸들러를 그대로 재사용한다. */
  onAddNote: (patientId: string, content: string) => Promise<void>;
}) {
  const conversation = useConversationNotes();
  const { state } = conversation;
  const patients = usePatientStore((store) => store.patients);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const activePatients = useMemo(
    () =>
      patients
        .filter((patient) => patient.status === 'active')
        .sort((a, b) => a.roomBed.localeCompare(b.roomBed, 'ko-KR', { numeric: true })),
    [patients]
  );

  const pendingCount = state.drafts.filter(
    (draft) => draft.selected && !draft.saved && draft.patientId
  ).length;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const save = useCallback(async () => {
    if (pendingCount === 0 || saving) return;
    setSaving(true);
    try {
      const saved = await conversation.saveSelected(onAddNote);
      if (saved > 0) toast({ title: `경과기록 ${saved}건을 저장했습니다.` });
    } finally {
      setSaving(false);
    }
  }, [conversation, onAddNote, pendingCount, saving, toast]);

  const allSaved =
    state.drafts.length > 0 && state.drafts.every((draft) => draft.saved || !draft.patientId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="간호사 대화 정리"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/35 p-3 sm:items-center"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-zinc-500" />
            <div>
              <h2 className="text-[14px] font-semibold text-zinc-900">간호사 대화 정리</h2>
              <p className="text-[11px] text-zinc-500">
                구두 보고나 전화 인계를 환자별 경과기록 초안으로 나눕니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {state.error && (
            <div className="mb-3 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[12px] text-red-700">
              {state.error}
            </div>
          )}

          {state.stage === 'review' ? (
            <ConversationReview
              drafts={state.drafts}
              patients={activePatients}
              onChange={conversation.updateDraft}
            />
          ) : (
            <ConversationInput
              stage={state.stage}
              onAnalyze={(transcript) => void conversation.analyze(transcript)}
              onStartRecording={() => void conversation.startRecordingInput()}
              onStopRecording={() => void conversation.stopRecordingAndAnalyze()}
              onCancelRecording={conversation.cancelRecording}
            />
          )}
        </div>

        {state.stage === 'review' && (
          <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-5 py-3">
            <button
              type="button"
              onClick={conversation.reset}
              className="h-8 rounded-md border border-zinc-200 px-3 text-[12px] font-medium text-zinc-600 hover:bg-zinc-100"
            >
              다시 입력
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400">
                대화 원문은 저장되지 않습니다
              </span>
              <button
                type="button"
                onClick={save}
                disabled={pendingCount === 0 || saving}
                className="h-8 rounded-md bg-zinc-900 px-3 text-[12px] font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {saving
                  ? '저장 중'
                  : allSaved
                    ? '저장 완료'
                    : `선택한 ${pendingCount}건 저장`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
