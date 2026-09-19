import { memo } from 'react';
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
  selected?: boolean;
  className?: string;
  onClick?: () => void;
}

export const MetricTile = memo(function MetricTile({
  label,
  value,
  tone = 'default',
  selected,
  className,
  onClick,
}: MetricTileProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      aria-pressed={onClick ? selected : undefined}
      aria-label={onClick ? `${label} ${value}` : undefined}
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left',
        onClick && 'transition-colors hover:bg-zinc-50',
        selected && 'border-zinc-900 ring-1 ring-zinc-900',
        className
      )}
    >
      <div className="text-[11px] text-zinc-400">{label}</div>
      <div
        className={cn(
          'mt-0.5 font-mono text-[22px] font-medium leading-none tracking-tight tabular-nums',
          valueToneClass[tone]
        )}
      >
        {value}
      </div>
    </Component>
  );
});

