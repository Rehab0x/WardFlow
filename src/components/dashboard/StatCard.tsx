import { cn } from '@/lib/utils';

type Tone = 'default' | 'warning' | 'danger';

const toneText: Record<Tone, string> = {
  default: 'text-zinc-900',
  warning: 'text-amber-600',
  danger: 'text-red-600',
};

export function StatCard({
  label,
  value,
  tone = 'default',
  onClick,
}: {
  label: string;
  value: number | string;
  tone?: Tone;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left',
        onClick && 'transition-colors hover:bg-zinc-50',
      )}
    >
      <div className="text-[11px] text-zinc-400">{label}</div>
      <div
        className={cn(
          'mt-0.5 font-mono text-[22px] font-medium leading-none tracking-tight tabular-nums',
          toneText[tone],
        )}
      >
        {value}
      </div>
    </Wrapper>
  );
}
