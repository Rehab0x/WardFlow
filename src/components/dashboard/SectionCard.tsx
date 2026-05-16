import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SectionCard({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count?: string | number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3.5">
      <header className="mb-2.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.8} />
        <h3 className="text-[12px] font-medium text-zinc-900">{title}</h3>
        {count !== undefined && (
          <span className="ml-auto font-mono text-[11px] text-zinc-400">{count}</span>
        )}
      </header>
      <div className="space-y-px">{children}</div>
    </section>
  );
}

export function Row({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2 rounded py-0.5 text-left text-[12px] transition-colors hover:bg-zinc-50"
      >
        {children}
      </button>
    );
  }
  return <div className="flex items-center gap-2 py-0.5 text-[12px]">{children}</div>;
}

export function Room({ children }: { children: React.ReactNode }) {
  return (
    <span className="min-w-[38px] font-mono text-[10.5px] text-zinc-400">{children}</span>
  );
}

export function Time({ children }: { children: React.ReactNode }) {
  return (
    <span className="min-w-[38px] font-mono text-[10.5px] text-zinc-400">{children}</span>
  );
}

export function Body({ children }: { children: React.ReactNode }) {
  return <span className="min-w-0 flex-1 truncate text-zinc-700">{children}</span>;
}

export function Pill({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'warning' | 'danger' | 'muted';
}) {
  const styles = {
    default: 'bg-zinc-100 text-zinc-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    muted: 'bg-zinc-50 text-zinc-500',
  }[tone];
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-px font-mono text-[10px] font-medium',
        styles,
      )}
    >
      {children}
    </span>
  );
}

export function Metric({
  value,
  tone = 'default',
}: {
  value: string;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const c = {
    default: 'text-zinc-700',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  }[tone];
  return <span className={cn('font-mono', c)}>{value}</span>;
}
