import type { BriefingData } from '@/services/briefingService';

export type TaskFilter = 'all' | 'reminder' | 'schedule' | 'antibiotic' | 'lab';
export type TaskSort = 'priority' | 'room';

export type TaskRow = {
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

export type TaskFilterOption = {
  value: TaskFilter;
  label: string;
  count: number;
};

export function buildTaskRows(data: BriefingData): TaskRow[] {
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

export function sortTaskRows(rows: TaskRow[], sort: TaskSort) {
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

export function getSchedulePriority(time?: string) {
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

export function compareRoom(left: string, right: string) {
  return left.localeCompare(right, 'ko-KR', { numeric: true });
}

export function compareTime(left?: string, right?: string) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, 'ko-KR', { numeric: true });
}

export function sortByRoom<T extends { roomBed: string }>(items: T[]) {
  return [...items].sort((a, b) => compareRoom(a.roomBed, b.roomBed));
}

export function buildTaskFilterOptions(rows: TaskRow[]): TaskFilterOption[] {
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

export function summarizeTaskRows(rows: TaskRow[]) {
  let urgent = 0;
  let lateOrSoonSchedule = 0;

  for (const row of rows) {
    if (row.tone === 'danger') urgent++;
    if (row.kindId === 'schedule' && row.priority <= 15) lateOrSoonSchedule++;
  }

  return { urgent, lateOrSoonSchedule };
}

export function getTaskEmptyText(filter: TaskFilter) {
  if (filter === 'reminder') return '오늘 알림 없음';
  if (filter === 'schedule') return '오늘 일정 없음';
  if (filter === 'antibiotic') return '활성 항생제 없음';
  if (filter === 'lab') return '확인할 비정상 Lab 없음';

  return '오늘 확인할 항목 없음';
}
