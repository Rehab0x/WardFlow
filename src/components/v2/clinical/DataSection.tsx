import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataSectionProps {
  icon?: LucideIcon;
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DataSection({ icon: Icon, title, count, action, children, className }: DataSectionProps) {
  return (
    <section className={cn('rounded-lg border border-zinc-200 bg-white', className)}>
      <div className="flex h-9 items-center gap-2 border-b border-zinc-100 px-3">
        {Icon && <Icon className="h-3.5 w-3.5 text-zinc-500" />}
        <h2 className="text-[12px] font-medium text-zinc-900">{title}</h2>
        {typeof count === 'number' && (
          <span className="font-mono text-[10.5px] text-zinc-400 tabular-nums">{count}</span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}

