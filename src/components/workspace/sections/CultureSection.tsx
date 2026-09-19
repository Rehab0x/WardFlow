import { ClinicalRow } from '@/components/clinical/ClinicalRow';
import { DataSection } from '@/components/clinical/DataSection';
import { formatDateInput } from '@/components/clinical/dateLabels';
import type { LabResult } from '@/types/lab';

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
                  {formatDateInput(result.testDate)}
                </span>
                <span className="text-[11px] text-zinc-400">{result.source}</span>
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {result.items.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="flex min-w-0 items-baseline justify-between gap-2 border-b border-zinc-100 py-1 last:border-b-0"
                  >
                    <span className="truncate text-zinc-600">{item.name}</span>
                    <span
                      className={
                        item.hlFlag ? 'font-semibold text-red-600' : 'font-mono text-zinc-800'
                      }
                    >
                      {item.value}
                      {item.unit && <span className="ml-1 text-zinc-400">{item.unit}</span>}
                      {item.hlFlag && <span className="ml-1 text-[10px]">{item.hlFlag}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DataSection>
  );
}
