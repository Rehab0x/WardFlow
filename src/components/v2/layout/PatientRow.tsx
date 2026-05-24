import { AlertTriangle, Bell, CalendarDays, FlaskConical, PencilLine, Pill } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/lib/utils';

interface PatientRowProps {
  roomBed: string;
  name: string;
  sexAge: string;
  fullAge?: string;
  chiefComplaint?: string;
  selected?: boolean;
  attention?: boolean;
  reminder?: boolean;
  schedule?: boolean;
  antibiotic?: boolean;
  lab?: boolean;
  changed?: boolean;
  changedDetail?: string;
  onClick?: () => void;
}

export const PatientRow = memo(function PatientRow({
  roomBed,
  name,
  sexAge,
  fullAge,
  chiefComplaint,
  selected,
  attention,
  reminder,
  schedule,
  antibiotic,
  lab,
  changed,
  changedDetail,
  onClick,
}: PatientRowProps) {
  const signals = [
    attention && '주의',
    reminder && '알림',
    schedule && '일정',
    antibiotic && '항생제',
    lab && '비정상 Lab',
    changed && (changedDetail ? `변경 ${changedDetail}` : '변경'),
  ].filter(Boolean);
  const signalLabel = signals.length > 0 ? `, ${signals.join(', ')}` : '';
  const title = [name, fullAge, chiefComplaint, changedDetail && `변경 ${changedDetail}`]
    .filter(Boolean)
    .join(' - ');

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${roomBed} ${name} ${sexAge}${fullAge ? ` ${fullAge}` : ''}${signalLabel}`}
      title={title}
      className={cn(
        'grid h-10 w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 text-left text-[12px] transition-colors',
        selected ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
      )}
    >
      <span
        className={cn(
          'font-mono text-[10.5px] tabular-nums',
          selected ? 'text-zinc-300' : 'text-zinc-400'
        )}
      >
        {roomBed}
      </span>
      <span className="min-w-0">
        <span className="block min-w-0 truncate">
          <span className={cn('text-zinc-900', selected && 'text-white')}>{name}</span>
          <span
            className={cn(
              'ml-1.5 font-mono text-[10.5px]',
              selected ? 'text-zinc-300' : 'text-zinc-400'
            )}
          >
            {sexAge}
          </span>
        </span>
        {chiefComplaint && (
          <span
            className={cn(
              'block truncate text-[10.5px]',
              selected ? 'text-zinc-300' : 'text-zinc-400'
            )}
          >
            {chiefComplaint}
          </span>
        )}
      </span>
      <span className="flex items-center gap-1">
        {attention && (
          <AlertTriangle
            aria-label="주의"
            className={cn('h-3.5 w-3.5', selected ? 'text-red-200' : 'text-red-600')}
          />
        )}
        {reminder && (
          <Bell
            aria-label="알림"
            className={cn('h-3.5 w-3.5', selected ? 'text-amber-200' : 'text-amber-600')}
          />
        )}
        {schedule && (
          <CalendarDays
            aria-label="일정"
            className={cn('h-3.5 w-3.5', selected ? 'text-sky-200' : 'text-sky-600')}
          />
        )}
        {antibiotic && (
          <Pill
            aria-label="항생제"
            className={cn('h-3.5 w-3.5', selected ? 'text-zinc-200' : 'text-zinc-500')}
          />
        )}
        {lab && (
          <FlaskConical
            aria-label="비정상 Lab"
            className={cn('h-3.5 w-3.5', selected ? 'text-red-200' : 'text-red-600')}
          />
        )}
        {changed && (
          <PencilLine
            aria-label={changedDetail ? `변경 ${changedDetail}` : '변경'}
            className={cn('h-3.5 w-3.5', selected ? 'text-emerald-200' : 'text-emerald-600')}
          />
        )}
      </span>
    </button>
  );
});
