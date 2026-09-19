import { Bell, CalendarDays, ClipboardList, FlaskConical, Pill } from 'lucide-react';
import { useMemo } from 'react';
import { ClinicalRow } from '../clinical/ClinicalRow';
import { DataSection } from '../clinical/DataSection';
import type { BriefingData } from '@/services/briefingService';
import { compareRoom, compareTime, sortByRoom } from './todayTasks';

interface TodayDomainSectionsProps {
  data: BriefingData;
  onOpenPatient?: (patientId: string, tab?: string) => void;
}

/** Today 하단의 도메인별 목록 (알림 / 항생제 / 최근 Lab / 일정 / 오늘 메모) */
export function TodayDomainSections({ data, onOpenPatient }: TodayDomainSectionsProps) {
  const sortedReminders = useMemo(() => sortByRoom(data.reminders), [data.reminders]);
  const sortedAntibiotics = useMemo(
    () =>
      [...data.antibiotics].sort(
        (a, b) =>
          Number(b.isLongTerm) - Number(a.isLongTerm) ||
          b.dDay - a.dDay ||
          compareRoom(a.roomBed, b.roomBed)
      ),
    [data.antibiotics]
  );
  const sortedLabs = useMemo(
    () =>
      [...data.recentLabs].sort(
        (a, b) =>
          b.abnormalCount - a.abnormalCount ||
          b.dateKey.localeCompare(a.dateKey) ||
          compareRoom(a.roomBed, b.roomBed)
      ),
    [data.recentLabs]
  );
  const sortedSchedules = useMemo(
    () =>
      [...data.todaySchedules].sort(
        (a, b) =>
          Number(a.isCompleted) - Number(b.isCompleted) ||
          compareTime(a.scheduledTime, b.scheduledTime) ||
          compareRoom(a.roomBed, b.roomBed)
      ),
    [data.todaySchedules]
  );
  const sortedProgressNotes = useMemo(() => sortByRoom(data.progressNotes), [data.progressNotes]);

  return (
    <>
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        <DataSection icon={Bell} title="알림" count={data.reminders.length}>
          {data.reminders.length === 0 ? (
            <ClinicalRow prefix="-" title="0" detail="오늘 알림 없음" />
          ) : (
            sortedReminders.map((item) => (
              <ClinicalRow
                key={item.noteId}
                prefix={item.roomBed}
                title={item.patientName}
                detail={item.content}
                onClick={() => onOpenPatient?.(item.patientId, 'notes')}
              />
            ))
          )}
        </DataSection>

        <DataSection icon={Pill} title="항생제" count={data.antibiotics.length}>
          {data.antibiotics.length === 0 ? (
            <ClinicalRow prefix="-" title="0" detail="활성 항생제 없음" />
          ) : (
            sortedAntibiotics.map((item) => (
              <ClinicalRow
                key={item.medicationId}
                prefix={item.roomBed}
                title={item.patientName}
                detail={`${item.drugName} ${item.dosage ?? ''} ${item.frequency ?? ''}`.trim()}
                pill={`D${item.dDay + 1}`}
                tone={item.isLongTerm ? 'danger' : 'warning'}
                onClick={() => onOpenPatient?.(item.patientId, 'medications')}
              />
            ))
          )}
        </DataSection>

        <DataSection icon={FlaskConical} title="최근 Lab" count={data.recentLabs.length}>
          {data.recentLabs.length === 0 ? (
            <ClinicalRow prefix="-" title="0" detail="최근 Lab 없음" />
          ) : (
            sortedLabs.map((item) => (
              <ClinicalRow
                key={`${item.patientId}-${item.dateKey}`}
                prefix={item.roomBed}
                title={item.patientName}
                detail={item.abnormalCount > 0 ? item.abnormalItems.join(', ') : '정상'}
                meta={item.dateKey.slice(5)}
                tone={item.abnormalCount > 0 ? 'danger' : 'muted'}
                pill={String(item.totalItems)}
                onClick={() => onOpenPatient?.(item.patientId, 'lab')}
              />
            ))
          )}
        </DataSection>

        <DataSection icon={CalendarDays} title="일정" count={data.todaySchedules.length}>
          {data.todaySchedules.length === 0 ? (
            <ClinicalRow prefix="-" title="0" detail="오늘 일정 없음" />
          ) : (
            sortedSchedules.map((item) => (
              <ClinicalRow
                key={item.scheduleId}
                prefix={item.scheduledTime || '-'}
                title={item.patientName}
                detail={item.title}
                meta={item.isCompleted ? '완료' : item.roomBed}
                pill={item.category}
                tone={item.isCompleted ? 'muted' : 'default'}
                onClick={() => onOpenPatient?.(item.patientId, 'schedule')}
              />
            ))
          )}
        </DataSection>
      </div>

      {data.progressNotes.length > 0 && (
        <div className="mt-2">
          <DataSection icon={ClipboardList} title="오늘 메모" count={data.progressNotes.length}>
            {sortedProgressNotes.map((item) => (
              <ClinicalRow
                key={item.noteId}
                prefix={item.roomBed}
                title={item.patientName}
                detail={item.content}
                onClick={() => onOpenPatient?.(item.patientId, 'notes')}
              />
            ))}
          </DataSection>
        </div>
      )}
    </>
  );
}
