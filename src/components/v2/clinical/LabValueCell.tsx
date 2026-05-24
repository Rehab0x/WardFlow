import { cn } from '@/lib/utils';

interface LabValueCellProps {
  value?: string | number;
  unit?: string;
  flag?: 'H' | 'L';
  reference?: string;
}

export function LabValueCell({ value, unit, flag, reference }: LabValueCellProps) {
  const abnormal = flag === 'H' || flag === 'L';

  return (
    <div
      className={cn(
        'min-h-10 border-l border-zinc-100 px-2 py-1 text-right',
        abnormal && 'bg-red-50'
      )}
    >
      <div
        className={cn(
          'font-mono text-[12px] font-medium tabular-nums text-zinc-900',
          abnormal && 'text-red-700'
        )}
      >
        {value ?? '-'}
        {flag && <span className="ml-1 text-[10px]">{flag}</span>}
      </div>
      <div className="mt-0.5 truncate text-[10px] text-zinc-400">
        {unit || reference || '\u00a0'}
      </div>
    </div>
  );
}
