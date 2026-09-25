import { ClinicalRow } from '@/components/clinical/ClinicalRow';
import { DataSection } from '@/components/clinical/DataSection';
import { formatDateInput } from '@/components/clinical/dateLabels';
import type { LabResult } from '@/types/lab';
import { CultureResultItem } from './CultureResultItem';

export function CultureSection({ results }: { results: LabResult[] }) {
  return (
    <DataSection title="Culture / Sensitivity" count={results.length}>
      {results.length === 0 ? (
        <ClinicalRow prefix="-" title="0" detail="Culture 결과 없음" />
      ) : (
        <div className="space-y-2 p-2">
          {results.map((result) => (
            <div
              key={result.id}
              className="rounded-md border border-zinc-200 bg-white p-2 text-[12px]"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-zinc-500">
                  접수 {formatDateInput(result.testDate)}
                </span>
                <span className="text-[11px] text-zinc-400">{result.source}</span>
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {result.items.map((item, index) => (
                  <CultureResultItem key={`${item.name}-${index}`} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DataSection>
  );
}
