import { useState } from 'react';
import { formatDateInput } from '@/components/clinical/dateLabels';
import { isValidClinicalDateInput } from '@/features/app/patientDraft';
import { Field, Input } from './patientFormControls';

export function PatientStatusDialog({
  patientName,
  mode,
  initialDateKey,
  isSaving,
  onClose,
  onConfirm,
}: {
  patientName: string;
  mode: 'discharge' | 'readmit';
  initialDateKey: string;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (dateKey: string) => void | Promise<void>;
}) {
  const [dateKey, setDateKey] = useState(initialDateKey);
  const isValidDate = isValidClinicalDateInput(dateKey);
  const isReadmit = mode === 'readmit';

  return (
    <div className="fixed inset-0 z-[75] flex items-end bg-zinc-950/30 p-3 sm:items-center sm:justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isReadmit ? '재입원 처리' : '퇴원 처리'}
        className="w-full rounded-lg border border-zinc-200 bg-white shadow-xl sm:max-w-md"
      >
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-[14px] font-medium text-zinc-900">
            {isReadmit ? '재입원 처리' : '퇴원 처리'}
          </h2>
          <p className="mt-1 text-[12px] text-zinc-500">
            {patientName} 환자를 {isReadmit ? '다시 입원 환자로 변경할까요?' : '퇴원 환자로 변경할까요?'}
          </p>
        </div>
        <div className="grid gap-2 p-4">
          <Field label={isReadmit ? '재입원일' : '퇴원일'}>
            <Input
              value={dateKey}
              type="date"
              min="1900-01-01"
              max={formatDateInput(new Date())}
              onChange={setDateKey}
            />
            {dateKey && !isValidDate && (
              <span className="text-[10.5px] text-red-600">1900년부터 오늘 사이로 입력</span>
            )}
          </Field>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-8 rounded-md border border-zinc-200 px-3 text-[12px] font-medium text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isSaving || !isValidDate}
            onClick={() => void onConfirm(dateKey)}
            className="h-8 rounded-md bg-zinc-900 px-3 text-[12px] font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isSaving ? '저장 중' : isReadmit ? '재입원' : '퇴원'}
          </button>
        </div>
      </div>
    </div>
  );
}
