import { useCallback, useState } from 'react';
import { DataSection } from '@/components/clinical/DataSection';
import { formatDateInput } from '@/components/clinical/dateLabels';
import { Input, SaveButton } from '../controls';
import type { AntibioticDraft, PatientWorkspaceProps } from '../types';
import { isClinicalDateInput, isComposingKeyboardEvent } from '../workspaceInput';

export function AntibioticForm({
  draft,
  setDraft,
  onAddAntibiotic,
  onReset,
}: {
  draft: AntibioticDraft;
  setDraft: (updater: (current: AntibioticDraft) => AntibioticDraft) => void;
  onAddAntibiotic?: PatientWorkspaceProps['onAddAntibiotic'];
  onReset: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const hasValidStartDate = isClinicalDateInput(draft.startDate);
  const hasDraft = Boolean(draft.drugName.trim());

  const save = useCallback(async () => {
    if (!hasDraft || !hasValidStartDate || saving) return;
    setSaving(true);
    try {
      await onAddAntibiotic?.(draft);
      onReset();
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [draft, hasDraft, hasValidStartDate, onAddAntibiotic, onReset, saving]);

  return (
    <DataSection title="항생제 추가">
      <div
        className="grid gap-2 p-2 sm:grid-cols-[minmax(0,1.4fr)_120px_100px_140px_auto]"
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
        <SaveButton disabled={!hasDraft || !hasValidStartDate} pending={saving} onClick={save}>
          저장
        </SaveButton>
      </div>
      {draft.startDate && !hasValidStartDate && (
        <div className="px-2 pb-2 text-[11px] text-red-600">
          시작일은 1900년부터 오늘 사이로 입력해주세요.
        </div>
      )}
    </DataSection>
  );
}
