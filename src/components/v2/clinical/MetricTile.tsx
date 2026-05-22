import { cn } from '@/lib/utils';
import type { ClinicalTone } from './ClinicalPill';

const valueToneClass: Record<ClinicalTone, string> = {
  default: 'text-zinc-900',
  muted: 'text-zinc-500',
  warning: 'text-amber-600',
  danger: 'text-red-600',
};

interface MetricTileProps {
  label: string;
  value: number | string;
  tone?: ClinicalTone;
  className?: string;
}

export function MetricTile({ label, value, tone = 'default', className }: MetricTileProps) {
  return (
    <div className={cn('rounded-lg border border-zinc-200 bg-white px-3 py-2.5', className)}>
      <div className="text-[11px] text-zinc-400">{label}</div>
      <div
        className={cn(
          'mt-0.5 font-mono text-[22px] font-medium leading-none tracking-tight tabular-nums',
          valueToneClass[tone]
        )}
      >
        {value}
      </div>
    </div>
  );
}

