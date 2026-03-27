import { db } from '@/db/database';
import type { Patient, LabResult } from '@/db/database';
import { formatDate, daysBetween } from '@/utils/dateUtils';

// --- Types ---

export interface ReminderItem {
  patientId: string;
  patientName: string;
  roomBed: string;
  noteId: string;
  content: string;
}

export interface AntibioticItem {
  patientId: string;
  patientName: string;
  roomBed: string;
  medicationId: string;
  drugName: string;
  dosage?: string;
  frequency?: string;
  dDay: number; // days since start
  isLongTerm: boolean; // D+14 이상
  startDate: Date;
  endDate?: Date;
}

export interface LabSummaryItem {
  patientId: string;
  patientName: string;
  roomBed: string;
  dateKey: string; // YYYY-MM-DD
  abnormalCount: number;
  abnormalItems: string[]; // e.g. ["WBC H", "CRP H"]
  totalItems: number;
}

export interface ScheduleItem {
  patientId: string;
  patientName: string;
  roomBed: string;
  scheduleId: string;
  title: string;
  category: string;
  scheduledTime?: string;
  isCompleted: boolean;
}

export interface ProgressItem {
  patientId: string;
  patientName: string;
  roomBed: string;
  noteId: string;
  content: string;
}

export interface BriefingData {
  // 오늘의 알림 (reminder 메모)
  reminders: ReminderItem[];
  // 오늘의 회진 (progress 메모)
  progressNotes: ProgressItem[];
  // 항생제 현황 (활성 항생제, D-day 순)
  antibiotics: AntibioticItem[];
  // 최근 Lab 결과 (오늘/어제)
  recentLabs: LabSummaryItem[];
  // 오늘의 일정
  todaySchedules: ScheduleItem[];
  // 환자 요약
  patientSummary: {
    total: number;
    admitted: number;
    consult: number;
  };
}

// --- Service ---

/**
 * 전체 환자 대시보드 데이터를 DB에서 직접 집계
 * 스토어를 루핑하지 않고 DB 쿼리로 한번에 조회
 */
export async function fetchBriefingData(userId: string, userRole: string): Promise<BriefingData> {
  // 1. 사용자의 환자 목록 조회
  const patients = await fetchUserPatients(userId, userRole);
  const activePatients = patients.filter(p => p.status === 'active');
  const patientMap = new Map(activePatients.map(p => [p.id, p]));
  const patientIds = activePatients.map(p => p.id);

  // 2. 병렬로 데이터 조회
  const [reminders, progressNotes, antibiotics, recentLabs, todaySchedules] = await Promise.all([
    fetchTodayReminders(patientIds, patientMap),
    fetchTodayProgressNotes(patientIds, patientMap),
    fetchActiveAntibiotics(patientIds, patientMap),
    fetchRecentLabs(patientIds, patientMap),
    fetchTodaySchedules(patientIds, patientMap),
  ]);

  return {
    reminders,
    progressNotes,
    antibiotics,
    recentLabs,
    todaySchedules,
    patientSummary: {
      total: activePatients.length,
      admitted: activePatients.filter(p => p.patientType === 'admitted').length,
      consult: activePatients.filter(p => p.patientType === 'consult').length,
    },
  };
}

async function fetchUserPatients(userId: string, userRole: string): Promise<Patient[]> {
  if (userRole === 'admin') {
    return db.patients.toArray();
  }

  if (userRole === 'doctor') {
    const owned = await db.patients.where('createdBy').equals(userId).toArray();
    const shared = await db.patients.where('sharedWith').equals(userId).toArray();
    const map = new Map<string, Patient>();
    [...owned, ...shared].forEach(p => map.set(p.id, p));
    return Array.from(map.values());
  }

  // nurse, therapist: shared patients only
  return db.patients.where('sharedWith').equals(userId).toArray();
}

async function fetchTodayReminders(
  _patientIds: string[],
  patientMap: Map<string, Patient>,
): Promise<ReminderItem[]> {
  const reminders: ReminderItem[] = [];

  // alertDate 인덱스로 조회
  const allNotes = await db.notes
    .where('alertDate')
    .between(
      new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
      new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 23, 59, 59),
    )
    .toArray();

  for (const note of allNotes) {
    const patient = patientMap.get(note.patientId);
    if (!patient) continue;
    if (note.type !== 'reminder') continue;

    reminders.push({
      patientId: note.patientId,
      patientName: patient.name,
      roomBed: patient.roomBed,
      noteId: note.id,
      content: note.content,
    });
  }

  return reminders;
}

async function fetchTodayProgressNotes(
  _patientIds: string[],
  patientMap: Map<string, Patient>,
): Promise<ProgressItem[]> {
  const progressNotes: ProgressItem[] = [];
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  // 오늘 작성된 경과기록 메모 조회
  const allNotes = await db.notes
    .where('createdAt')
    .between(todayStart, todayEnd)
    .toArray();

  for (const note of allNotes) {
    const patient = patientMap.get(note.patientId);
    if (!patient) continue;
    if (note.type !== 'progress') continue;

    progressNotes.push({
      patientId: note.patientId,
      patientName: patient.name,
      roomBed: patient.roomBed,
      noteId: note.id,
      content: note.content,
    });
  }

  return progressNotes;
}

async function fetchActiveAntibiotics(
  _patientIds: string[],
  patientMap: Map<string, Patient>,
): Promise<AntibioticItem[]> {
  const today = new Date();
  const antibiotics: AntibioticItem[] = [];

  // 전체 투약에서 활성 항생제 필터링 + endDate 지난 건 자동 비활성화
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const allAntibiotics = await db.medications
    .filter(med => med.category === 'antibiotic' && med.isActive)
    .toArray();

  // Auto-deactivate past endDate
  const expired = allAntibiotics.filter(m => m.endDate && new Date(m.endDate) < todayStart);
  for (const m of expired) {
    await db.medications.update(m.id, { isActive: false, updatedAt: new Date() });
  }
  const activeAntibiotics = allAntibiotics.filter(m => !expired.includes(m));

  for (const med of activeAntibiotics) {
    const patient = patientMap.get(med.patientId);
    if (!patient) continue;

    const dDay = daysBetween(med.startDate, today);

    antibiotics.push({
      patientId: med.patientId,
      patientName: patient.name,
      roomBed: patient.roomBed,
      medicationId: med.id,
      drugName: med.drugName,
      dosage: med.dosage,
      frequency: med.frequency,
      dDay,
      isLongTerm: dDay >= 14,
      startDate: med.startDate,
      endDate: med.endDate,
    });
  }

  // D-day 내림차순 (오래된 것 먼저)
  antibiotics.sort((a, b) => b.dDay - a.dDay);

  return antibiotics;
}

async function fetchRecentLabs(
  _patientIds: string[],
  patientMap: Map<string, Patient>,
): Promise<LabSummaryItem[]> {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  // testDate 인덱스로 최근 2일 Lab 조회
  const recentResults = await db.labResults
    .where('testDate')
    .between(startOfYesterday, endOfToday, true, true)
    .toArray();

  // 환자+날짜별 그룹화
  const grouped = new Map<string, { items: LabResult[]; dateKey: string; patientId: string }>();

  for (const lab of recentResults) {
    const patient = patientMap.get(lab.patientId);
    if (!patient) continue;
    if (lab.category === 'Culture') continue; // Culture는 제외

    const dateKey = formatDate(lab.testDate);
    const groupKey = `${lab.patientId}|${dateKey}`;

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, { items: [], dateKey, patientId: lab.patientId });
    }
    grouped.get(groupKey)!.items.push(lab);
  }

  const summaries: LabSummaryItem[] = [];

  for (const [, group] of grouped) {
    const patient = patientMap.get(group.patientId)!;
    let abnormalCount = 0;
    let totalItems = 0;
    const abnormalItems: string[] = [];

    for (const lab of group.items) {
      for (const item of lab.items) {
        totalItems++;
        if (item.isAbnormal) {
          abnormalCount++;
          const flag = item.hlFlag ? ` ${item.hlFlag}` : '';
          abnormalItems.push(`${item.name}${flag}`);
        }
      }
    }

    summaries.push({
      patientId: group.patientId,
      patientName: patient.name,
      roomBed: patient.roomBed,
      dateKey: group.dateKey,
      abnormalCount,
      abnormalItems: abnormalItems.slice(0, 5), // 최대 5개만
      totalItems,
    });
  }

  // 날짜 내림차순, 같은 날이면 병실순
  summaries.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
    return a.roomBed.localeCompare(b.roomBed);
  });

  return summaries;
}

// ── Today's Schedules ──────────────────────────────────

async function fetchTodaySchedules(
  patientIds: string[],
  patientMap: Map<string, Patient>
): Promise<ScheduleItem[]> {
  if (patientIds.length === 0) return [];

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const items: ScheduleItem[] = [];

  for (const pid of patientIds) {
    const schedules = await db.schedules
      .where('[patientId+scheduledDate]')
      .between([pid, todayStart], [pid, todayEnd], true, true)
      .toArray();

    const p = patientMap.get(pid);
    if (!p) continue;

    for (const s of schedules) {
      items.push({
        patientId: pid,
        patientName: p.name,
        roomBed: p.roomBed,
        scheduleId: s.id,
        title: s.title,
        category: s.category,
        scheduledTime: s.scheduledTime,
        isCompleted: s.isCompleted,
      });
    }
  }

  // 시간순 정렬
  items.sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));

  return items;
}
