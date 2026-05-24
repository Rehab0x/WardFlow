import { Bell, CalendarDays, ClipboardList, FlaskConical, ListChecks, Pill } from 'lucide-react';
import { useMemo } from 'react';
import type { BriefingData } from '@/services/briefingService';
import { ClinicalRow } from '../clinical/ClinicalRow';
import { DataSection } from '../clinical/DataSection';
import type { WorkspaceTabId } from './WorkspaceTabs';

interface ContextPanelProps {
  patientId: string;
  data: BriefingData;
  onOpenTab?: (tab: WorkspaceTabId) => void;
}

export function ContextPanel({ patientId, data, onOpenTab }: ContextPanelProps) {
  const reminders = useMemo(
    () => data.reminders.filter((item) => item.patientId === patientId),
    [data.reminders, patientId]
  );
  const notes = useMemo(
    () => data.progressNotes.filter((item) => item.patientId === patientId),
    [data.progressNotes, patientId]
  );
  const antibiotics = useMemo(
    () =>
      data.antibiotics
        .filter((item) => item.patientId === patientId)
        .sort((a, b) => Number(b.isLongTerm) - Number(a.isLongTerm) || b.dDay - a.dDay),
    [data.antibiotics, patientId]
  );
  const labs = useMemo(
    () =>
      data.recentLabs
        .filter((item) => item.patientId === patientId)
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [data.recentLabs, patientId]
  );
  const schedules = useMemo(
    () =>
      data.todaySchedules
        .filter((item) => item.patientId === patientId)
        .sort((a, b) => {
          if (a.isCompleted !== b.isCompleted) return Number(a.isCompleted) - Number(b.isCompleted);
          return (a.scheduledTime || '').localeCompare(b.scheduledTime || '', 'ko-KR', {
            numeric: true,
          });
        }),
    [data.todaySchedules, patientId]
  );
  const openSchedules = useMemo(
    () => schedules.filter((item) => !item.isCompleted),
    [schedules]
  );
  const abnormalLabs = useMemo(
    () => labs.filter((item) => item.abnormalCount > 0),
    [labs]
  );
  const taskCount = useMemo(
    () => reminders.length + openSchedules.length + antibiotics.length + abnormalLabs.length,
    [abnormalLabs.length, antibiotics.length, openSchedules.length, reminders.length]
  );

  return (
    <aside className="hidden w-80 shrink-0 border-l border-zinc-200 bg-zinc-50 p-2 xl:block">
      <div className="space-y-2">
        <DataSection icon={ListChecks} title="할 일" count={taskCount}>
          {taskCount === 0 ? (
            <ClinicalRow prefix="-" title="0" detail="오늘 확인할 항목 없음" />
          ) : (
            <>
              {reminders.length > 0 && (
                <ClinicalRow
                  prefix="알림"
                  title={`${reminders.length}건`}
                  detail="메모 확인"
                  tone="warning"
                  onClick={() => onOpenTab?.('notes')}
                />
              )}
              {openSchedules.length > 0 && (
                <ClinicalRow
                  prefix="일정"
                  title={`${openSchedules.length}건`}
                  detail="오늘 일정"
                  onClick={() => onOpenTab?.('schedule')}
                />
              )}
              {antibiotics.length > 0 && (
                <ClinicalRow
                  prefix="항생제"
                  title={`${antibiotics.length}건`}
                  detail="투약 추적"
                  tone="warning"
                  onClick={() => onOpenTab?.('medications')}
                />
              )}
              {abnormalLabs.length > 0 && (
                <ClinicalRow
                  prefix="Lab"
                  title={`${abnormalLabs.length}건`}
                  detail="비정상 확인"
                  tone="danger"
                  onClick={() => onOpenTab?.('lab')}
                />
              )}
            </>
          )}
        </DataSection>

        <DataSection icon={Pill} title="항생제" count={antibiotics.length}>
          {antibiotics.length === 0 ? (
            <ClinicalRow prefix="-" title="0" detail="활성 항생제 없음" />
          ) : (
            antibiotics.map((item) => (
              <ClinicalRow
                key={item.medicationId}
                prefix={`D${item.dDay + 1}`}
                title={item.drugName}
                detail={`${item.dosage ?? ''} ${item.frequency ?? ''}`.trim()}
                tone={item.isLongTerm ? 'danger' : 'warning'}
                pill={item.isLongTerm ? '장기' : undefined}
                onClick={() => onOpenTab?.('medications')}
              />
            ))
          )}
        </DataSection>

        <DataSection icon={Bell} title="알림" count={reminders.length}>
          {reminders.length === 0 ? (
            <ClinicalRow prefix="-" title="0" detail="오늘 알림 없음" />
          ) : (
            reminders.map((item) => (
              <ClinicalRow
                key={item.noteId}
                prefix="오늘"
                title={item.content}
                onClick={() => onOpenTab?.('notes')}
              />
            ))
          )}
        </DataSection>

        <DataSection icon={ClipboardList} title="오늘 메모" count={notes.length}>
          {notes.length === 0 ? (
            <ClinicalRow prefix="-" title="0" detail="오늘 메모 없음" />
          ) : (
            notes.map((item) => (
              <ClinicalRow
                key={item.noteId}
                prefix={item.roomBed}
                title={item.content}
                onClick={() => onOpenTab?.('notes')}
              />
            ))
          )}
        </DataSection>

        <DataSection icon={FlaskConical} title="최근 Lab" count={labs.length}>
          {labs.length === 0 ? (
            <ClinicalRow prefix="-" title="0" detail="최근 Lab 없음" />
          ) : (
            labs.map((item) => (
              <ClinicalRow
                key={`${item.patientId}-${item.dateKey}`}
                prefix={item.dateKey.slice(5)}
                title={item.abnormalCount > 0 ? item.abnormalItems.join(', ') : '정상'}
                pill={String(item.totalItems)}
                tone={item.abnormalCount > 0 ? 'danger' : 'muted'}
                onClick={() => onOpenTab?.('lab')}
              />
            ))
          )}
        </DataSection>

        <DataSection icon={CalendarDays} title="일정" count={schedules.length}>
          {schedules.length === 0 ? (
            <ClinicalRow prefix="-" title="0" detail="오늘 일정 없음" />
          ) : (
            schedules.map((item) => (
              <ClinicalRow
                key={item.scheduleId}
                prefix={item.scheduledTime || '-'}
                title={item.title}
                meta={item.isCompleted ? '완료' : undefined}
                pill={item.category}
                tone={item.isCompleted ? 'muted' : 'default'}
                onClick={() => onOpenTab?.('schedule')}
              />
            ))
          )}
        </DataSection>
      </div>
    </aside>
  );
}
