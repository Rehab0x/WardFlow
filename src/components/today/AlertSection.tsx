import { useMemo, useState } from 'react';
import { BellRing, Check, History, Trash2 } from 'lucide-react';
import { ClinicalRow } from '../clinical/ClinicalRow';
import { DataSection } from '../clinical/DataSection';
import type { AlertEvent } from '@/domain/alert';
import { SEVERITY_LABEL, SEVERITY_ORDER } from '@/services/alertEngine';
import { useAlertStore } from '@/stores/useAlertStore';

const TONE_BY_SEVERITY = {
  critical: 'danger',
  warning: 'warning',
  info: 'default',
} as const;

/**
 * 규칙 알림 + 히스토리.
 * 기본은 확인하지 않은 알림만 보여주고, 토글하면 지난 알림까지 펼친다.
 */
export function AlertSection({
  onOpenPatient,
}: {
  onOpenPatient?: (patientId: string, tab?: string) => void;
}) {
  const { events, acknowledge, removeEvent, clearAcknowledged } = useAlertStore();
  const [showHistory, setShowHistory] = useState(false);

  const { open, acknowledged } = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        b.triggeredAt.getTime() - a.triggeredAt.getTime()
    );
    return {
      open: sorted.filter((event) => !event.acknowledgedAt),
      acknowledged: sorted.filter((event) => event.acknowledgedAt),
    };
  }, [events]);

  const visible = showHistory ? [...open, ...acknowledged] : open;

  // 규칙을 한 번도 안 만들었고 알림도 없으면 섹션 자체를 숨긴다.
  if (events.length === 0) return null;

  return (
    <div className="mb-2">
      <DataSection
        icon={BellRing}
        title="규칙 알림"
        count={open.length}
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={showHistory}
              onClick={() => setShowHistory((current) => !current)}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-zinc-500 hover:bg-zinc-100"
            >
              <History className="h-3.5 w-3.5" />
              {showHistory ? '확인한 알림 숨기기' : `지난 알림 ${acknowledged.length}`}
            </button>
            {showHistory && acknowledged.length > 0 && (
              <button
                type="button"
                onClick={() => void clearAcknowledged()}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                기록 비우기
              </button>
            )}
          </div>
        }
      >
        {visible.length === 0 ? (
          <ClinicalRow prefix="-" title="0" detail="확인할 알림 없음" />
        ) : (
          visible.map((event) => (
            <AlertRow
              key={event.id}
              event={event}
              onOpen={onOpenPatient}
              onAcknowledge={() => void acknowledge(event.id)}
              onRemove={() => void removeEvent(event.id)}
            />
          ))
        )}
      </DataSection>
    </div>
  );
}

function AlertRow({
  event,
  onOpen,
  onAcknowledge,
  onRemove,
}: {
  event: AlertEvent;
  onOpen?: (patientId: string, tab?: string) => void;
  onAcknowledge: () => void;
  onRemove: () => void;
}) {
  const done = Boolean(event.acknowledgedAt);

  return (
    <ClinicalRow
      prefix={SEVERITY_LABEL[event.severity]}
      title={event.title}
      detail={event.message}
      tone={done ? 'muted' : TONE_BY_SEVERITY[event.severity]}
      meta={event.ruleName}
      onClick={onOpen ? () => onOpen(event.patientId, 'lab') : undefined}
      action={
        <span className="flex items-center gap-1">
          {!done && (
            <button
              type="button"
              aria-label="알림 확인"
              title="확인 처리"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onAcknowledge();
              }}
              className="rounded-md border border-zinc-200 px-1.5 py-0.5 text-[10.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Check className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            aria-label="알림 삭제"
            title="삭제"
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              onRemove();
            }}
            className="rounded-md border border-zinc-200 px-1.5 py-0.5 text-[10.5px] text-zinc-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </span>
      }
    />
  );
}
