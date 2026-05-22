import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClinicalPill, type ClinicalTone } from './ClinicalPill';

interface ClinicalRowProps {
  prefix?: string;
  title: string;
  detail?: string;
  meta?: string;
  icon?: LucideIcon;
  tone?: ClinicalTone;
  pill?: string;
  selected?: boolean;
  onClick?: () => void;
}

export function ClinicalRow({
  prefix,
  title,
  detail,
  meta,
  icon: Icon,
  tone = 'default',
  pill,
  selected,
  onClick,
}: ClinicalRowProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'grid min-h-8 w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 border-b border-zinc-100 px-2 py-1 text-left text-[12px]',
        onClick && 'transition-colors hover:bg-zinc-50',
        selected && 'bg-zinc-900 text-white hover:bg-zinc-900'
      )}
    >
      <span
        className={cn(
          'font-mono text-[10.5px] tabular-nums text-zinc-400',
          selected && 'text-zinc-300'
        )}
      >
        {prefix}
      </span>
      <span className="min-w-0">
        <span className={cn('truncate text-zinc-900', selected && 'text-white')}>{title}</span>
        {detail && (
          <span className={cn('ml-1.5 truncate text-zinc-500', selected && 'text-zinc-300')}>
            {detail}
          </span>
        )}
        {meta && (
          <span className={cn('ml-1.5 font-mono text-[10.5px] text-zinc-400', selected && 'text-zinc-300')}>
            {meta}
          </span>
        )}
      </span>
      <span className="flex items-center gap-1">
        {Icon && <Icon className={cn('h-3.5 w-3.5 text-zinc-400', selected && 'text-zinc-300')} />}
        {pill && <ClinicalPill tone={tone}>{pill}</ClinicalPill>}
      </span>
    </Component>
  );
}

