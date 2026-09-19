import { BulkLabImport } from './BulkLabImport';
import type { BulkImportResult } from '@/services/bulkLabImport';

export function LabImportDialog({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (result: BulkImportResult) => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/35 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-zinc-900">Lab XLS 일괄 입력</h2>
            <p className="text-[11px] text-zinc-500">
              XLS 파일 안의 검사일과 등록번호로 전체 환자 Lab을 저장합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Lab XLS 일괄 입력 닫기"
          >
            ×
          </button>
        </div>
        <div className="p-5">
          <BulkLabImport onClose={onClose} onComplete={onComplete} />
        </div>
      </div>
    </div>
  );
}
