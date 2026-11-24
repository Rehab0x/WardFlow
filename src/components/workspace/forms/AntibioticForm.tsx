import { useCallback, useState } from 'react';
import { DataSection } from '@/components/clinical/DataSection';
import { formatDateInput } from '@/components/clinical/dateLabels';
import { calculateAntibioticEndDate, readAntibioticDays } from '@/utils/antibioticCourse';
import { Input, SaveButton } from '../controls';
import type { AntibioticDraft, PatientWorkspaceProps } from '../types';
import { isClinicalDateInput, isComposingKeyboardEvent } from '../workspaceInput';

export function AntibioticForm({
  draft,
  setDraft,
  onAddAntibiotic,
  onUpdateAntibiotic,
  editingId,
  onReset,
}: {
  draft: AntibioticDraft;
  setDraft: (updater: (current: AntibioticDraft) => AntibioticDraft) => void;
  onAddAntibiotic?: PatientWorkspaceProps['onAddAntibiotic'];
  onUpdateAntibiotic?: PatientWorkspaceProps['onUpdateAntibiotic'];
  /** 있으면 수정 모드 — 저장 시 새로 추가하지 않고 이 항생제를 고친다 */
  editingId?: string | null;
  onReset: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const hasValidStartDate = isClinicalDateInput(draft.startDate);
  const days = readAntibioticDays(draft.days);
  const endDate = hasValidStartDate && days ? calculateAntibioticEndDate(parseStart(draft.startDate), days) : null;
  const hasDraft = Boolean(draft.drugName.trim()) && days !== null;

  const save = useCallback(async () => {
    if (!hasDraft || !hasValidStartDate || saving) return;
    setSaving(true);
    try {
      if (editingId) await onUpdateAntibiotic?.(editingId, draft);
      else await onAddAntibiotic?.(draft);
      onReset();
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [draft, editingId, hasDraft, hasValidStartDate, onAddAntibiotic, onReset, onUpdateAntibiotic, saving]);

  return (
    <DataSection title={editingId ? '항생제 수정' : '항생제 추가'}>
      <div
        className="grid gap-2 p-2 sm:grid-cols-[minmax(0,1.4fr)_100px_80px_140px_80px_auto]"
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || isComposingKeyboardEvent(event)) return;
          event.preventDefault();
          save();
        }}
      >
        <Input
          value={draft.drugName}
          placeholder="약제명"
          onChange={(value) => setDraft((current) => ({ ...current, drugName: value }))}
        />
        <Input
          value={draft.dosage}
          placeholder="용량"
          onChange={(value) => setDraft((current) => ({ ...current, dosage: value }))}
        />
        <Input
          value={draft.frequency}
          placeholder="횟수"
          onChange={(value) => setDraft((current) => ({ ...current, frequency: value }))}
        />
        <Input
          value={draft.startDate}
          type="date"
          min="1900-01-01"
          max={formatDateInput(new Date())}
          invalid={!hasValidStartDate}
          onChange={(value) => setDraft((current) => ({ ...current, startDate: value }))}
        />
        <Input
          value={draft.days}
          placeholder="일수"
          onChange={(value) => setDraft((current) => ({ ...current, days: value.replace(/\D/g, '') }))}
        />
        <div className="flex gap-1">
          <SaveButton disabled={!hasDraft || !hasValidStartDate} pending={saving} onClick={save}>
            {editingId ? '수정 저장' : '저장'}
          </SaveButton>
          {editingId && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-md border border-zinc-200 px-2 text-[11px] text-zinc-500 hover:bg-zinc-100"
            >
              취소
            </button>
          )}
        </div>
      </div>
      <div className="px-2 pb-2 text-[11px] text-zinc-500">
        {endDate
          ? `종료일 ${formatDateInput(endDate)} · 종료 1일 전(${formatDateInput(addDays(endDate, -1))})과 종료일에 Today에 알림`
          : '시작일과 일수를 넣으면 종료일이 자동 계산됩니다.'}
      </div>
      {draft.startDate && !hasValidStartDate && (
        <div className="px-2 pb-2 text-[11px] text-red-600">
          시작일은 1900년부터 오늘 사이로 입력해주세요.
        </div>
      )}
    </DataSection>
  );
}

function parseStart(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
