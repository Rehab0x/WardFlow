import { Check, TriangleAlert } from 'lucide-react';
import type { ConversationDraft } from '@/hooks/useConversationNotes';
import type { Patient } from '@/types/patient';
import { cn } from '@/utils/cn';

const SOAP_FIELDS = [
  { key: 'subjective', label: 'S' },
  { key: 'objective', label: 'O' },
  { key: 'assessment', label: 'A' },
  { key: 'plan', label: 'P' },
] as const;

/**
 * 환자별로 나뉜 SOAP 초안 검토 단계.
 * 저장 전에 반드시 사람이 확인하도록, 기본은 "선택된 것만 저장"이고
 * 환자를 특정하지 못한 조각은 선택이 해제된 채로 시작한다.
 */
export function ConversationReview({
  drafts,
  patients,
  onChange,
}: {
  drafts: ConversationDraft[];
  patients: Patient[];
  onChange: (index: number, patch: Partial<ConversationDraft>) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-zinc-500">
        저장 전에 내용을 확인해주세요. 대화에 없던 내용은 비어 있습니다.
      </p>

      {drafts.map((draft, index) => {
        const unmatched = !draft.patientId;
        return (
          <div
            key={index}
            className={cn(
              'rounded-lg border p-3',
              draft.saved
                ? 'border-emerald-200 bg-emerald-50/50'
                : unmatched
                  ? 'border-amber-200 bg-amber-50/40'
                  : 'border-zinc-200'
            )}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                checked={draft.selected}
                disabled={draft.saved || unmatched}
                onChange={(event) => onChange(index, { selected: event.target.checked })}
                aria-label={`${draft.patientName ?? '미지정'} 저장 대상`}
                className="h-4 w-4"
              />
              <select
                value={draft.patientId ?? ''}
                disabled={draft.saved}
                aria-label="환자 선택"
                onChange={(event) => {
                  const patientId = event.target.value || undefined;
                  const patient = patients.find((item) => item.id === patientId);
                  onChange(index, {
                    patientId,
                    patientName: patient?.name ?? null,
                    selected: Boolean(patientId),
                  });
                }}
                className="h-8 min-w-[160px] rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
              >
                <option value="">환자 선택…</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.roomBed} {patient.name}
                  </option>
                ))}
              </select>

              {draft.saved && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  저장됨
                </span>
              )}
              {unmatched && !draft.saved && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  환자를 특정하지 못했습니다
                </span>
              )}
            </div>

            {draft.excerpt && (
              <p className="mb-2 rounded bg-zinc-50 px-2 py-1 text-[11px] text-zinc-500">
                “{draft.excerpt}”
              </p>
            )}

            <div className="grid gap-1.5">
              {SOAP_FIELDS.map((field) => (
                <label key={field.key} className="flex items-start gap-2">
                  <span className="mt-1.5 w-4 shrink-0 font-mono text-[11px] text-zinc-400">
                    {field.label}
                  </span>
                  <textarea
                    value={draft[field.key]}
                    disabled={draft.saved}
                    rows={field.key === 'objective' || field.key === 'plan' ? 2 : 1}
                    aria-label={`${field.label} 내용`}
                    onChange={(event) => onChange(index, { [field.key]: event.target.value })}
                    className="min-h-8 flex-1 resize-y rounded-md border border-zinc-200 px-2 py-1 text-[12px] leading-5 outline-none focus:border-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-500"
                  />
                </label>
              ))}
            </div>

            {draft.saveError && (
              <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                {draft.saveError}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
