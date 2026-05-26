import { AlertTriangle, Archive, ArrowLeft, Bell, Hash, Pencil, RotateCcw } from 'lucide-react';
import type { Patient } from '@/db/database';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDateInput, formatDetailedAge, formatOnsetElapsedText } from '../clinical/dateLabels';

interface WorkspaceHeaderProps {
  patient: Patient;
  onBack?: () => void;
  onToggleAttention?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  attentionPending?: boolean;
  archivePending?: boolean;
}

export function WorkspaceHeader({
  patient,
  onBack,
  onToggleAttention,
  onEdit,
  onArchive,
  attentionPending = false,
  archivePending = false,
}: WorkspaceHeaderProps) {
  const admissionDays = Math.max(
    0,
    Math.floor((Date.now() - patient.admissionDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const isDischarged = patient.status === 'discharged';
  const ageLabel = formatDetailedAge(patient.birthDate);
  const onsetLabel = formatOnsetElapsedText(patient.onset);

  return (
    <header className="border-b border-zinc-200 bg-white px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          <IconButton
            className="mt-0.5 h-7 w-7"
            aria-label="오늘 화면으로 돌아가기"
            tooltip="오늘 화면"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </IconButton>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-[18px] font-medium leading-none tabular-nums text-zinc-900">
                {patient.roomBed}
              </span>
              <h1 className="truncate text-[20px] font-medium leading-none text-zinc-900">
                {patient.name}
              </h1>
              <span className="font-mono text-[11px] text-zinc-400">
                {patient.sex}/{ageLabel}
              </span>
              {patient.attention && (
                <span className="inline-flex h-5 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-1.5 text-[10px] font-medium text-red-700">
                  <AlertTriangle className="h-3 w-3" />
                  주의
                </span>
              )}
              {isDischarged && (
                <span className="inline-flex h-5 items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 text-[10px] font-medium text-zinc-500">
                  퇴원
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Hash className="h-3 w-3 text-zinc-400" />
                {patient.registrationNumber}
              </span>
              <span className="font-mono tabular-nums">
                입원 {formatDateInput(patient.admissionDate)}
              </span>
              {patient.dischargeDate && (
                <span className="font-mono tabular-nums">
                  퇴원 {formatDateInput(patient.dischargeDate)}
                </span>
              )}
              <span className="font-mono tabular-nums">D+{admissionDays + 1}</span>
              <span>{patient.attendingPhysician}</span>
            </div>

            {(patient.chiefComplaint || onsetLabel) && (
              <div className="mt-2 max-w-3xl text-[12px] leading-5 text-zinc-600">
                {patient.chiefComplaint && (
                  <div className="line-clamp-2">
                    <span className="mr-1 font-mono text-[10.5px] text-zinc-400">C/C</span>
                    {patient.chiefComplaint}
                  </div>
                )}
                {onsetLabel && (
                  <span className="mt-1 inline-flex rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10.5px] text-zinc-500 sm:mt-0">
                    {onsetLabel}
                  </span>
                )}
              </div>
            )}

            {(patient.tags?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {patient.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ml-9 flex shrink-0 items-center gap-1 sm:ml-0">
          <IconButton
            aria-label={patient.attention ? '주의 표시 해제' : '주의 표시'}
            tooltip={patient.attention ? '주의 표시 해제' : '주의 표시'}
            active={patient.attention}
            disabled={attentionPending}
            aria-busy={attentionPending}
            onClick={onToggleAttention}
          >
            <Bell className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label="환자 정보 수정" tooltip="환자 정보 수정" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton
            aria-label={isDischarged ? '퇴원 취소' : '퇴원 처리'}
            tooltip={isDischarged ? '퇴원 취소' : '퇴원 처리'}
            disabled={archivePending}
            aria-busy={archivePending}
            onClick={onArchive}
          >
            {isDischarged ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </IconButton>
        </div>
      </div>
    </header>
  );
}

function IconButton({
  active,
  className,
  tooltip,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; tooltip?: string }) {
  const button = (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900',
        active &&
          'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 hover:text-amber-700',
        props.disabled && 'cursor-not-allowed opacity-50 hover:bg-white hover:text-zinc-500',
        className
      )}
    >
      {children}
    </button>
  );

  if (!tooltip) return button;

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
