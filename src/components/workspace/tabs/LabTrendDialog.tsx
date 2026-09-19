import { lazy, Suspense, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { LabTrendData } from '@/types/lab';
import { useLabStore } from '@/stores/useLabStore';

// 차트(recharts)는 추이를 실제로 열어볼 때만 불러온다 — 첫 화면 번들에 포함하지 않는다.
const LabChart = lazy(() =>
  import('@/components/lab/LabChart').then((module) => ({ default: module.LabChart }))
);

interface LabTrendDialogProps {
  patientId: string;
  itemName: string;
  itemCode?: string;
  onClose: () => void;
}

/**
 * Lab 표에서 항목명을 클릭하면 뜨는 추이 차트 오버레이.
 * 데이터는 `useLabStore.getLabTrendData()`로 온디맨드 조회한다.
 */
export function LabTrendDialog({ patientId, itemName, itemCode, onClose }: LabTrendDialogProps) {
  const getLabTrendData = useLabStore((state) => state.getLabTrendData);
  const [trend, setTrend] = useState<LabTrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLabTrendData(patientId, itemCode ?? '', itemName)
      .then((data) => {
        if (!cancelled) setTrend(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getLabTrendData, itemCode, itemName, patientId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${itemName} 추이`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
          <span className="text-[13px] font-medium text-zinc-900">{itemName} 추이</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="추이 차트 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : trend ? (
            <Suspense
              fallback={
                <div className="flex h-48 items-center justify-center text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              }
            >
              <LabChart trendData={trend} />
            </Suspense>
          ) : (
            <p className="py-10 text-center text-[12px] text-zinc-500">
              추이를 그릴 수 있는 수치 데이터가 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
