import type { LucideIcon } from 'lucide-react';
import { memo, type ReactNode } from 'react';
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
  action?: ReactNode;
  onClick?: () => void;
}

export const ClinicalRow = memo(function ClinicalRow({
  prefix,
  title,
  detail,
  meta,
  icon: Icon,
  tone = 'default',
  pill,
  selected,
  action,
  onClick,
}: ClinicalRowProps) {
  const Component = onClick && !action ? 'button' : 'div';
  const clickableDiv = onClick && action;
  const rowLabel = [prefix, title, detail, meta, pill].filter(Boolean).join(' ');

  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      aria-label={onClick ? rowLabel : undefined}
      aria-pressed={onClick && selected ? true : undefined}
      title={rowLabel}
      role={clickableDiv ? 'button' : undefined}
      tabIndex={clickableDiv ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickableDiv
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'grid min-h-8 w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2 border-b border-zinc-100 px-2 py-1 text-left text-[12px] sm:grid-cols-[44px_minmax(0,1fr)_auto]',
        onClick && 'cursor-pointer transition-colors hover:bg-zinc-50',
        selected && 'bg-amber-50 text-zinc-900 hover:bg-amber-50'
      )}
    >
      <span
        className={cn(
          'font-mono text-[10.5px] tabular-nums text-zinc-400',
          selected && 'text-amber-700'
        )}
      >
        {prefix}
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="min-w-0 truncate text-zinc-900">{title}</span>
          {meta && (
            <span className={cn('shrink-0 font-mono text-[10.5px] text-zinc-400', selected && 'text-amber-700')}>
              {meta}
            </span>
          )}
        </span>
        {detail && (
          <span className={cn('block min-w-0 truncate text-[11px] text-zinc-500 sm:inline sm:text-[12px]', selected && 'text-zinc-700')}>
            <span className="hidden sm:inline"> </span>
            {detail}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {Icon && <Icon className={cn('h-3.5 w-3.5 text-zinc-400', selected && 'text-amber-700')} />}
        {pill && <ClinicalPill tone={tone}>{pill}</ClinicalPill>}
        {action}
      </span>
    </Component>
  );
});

