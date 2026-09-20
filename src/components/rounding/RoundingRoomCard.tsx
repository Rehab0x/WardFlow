import { memo } from 'react';
import type { BadgeTone } from '@/features/app/roundingBadges';
import type { RoundingRoom } from '@/features/app/roundingList';
import { cn } from '@/lib/utils';
import { formatAgeYears } from '../clinical/dateLabels';

/** 회진 중에는 아이콘보다 글자가 빠르다 — 색과 짧은 글자로 구분한다. */
const TONE_STYLES: Record<BadgeTone, string> = {
  critical: 'border-red-300 bg-red-50 text-red-700',
  warning: 'border-amber-300 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  neutral: 'border-zinc-300 bg-zinc-100 text-zinc-600',
  done: 'border-emerald-300 bg-emerald-50 text-emerald-700',
};

/**
 * 병실 하나. 이름과 플래그만 크게 보여주는 것이 목적이므로
 * 진단명·주호소 같은 부가 정보는 일부러 싣지 않는다 (워크스페이스에서 본다).
 */
export const RoundingRoomCard = memo(function RoundingRoomCard({
  room,
  selectedPatientId,
  onOpenPatient,
}: {
  room: RoundingRoom;
  selectedPatientId?: string;
  onOpenPatient: (patientId: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <header className="flex items-baseline justify-between border-b border-zinc-100 bg-zinc-50/80 px-3 py-2">
        <h3 className="font-mono text-[15px] font-semibold tabular-nums text-zinc-700">
          {room.label}
        </h3>
        <span className="text-[12px] text-zinc-400">{room.patients.length}명</span>
      </header>

      <ul className="divide-y divide-zinc-100">
        {room.patients.map(({ patient, bed, badges }) => {
          const selected = patient.id === selectedPatientId;
          return (
            <li key={patient.id}>
              <button
                type="button"
                onClick={() => onOpenPatient(patient.id)}
                className={cn(
                  'flex min-h-[56px] w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 text-left transition-colors',
                  selected ? 'bg-zinc-900/5' : 'hover:bg-zinc-50'
                )}
              >
                {bed && (
                  <span className="font-mono text-[13px] tabular-nums text-zinc-400">-{bed}</span>
                )}
                <span className="text-[20px] font-semibold leading-tight tracking-tight text-zinc-900">
                  {patient.name}
                </span>
                <span className="font-mono text-[13px] text-zinc-400">
                  {patient.sex}/{formatAgeYears(patient.birthDate)}
                </span>
                {patient.patientType === 'consult' && (
                  <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-[12px] font-medium text-zinc-500">
                    컨설트
                  </span>
                )}

                <span className="flex w-full flex-wrap items-center gap-1">
                  {badges.map((badge) => (
                    <span
                      key={badge.key}
                      title={badge.title}
                      className={cn(
                        'rounded border px-1.5 py-0.5 text-[13px] font-semibold tabular-nums',
                        TONE_STYLES[badge.tone]
                      )}
                    >
                      {badge.label}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
});
