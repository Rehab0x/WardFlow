import { AlertTriangle, Bell, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientRowProps {
  roomBed: string;
  name: string;
  sexAge: string;
  selected?: boolean;
  attention?: boolean;
  reminder?: boolean;
  antibiotic?: boolean;
  onClick?: () => void;
}

export function PatientRow({
  roomBed,
  name,
  sexAge,
  selected,
  attention,
  reminder,
  antibiotic,
  onClick,
}: PatientRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'grid h-8 w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 text-left text-[12px] transition-colors',
        selected ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
      )}
    >
      <span className={cn('font-mono text-[10.5px] tabular-nums', selected ? 'text-zinc-300' : 'text-zinc-400')}>
        {roomBed}
      </span>
      <span className="min-w-0 truncate">
        <span className={cn('text-zinc-900', selected && 'text-white')}>{name}</span>
        <span className={cn('ml-1.5 font-mono text-[10.5px]', selected ? 'text-zinc-300' : 'text-zinc-400')}>
          {sexAge}
        </span>
      </span>
      <span className="flex items-center gap-1">
        {attention && <AlertTriangle className={cn('h-3.5 w-3.5', selected ? 'text-red-200' : 'text-red-600')} />}
        {reminder && <Bell className={cn('h-3.5 w-3.5', selected ? 'text-amber-200' : 'text-amber-600')} />}
        {antibiotic && <Pill className={cn('h-3.5 w-3.5', selected ? 'text-zinc-200' : 'text-zinc-500')} />}
      </span>
    </button>
  );
}

