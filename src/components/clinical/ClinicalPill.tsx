import { cn } from '@/lib/utils';

export type ClinicalTone = 'default' | 'muted' | 'warning' | 'danger';

const toneClass: Record<ClinicalTone, string> = {
  default: 'border-zinc-200 bg-white text-zinc-700',
  muted: 'border-zinc-200 bg-zinc-50 text-zinc-500',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
};

interface ClinicalPillProps {
  children: React.ReactNode;
  tone?: ClinicalTone;
  className?: string;
}

export function ClinicalPill({ children, tone = 'muted', className }: ClinicalPillProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-md border px-1.5 font-mono text-[10px] font-medium tabular-nums',
        toneClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

