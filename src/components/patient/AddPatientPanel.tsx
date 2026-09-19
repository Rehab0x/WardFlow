import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatDateInput, formatDetailedAge, parseDateInput } from '@/components/clinical/dateLabels';
import {
  patientArchiveButtonLabel,
  patientArchiveHelpText,
} from '@/lib/patientDeletionPolicy';
import {
  areAddPatientDraftsEqual,
  buildAddPatientPanelValidationMessages,
  defaultAddPatientDraft,
  isValidBirthDateInput,
  isValidClinicalDateInput,
  type AddPatientDraft,
} from '@/features/app/patientDraft';
import { Field, Input } from './patientFormControls';

export function AddPatientPanel({
  title,
  submitLabel,
  initialDraft = defaultAddPatientDraft,
  error,
  isSaving,
  onClose,
  onSubmit,
  onDelete,
}: {
  title: string;
  submitLabel: string;
  initialDraft?: AddPatientDraft;
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (draft: AddPatientDraft) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<AddPatientDraft>(initialDraft);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const birthDate = useMemo(() => parseDateInput(draft.birthDate), [draft.birthDate]);
  const hasValidBirthDate = useMemo(
    () => isValidBirthDateInput(draft.birthDate),
    [draft.birthDate]
  );
  const isDirty = useMemo(
    () => !areAddPatientDraftsEqual(draft, initialDraft),
    [draft, initialDraft]
  );
  const validationMessages = useMemo(() => buildAddPatientPanelValidationMessages(draft), [draft]);
  const canSubmit = useMemo(
    () =>
      Boolean(draft.registrationNumber.trim()) &&
      Boolean(draft.name.trim()) &&
      hasValidBirthDate &&
      isValidClinicalDateInput(draft.admissionDate) &&
      Boolean(draft.roomBed.trim()),
    [draft.admissionDate, draft.name, draft.registrationNumber, draft.roomBed, hasValidBirthDate]
  );
  const showValidationSummary = submitAttempted && !canSubmit && validationMessages.length > 0;

  useEffect(() => {
    setDraft(initialDraft);
    setSubmitAttempted(false);
  }, [initialDraft]);

  const close = useCallback(() => {
    if (isSaving) return;
    if (isDirty && !window.confirm('입력 중인 환자 정보가 있습니다. 닫을까요?')) return;
    onClose();
  }, [isDirty, isSaving, onClose]);

  useEffect(() => {
    window.setTimeout(() => firstInputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  const update = useCallback(
    <Key extends keyof AddPatientDraft>(key: Key, value: AddPatientDraft[Key]) => {
      setDraft((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const submit = useCallback(() => {
    setSubmitAttempted(true);
    if (isSaving || !canSubmit) return;
    onSubmit({
      ...draft,
      roomBed: draft.roomBed.trim(),
      registrationNumber: draft.registrationNumber.trim(),
      name: draft.name.trim(),
      attendingPhysician: draft.attendingPhysician.trim(),
      tagsText: draft.tagsText.trim(),
    });
  }, [canSubmit, draft, isSaving, onSubmit]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-zinc-950/30 p-3 sm:items-center sm:justify-center">
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full rounded-lg border border-zinc-200 bg-white shadow-xl sm:max-w-xl"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        onKeyDown={(event) => {
          if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter' || isSaving) return;
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-[14px] font-medium text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={close}
            disabled={isSaving}
            className="rounded-md px-2 py-1 text-[12px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            닫기
          </button>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="병실">
            <Input
              inputRef={firstInputRef}
              value={draft.roomBed}
              onChange={(value) => update('roomBed', value)}
              placeholder="301-1"
            />
          </Field>
          <Field label="등록번호">
            <Input
              value={draft.registrationNumber}
              inputMode="numeric"
              onChange={(value) =>
                update('registrationNumber', value.replace(/\D/g, '').slice(0, 12))
              }
            />
          </Field>
          <Field label="이름">
            <Input value={draft.name} onChange={(value) => update('name', value)} />
          </Field>
          <Field label="생년월일">
            <Input
              value={draft.birthDate}
              type="date"
              min="1900-01-01"
              max={formatDateInput(new Date())}
              onChange={(value) => update('birthDate', value)}
            />
            {birthDate && hasValidBirthDate && (
              <span className="font-mono text-[10.5px] text-zinc-400">
                {formatDetailedAge(birthDate)}
              </span>
            )}
            {draft.birthDate && !hasValidBirthDate && (
              <span className="text-[10.5px] text-red-600">1900년부터 오늘 사이로 입력</span>
            )}
          </Field>
          <Field label="입원일">
            <Input
              value={draft.admissionDate}
              type="date"
              min="1900-01-01"
              max={formatDateInput(new Date())}
              onChange={(value) => update('admissionDate', value)}
            />
            {draft.admissionDate && !isValidClinicalDateInput(draft.admissionDate) && (
              <span className="text-[10.5px] text-red-600">1900년부터 오늘 사이로 입력</span>
            )}
          </Field>
          <Field label="성별">
            <select
              value={draft.sex}
              onChange={(event) => update('sex', event.target.value as 'M' | 'F')}
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
            >
              <option value="F">F</option>
              <option value="M">M</option>
            </select>
          </Field>
          <Field label="구분">
            <select
              value={draft.patientType}
              onChange={(event) => {
                const patientType = event.target.value as 'admitted' | 'consult';
                setDraft((current) => ({
                  ...current,
                  patientType,
                }));
              }}
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
            >
              <option value="admitted">입원</option>
              <option value="consult">협진</option>
            </select>
          </Field>
          <Field label="주치의">
            <Input
              value={draft.attendingPhysician}
              onChange={(value) => update('attendingPhysician', value)}
            />
          </Field>
          <Field label="태그">
            <Input
              value={draft.tagsText}
              onChange={(value) => update('tagsText', value)}
              placeholder="#DM, #aspiration"
            />
          </Field>
        </div>
        {showValidationSummary && (
          <div className="mx-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            {validationMessages[0]}
          </div>
        )}
        {error && (
          <div className="mx-4 rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div>
            {onDelete && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isSaving}
                  title={patientArchiveHelpText}
                  className="h-8 rounded-md border border-red-200 px-3 text-[12px] font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {patientArchiveButtonLabel}
                </button>
                <p className="max-w-[220px] text-[11px] leading-relaxed text-zinc-500">
                  환자 정보와 연결된 임상 기록을 함께 삭제합니다.
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              disabled={isSaving}
              className="h-8 rounded-md border border-zinc-200 px-3 text-[12px] font-medium text-zinc-600 hover:bg-zinc-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving || !canSubmit}
              title={canSubmit ? undefined : validationMessages[0]}
              className="h-8 rounded-md bg-zinc-900 px-3 text-[12px] font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isSaving ? '저장 중' : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
