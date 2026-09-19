import { useCallback, useState } from 'react';
import { DataSection } from '@/components/clinical/DataSection';
import { CategoryToggle, Input, SaveButton } from '../controls';
import type { MedicationDraft, PatientWorkspaceProps } from '../types';
import { isComposingKeyboardEvent } from '../workspaceInput';
import { medicationScheduleOptions, medicationTimingOptions } from './medicationDrafts';

export function ManualMedicationForm({
  draft,
  setDraft,
  onAddMedication,
  onReset,
}: {
  draft: MedicationDraft;
  setDraft: (updater: (current: MedicationDraft) => MedicationDraft) => void;
  onAddMedication?: PatientWorkspaceProps['onAddMedication'];
  onReset: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const hasDraft = Boolean(draft.drugName.trim());

  const save = useCallback(async () => {
    if (!hasDraft || saving) return;
    setSaving(true);
    try {
      await onAddMedication?.(draft);
      onReset();
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [draft, hasDraft, onAddMedication, onReset, saving]);

  return (
    <DataSection title="본원약 / 지참약 추가">
      <div
        className="space-y-2 p-2"
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || isComposingKeyboardEvent(event)) return;
          event.preventDefault();
          save();
        }}
      >
        <div className="grid gap-2 sm:grid-cols-[88px_minmax(180px,1.4fr)_minmax(120px,0.7fr)]">
          <CategoryToggle
            value={draft.category}
            onChange={(category) => setDraft((current) => ({ ...current, category }))}
          />
          <Input
            value={draft.drugName}
            placeholder="약제명"
            onChange={(value) => setDraft((current) => ({ ...current, drugName: value }))}
          />
          <Input
            value={draft.singleDose}
            placeholder="1회용량"
            onChange={(value) => setDraft((current) => ({ ...current, singleDose: value }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="투약 횟수"
            value={draft.frequency}
            onChange={(event) => {
              const frequency = event.target.value as MedicationDraft['frequency'];
              setDraft((current) => ({
                ...current,
                frequency,
                schedule: medicationScheduleOptions[frequency][0],
              }));
            }}
            className="h-8 w-[72px] rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
          >
            {(Object.keys(medicationScheduleOptions) as MedicationDraft['frequency'][]).map(
              (option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              )
            )}
          </select>
          <select
            aria-label="투약 시간"
            value={draft.schedule}
            onChange={(event) =>
              setDraft((current) => ({ ...current, schedule: event.target.value }))
            }
            className="h-8 min-w-[150px] flex-1 rounded-md border border-zinc-200 bg-white px-2 text-[12px] sm:flex-none"
          >
            {medicationScheduleOptions[draft.frequency].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            aria-label="복용 타이밍"
            value={draft.timing}
            onChange={(event) => setDraft((current) => ({ ...current, timing: event.target.value }))}
            className="h-8 w-[120px] rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
          >
            {medicationTimingOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <Input
            value={draft.notes}
            placeholder="메모"
            onChange={(value) => setDraft((current) => ({ ...current, notes: value }))}
            className="min-w-[180px] flex-1"
          />
          <SaveButton disabled={!hasDraft} pending={saving} onClick={save}>
            저장
          </SaveButton>
        </div>
      </div>
    </DataSection>
  );
}
