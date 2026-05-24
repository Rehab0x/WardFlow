import {
  ArrowRight,
  Bell,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  ListChecks,
  Pill,
  Search,
} from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { Patient } from '@/db/database';
import type { BriefingData } from '@/services/briefingService';
import { ClinicalRow } from '../clinical/ClinicalRow';
import { DataSection } from '../clinical/DataSection';
import { formatAgeYears } from '../clinical/dateLabels';
import { MetricTile } from '../clinical/MetricTile';

interface TodayDashboardProps {
  data: BriefingData;
  date?: Date;
  subtitle?: string;
  previewChangeSummary?: Array<{ label: string; count: number }>;
  changedPatients?: Array<{ patient: Patient; detail: string }>;
  searchResults?: Patient[];
  searchQuery?: string;
  isLoading?: boolean;
  action?: ReactNode;
  onOpenPatient?: (patientId: string, tab?: string) => void;
}

type TaskFilter = 'all' | 'reminder' | 'schedule' | 'antibiotic' | 'lab';
type TaskSort = 'priority' | 'room';

type TaskRow = {
  id: string;
  kindId: Exclude<TaskFilter, 'all'>;
  patientId: string;
  patientName: string;
  roomBed: string;
  kind: string;
  detail: string;
  meta?: string;
  tab: string;
  priority: number;
  tone?: 'default' | 'warning' | 'danger' | 'muted';
};

type TaskFilterOption = {
  value: TaskFilter;
  label: string;
  count: number;
};

export function TodayDashboard({
  data,
  date = new Date(),
  subtitle,
  previewChangeSummary = [],
  changedPatients = [],
  searchResults = [],
  searchQuery,
  isLoading = false,
  action,
  onOpenPatient,
}: TodayDashboardProps) {
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [taskSort, setTaskSort] = useState<TaskSort>('priority');
  const showAllTasks = useCallback(() => setTaskFilter('all'), []);
  const showScheduleTasks = useCallback(() => setTaskFilter('schedule'), []);
  const showReminderTasks = useCallback(() => setTaskFilter('reminder'), []);
  const showAntibioticTasks = useCallback(() => setTaskFilter('antibiotic'), []);
  const showLabTasks = useCallback(() => setTaskFilter('lab'), []);
  const reminderCount = data.reminders.length;
  const antibioticCount = data.antibiotics.length;
  const abnormalLabCount = useMemo(
    () => data.recentLabs.filter((lab) => lab.abnormalCount > 0).length,
    [data.recentLabs]
  );
  const openScheduleCount = useMemo(
    () => data.todaySchedules.filter((item) => !item.isCompleted).length,
    [data.todaySchedules]
  );
  const taskRows = useMemo(
    () => buildTaskRows(data),
    [data.reminders, data.todaySchedules, data.antibiotics, data.recentLabs]
  );
  const visibleTaskRows = useMemo(
    () =>
      sortTaskRows(
        taskFilter === 'all' ? taskRows : taskRows.filter((item) => item.kindId === taskFilter),
        taskSort
      ),
    [taskFilter, taskRows, taskSort]
  );
  const taskFilterOptions = useMemo(() => buildTaskFilterOptions(taskRows), [taskRows]);
  const hasSearch = useMemo(() => Boolean(searchQuery?.trim()), [searchQuery]);
  const firstTask = visibleTaskRows[0];
  const dateLabel = useMemo(
    () =>
      date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }),
    [date]
  );
  const taskSummary = useMemo(() => summarizeTaskRows(taskRows), [taskRows]);
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
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-medium leading-tight tracking-tight">오늘</h1>
          <p className="mt-0.5 text-[12px] text-zinc-400">
            {dateLabel}
          </p>
        </div>
        {(subtitle || action) && (
          <div className="flex shrink-0 items-center gap-2">
            {isLoading && (
              <span className="inline-flex h-6 items-center rounded-md border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-500">
                갱신 중
              </span>
            )}
            {subtitle && <span className="text-[12px] text-zinc-400">{subtitle}</span>}
            {action}
          </div>
        )}
      </div>

      {hasSearch && (
        <div className="mb-3">
          <DataSection icon={Search} title="검색 결과" count={searchResults.length}>
            {searchResults.length === 0 ? (
              <ClinicalRow prefix="-" title="0" detail="일치하는 환자 없음" />
            ) : (
              searchResults.map((patient) => (
                <ClinicalRow
                  key={patient.id}
                  prefix={patient.roomBed}
                  title={patient.name}
                  detail={`${patient.registrationNumber} - ${patient.sex}/${formatAgeYears(patient.birthDate)}`}
                  meta={patient.patientType === 'consult' ? '협진' : '입원'}
                  pill={patient.attention ? '주의' : undefined}
                  tone={patient.attention ? 'warning' : 'default'}
                  onClick={() => onOpenPatient?.(patient.id)}
                />
              ))
            )}
          </DataSection>
        </div>
      )}

      {previewChangeSummary.length > 0 && (
        <div className="mb-3 md:hidden">
          <DataSection title="프리뷰 변경" count={previewChangeSummary.length}>
            <div className="flex flex-wrap gap-1 p-2">
              {previewChangeSummary.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-[11px] text-zinc-600"
                >
                  <span>{item.label}</span>
                  <span className="font-mono tabular-nums text-zinc-900">{item.count}</span>
                </span>
              ))}
            </div>
          </DataSection>
        </div>
      )}

      {!hasSearch && changedPatients.length > 0 && (
        <div className="mb-3">
          <DataSection icon={ClipboardList} title="변경 환자" count={changedPatients.length}>
            {changedPatients.map(({ patient, detail }) => (
              <ClinicalRow
                key={patient.id}
                prefix={patient.roomBed}
                title={patient.name}
                detail={detail}
                meta={patient.status === 'discharged' ? '퇴원' : patient.patientType === 'consult' ? '협진' : '입원'}
                pill="변경"
                tone="muted"
                onClick={() => onOpenPatient?.(patient.id)}
              />
            ))}
          </DataSection>
        </div>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        <MetricTile label="입원" value={data.patientSummary.admitted} />
        <MetricTile label="협진" value={data.patientSummary.consult} />
        <MetricTile
          label="할 일"
          value={taskRows.length}
          tone={taskRows.length > 0 ? 'warning' : 'default'}
          selected={taskFilter === 'all'}
          onClick={showAllTasks}
        />
        <MetricTile
          label="일정"
          value={openScheduleCount}
          tone={openScheduleCount > 0 ? 'warning' : 'default'}
          selected={taskFilter === 'schedule'}
          onClick={showScheduleTasks}
        />
        <MetricTile
          label="알림"
          value={reminderCount}
          tone={reminderCount > 0 ? 'warning' : 'default'}
          selected={taskFilter === 'reminder'}
          onClick={showReminderTasks}
        />
        <MetricTile
          label="항생제"
          value={antibioticCount}
          tone={antibioticCount > 0 ? 'warning' : 'default'}
          selected={taskFilter === 'antibiotic'}
          onClick={showAntibioticTasks}
        />
        <MetricTile
          label="비정상 Lab"
          value={abnormalLabCount}
          tone={abnormalLabCount > 0 ? 'danger' : 'default'}
          selected={taskFilter === 'lab'}
          onClick={showLabTasks}
        />
      </div>

      <div className="mb-2">
        <DataSection
          icon={ListChecks}
          title="오늘 할 일"
          count={visibleTaskRows.length}
          action={
            <div className="flex max-w-[calc(100vw-4rem)] items-center gap-1 overflow-x-auto md:max-w-none">
              <TaskSortControl value={taskSort} onChange={setTaskSort} />
              <TaskFilterControl
                value={taskFilter}
                options={taskFilterOptions}
                onChange={setTaskFilter}
              />
            </div>
          }
        >
          {taskRows.length > 0 && (
            <div className="grid grid-cols-1 gap-1 border-b border-zinc-100 bg-zinc-50 px-2 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
                <span className="font-medium text-zinc-700">전체 {taskRows.length}</span>
                <span>긴급 {taskSummary.urgent}</span>
                <span>임박 일정 {taskSummary.lateOrSoonSchedule}</span>
                {firstTask && (
                  <span className="min-w-0 truncate">
                    다음 {firstTask.roomBed} {firstTask.patientName} · {firstTask.detail}
                  </span>
                )}
              </div>
              {firstTask && (
                <button
                  type="button"
                  onClick={() => onOpenPatient?.(firstTask.patientId, firstTask.tab)}
                  className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-zinc-900 px-2 text-[11px] font-medium text-white transition-colors hover:bg-zinc-700"
                >
                  열기
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {visibleTaskRows.length === 0 ? (
            <ClinicalRow prefix="-" title="0" detail={getTaskEmptyText(taskFilter)} />
          ) : (
            visibleTaskRows.map((item) => (
              <ClinicalRow
                key={item.id}
                prefix={item.roomBed}
                title={item.patientName}
                detail={item.detail}
                meta={item.meta}
                pill={item.kind}
                tone={item.tone}
                onClick={() => onOpenPatient?.(item.patientId, item.tab)}
              />
            ))
          )}
        </DataSection>
      </div>

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

function buildTaskRows(data: BriefingData): TaskRow[] {
  return [
    ...data.reminders.map((item): TaskRow => ({
      id: `reminder-${item.noteId}`,
      kindId: 'reminder',
      patientId: item.patientId,
      patientName: item.patientName,
      roomBed: item.roomBed,
      kind: '알림',
      detail: item.content,
      meta: '오늘',
      tab: 'notes',
      priority: 10,
      tone: 'warning',
    })),
    ...data.todaySchedules
      .filter((item) => !item.isCompleted)
      .map((item): TaskRow => ({
        id: `schedule-${item.scheduleId}`,
        kindId: 'schedule',
        patientId: item.patientId,
        patientName: item.patientName,
        roomBed: item.roomBed,
        kind: item.category,
        detail: item.title,
        meta: item.scheduledTime,
        tab: 'schedule',
        priority: getSchedulePriority(item.scheduledTime),
        tone: getSchedulePriority(item.scheduledTime) <= 15 ? 'warning' : 'default',
      })),
    ...data.antibiotics.map((item): TaskRow => ({
      id: `antibiotic-${item.medicationId}`,
      kindId: 'antibiotic',
      patientId: item.patientId,
      patientName: item.patientName,
      roomBed: item.roomBed,
      kind: '항생제',
      detail: `${item.drugName} ${item.dosage ?? ''} ${item.frequency ?? ''}`.trim(),
      meta: `D${item.dDay + 1}`,
      tab: 'medications',
      priority: item.isLongTerm ? 20 : 50,
      tone: item.isLongTerm ? 'danger' : 'warning',
    })),
    ...data.recentLabs
      .filter((item) => item.abnormalCount > 0)
      .map((item): TaskRow => ({
        id: `lab-${item.patientId}-${item.dateKey}`,
        kindId: 'lab',
        patientId: item.patientId,
        patientName: item.patientName,
        roomBed: item.roomBed,
        kind: 'Lab',
        detail: item.abnormalItems.join(', '),
        meta: item.dateKey.slice(5),
        tab: 'lab',
        priority: item.abnormalCount >= 2 ? 25 : 40,
        tone: 'danger',
      })),
  ];
}

function sortTaskRows(rows: TaskRow[], sort: TaskSort) {
  return [...rows].sort((a, b) => {
    if (sort === 'room') {
      const roomCompare = compareRoom(a.roomBed, b.roomBed);
      if (roomCompare !== 0) return roomCompare;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.kind.localeCompare(b.kind, 'ko-KR');
    }

    if (a.priority !== b.priority) return a.priority - b.priority;
    const roomCompare = compareRoom(a.roomBed, b.roomBed);
    if (roomCompare !== 0) return roomCompare;
    return a.kind.localeCompare(b.kind, 'ko-KR');
  });
}

function getSchedulePriority(time?: string) {
  if (!time) return 45;

  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 45;

  const now = new Date();
  const scheduledMinutes = hour * 60 + minute;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (scheduledMinutes < currentMinutes) return 12;
  if (scheduledMinutes - currentMinutes <= 60) return 15;
  return 45;
}

function compareRoom(left: string, right: string) {
  return left.localeCompare(right, 'ko-KR', { numeric: true });
}

function compareTime(left?: string, right?: string) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, 'ko-KR', { numeric: true });
}

function sortByRoom<T extends { roomBed: string }>(items: T[]) {
  return [...items].sort((a, b) => compareRoom(a.roomBed, b.roomBed));
}

function buildTaskFilterOptions(rows: TaskRow[]): TaskFilterOption[] {
  const counts: Record<TaskFilter, number> = {
    all: rows.length,
    reminder: 0,
    schedule: 0,
    antibiotic: 0,
    lab: 0,
  };

  for (const row of rows) {
    counts[row.kindId]++;
  }

  return [
    { value: 'all', label: '전체', count: counts.all },
    { value: 'reminder', label: '알림', count: counts.reminder },
    { value: 'schedule', label: '일정', count: counts.schedule },
    { value: 'antibiotic', label: '항생제', count: counts.antibiotic },
    { value: 'lab', label: 'Lab', count: counts.lab },
  ];
}

function summarizeTaskRows(rows: TaskRow[]) {
  let urgent = 0;
  let lateOrSoonSchedule = 0;

  for (const row of rows) {
    if (row.tone === 'danger') urgent++;
    if (row.kindId === 'schedule' && row.priority <= 15) lateOrSoonSchedule++;
  }

  return { urgent, lateOrSoonSchedule };
}

function getTaskEmptyText(filter: TaskFilter) {
  if (filter === 'reminder') return '오늘 알림 없음';
  if (filter === 'schedule') return '오늘 일정 없음';
  if (filter === 'antibiotic') return '활성 항생제 없음';
  if (filter === 'lab') return '확인할 비정상 Lab 없음';

  return '오늘 확인할 항목 없음';
}

function TaskFilterControl({
  value,
  options,
  onChange,
}: {
  value: TaskFilter;
  options: TaskFilterOption[];
  onChange: (value: TaskFilter) => void;
}) {
  return (
    <div className="flex max-w-full overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`inline-flex h-6 shrink-0 items-center gap-1 rounded px-2 text-[11px] font-medium ${
            value === option.value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
          }`}
        >
          <span>{option.label}</span>
          <span className="font-mono text-[10px] tabular-nums">{option.count}</span>
        </button>
      ))}
    </div>
  );
}

function TaskSortControl({
  value,
  onChange,
}: {
  value: TaskSort;
  onChange: (value: TaskSort) => void;
}) {
  return (
    <div className="grid shrink-0 grid-cols-2 rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
      {[
        ['priority', '우선'],
        ['room', '병실'],
      ].map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          aria-pressed={value === optionValue}
          onClick={() => onChange(optionValue as TaskSort)}
          className={`h-6 rounded px-2 text-[11px] font-medium ${
            value === optionValue ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
