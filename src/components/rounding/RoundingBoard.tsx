import { useMemo } from 'react';
import type { Patient } from '@/types/patient';
import type { BriefingData } from '@/services/briefingService';
import type { OpenLabBreach } from '@/services/alertEngine';
import { buildRoundingBadges } from '@/features/app/roundingBadges';
import { buildRoundingWards, resolveActiveWard } from '@/features/app/roundingList';
import { cn } from '@/lib/utils';
import { RoundingRoomCard } from './RoundingRoomCard';

interface RoundingBoardProps {
  patients: Patient[];
  /** 오늘 Lab·알림·일정·항생제 집계 */
  briefing: BriefingData;
  /** 마지막 검사에서도 임계값에 걸려 있는 항목 — 값이 돌아오면 저절로 사라진다 */
  breaches?: OpenLabBreach[];
  /** 보고 있던 병동 — 환자를 열었다 돌아와도 유지되도록 바깥에서 들고 있는다 */
  activeWard?: string;
  selectedPatientId?: string;
  subtitle?: string;
  isLoading?: boolean;
  onWardChange: (wardKey: string) => void;
  onOpenPatient: (patientId: string) => void;
}

/**
 * 회진용 환자 명단.
 *
 * 병동을 눌러 전환하고, 병실 카드 안에 이름과 플래그만 크게 보여준다.
 * 회진 중에는 걸어 다니면서 한 손으로 보기 때문에 정보 밀도보다 **가독성**이 우선이다.
 */
export function RoundingBoard({
  patients,
  briefing,
  breaches,
  activeWard,
  selectedPatientId,
  subtitle,
  isLoading,
  onWardChange,
  onOpenPatient,
}: RoundingBoardProps) {
  const badges = useMemo(
    () => buildRoundingBadges({ patients, briefing, breaches }),
    [patients, briefing, breaches]
  );
  const wards = useMemo(() => buildRoundingWards(patients, badges), [patients, badges]);
  const currentKey = resolveActiveWard(wards, activeWard);
  const current = wards.find((ward) => ward.key === currentKey);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[20px] font-semibold tracking-tight text-zinc-900">회진</h1>
        <p className="text-[12px] text-zinc-500">
          {subtitle ? `${subtitle} · ` : ''}
          {isLoading ? '불러오는 중' : `${wards.reduce((sum, w) => sum + w.patientCount, 0)}명`}
        </p>
      </header>

      {wards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[13px] text-zinc-500">
          {isLoading ? '환자를 불러오는 중입니다.' : '회진할 환자가 없습니다.'}
        </p>
      ) : (
        <>
          <nav
            aria-label="병동 선택"
            className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1"
          >
            {wards.map((ward) => {
              const active = ward.key === currentKey;
              return (
                <button
                  key={ward.key || 'other'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onWardChange(ward.key)}
                  className={cn(
                    'flex h-11 shrink-0 snap-start items-center gap-2 rounded-lg border px-4 text-[15px] font-semibold transition-colors',
                    active
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  )}
                >
                  {ward.label}
                  <span
                    className={cn(
                      'font-mono text-[13px] font-normal tabular-nums',
                      active ? 'text-zinc-300' : 'text-zinc-400'
                    )}
                  >
                    {ward.patientCount}
                  </span>
                  {ward.flaggedCount > 0 && (
                    <span
                      aria-label={`확인할 환자 ${ward.flaggedCount}명`}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[12px] font-semibold',
                        active ? 'bg-white/15 text-white' : 'bg-red-50 text-red-700'
                      )}
                    >
                      {ward.flaggedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {current && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {current.rooms.map((room) => (
                <RoundingRoomCard
                  key={room.key || room.label}
                  room={room}
                  selectedPatientId={selectedPatientId}
                  onOpenPatient={onOpenPatient}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
