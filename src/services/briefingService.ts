import { formatDate, daysBetween } from '@/utils/dateUtils';
import {
  listActivePatientBriefingRows,
  type ActivePatientBriefingRow,
} from '@/data/patients.repository';
import { listActiveAntibioticsByPatientIds } from '@/data/medications.repository';
import { listLabSummaryRowsByPatientIdsDateRange } from '@/data/labs.repository';
import {
  listProgressNotesByPatientIdsCreatedBetween,
  listReminderNotesByPatientIdsAndAlertDate,
} from '@/data/notes.repository';
import { listSchedulesByPatientIdsAndDate } from '@/data/schedules.repository';

type BriefingPatient = {
  patientType: 'admitted' | 'consult';
  status: string;
};

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
/**
 * 전체 환자 대시보드 데이터를 서버에서 직접 집계한다.
 * 스토어를 루핑하지 않고 활성 환자 ID로 스코프된 쿼리를 병렬 실행한다.
 * (userId/userRole은 Supabase RLS가 강제하므로 시그니처 호환용으로만 받는다.)
 */
export async function fetchBriefingData(
  _userId: string,
  _userRole: string
): Promise<BriefingData> {
  const activePatients = await listActivePatientBriefingRows();
  const patientMap = new Map(activePatients.map((patient) => [patient.id, patient]));
  const activePatientIds = activePatients.map((patient) => patient.id);
  const patientSummary = buildPatientSummary(activePatients);

  if (activePatientIds.length === 0) {
    return {
      reminders: [],
      progressNotes: [],
      antibiotics: [],
      recentLabs: [],
      todaySchedules: [],
      patientSummary,
    };
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const [reminderNotes, progressNotes, antibiotics, schedules, recentLabs] = await Promise.all([
    listReminderNotesByPatientIdsAndAlertDate(activePatientIds, today),
    listProgressNotesByPatientIdsCreatedBetween(activePatientIds, todayStart, todayEnd),
    listActiveAntibioticsByPatientIds(activePatientIds),
    listSchedulesByPatientIdsAndDate(activePatientIds, today),
    fetchRecentLabSummaries(patientMap),
  ]);

  return {
    reminders: reminderNotes
      .map((note) => {
        const patient = patientMap.get(note.patientId);
        if (!patient) return null;
        return {
          patientId: note.patientId,
          patientName: patient.name,
          roomBed: patient.roomBed,
          noteId: note.id,
          content: note.content,
        };
      })
      .filter((item): item is ReminderItem => item !== null),
    progressNotes: progressNotes
      .map((note) => {
        const patient = patientMap.get(note.patientId);
        if (!patient) return null;
        return {
          patientId: note.patientId,
          patientName: patient.name,
          roomBed: patient.roomBed,
          noteId: note.id,
          content: note.content,
        };
      })
      .filter((item): item is ProgressItem => item !== null),
    antibiotics: antibiotics
      .map((medication): AntibioticItem | null => {
        const patient = patientMap.get(medication.patientId);
        if (!patient) return null;
        const dDay = daysBetween(medication.startDate, today);
        return {
          patientId: medication.patientId,
          patientName: patient.name,
          roomBed: patient.roomBed,
          medicationId: medication.id,
          drugName: medication.drugName,
          dosage: medication.dosage,
          frequency: medication.frequency,
          dDay,
          isLongTerm: dDay >= 14,
          startDate: medication.startDate,
          endDate: medication.endDate,
        };
      })
      .filter((item): item is AntibioticItem => item !== null)
      .sort((a, b) => b.dDay - a.dDay),
    recentLabs,
    todaySchedules: schedules
      .map((schedule): ScheduleItem | null => {
        const patient = patientMap.get(schedule.patientId);
        if (!patient) return null;
        return {
          patientId: schedule.patientId,
          patientName: patient.name,
          roomBed: patient.roomBed,
          scheduleId: schedule.id,
          title: schedule.title,
          category: schedule.category,
          scheduledTime: schedule.scheduledTime,
          isCompleted: schedule.isCompleted,
        };
      })
      .filter((item): item is ScheduleItem => item !== null)
      .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || '')),
    patientSummary,
  };
}

async function fetchRecentLabSummaries(patientMap: Map<string, ActivePatientBriefingRow>): Promise<LabSummaryItem[]> {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  const summaries: LabSummaryItem[] = [];

  const recentLabs = await listLabSummaryRowsByPatientIdsDateRange(
    Array.from(patientMap.keys()),
    startOfYesterday,
    endOfToday
  );
  const grouped = new Map<string, { patientId: string; dateKey: string; labs: typeof recentLabs }>();

  for (const lab of recentLabs) {
    const patient = patientMap.get(lab.patientId);
    if (!patient) continue;
    if (lab.category === 'Culture') continue;

    const dateKey = formatDate(lab.testDate);
    const groupKey = `${lab.patientId}|${dateKey}`;
    const group = grouped.get(groupKey) ?? { patientId: lab.patientId, dateKey, labs: [] };
    group.labs.push(lab);
    grouped.set(groupKey, group);
  }

  for (const { patientId, dateKey, labs } of grouped.values()) {
    const patient = patientMap.get(patientId);
    if (!patient) continue;

    let abnormalCount = 0;
    let totalItems = 0;
    const abnormalItems: string[] = [];

    for (const lab of labs) {
      for (const item of lab.items) {
        totalItems++;
        if (!item.isAbnormal) continue;
        abnormalCount++;
        const flag = item.hlFlag ? ` ${item.hlFlag}` : '';
        abnormalItems.push(`${item.name}${flag}`);
      }
    }

    summaries.push({
      patientId,
      patientName: patient.name,
      roomBed: patient.roomBed,
      dateKey,
      abnormalCount,
      abnormalItems: abnormalItems.slice(0, 5),
      totalItems,
    });
  }

  return summaries.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
    return a.roomBed.localeCompare(b.roomBed);
  });
}

function buildPatientSummary(patients: Array<Pick<BriefingPatient, 'status' | 'patientType'>>) {
  let total = 0;
  let admitted = 0;
  let consult = 0;

  for (const patient of patients) {
    if (patient.status !== 'active') continue;
    total++;
    if (patient.patientType === 'admitted') admitted++;
    if (patient.patientType === 'consult') consult++;
  }

  return { total, admitted, consult };
}

/**
 * 하루치 신호만 모아 온다 — 환자 목록의 기준일을 오늘이 아닌 날로 바꿨을 때.
 *
 * Today 브리핑을 통째로 다시 부르지 않는다. 필요한 것은 그 날짜의
 * 메모·알림·일정뿐이고, 항생제·Lab은 날짜에 묶이는 신호가 아니다.
 */
export async function fetchDayScopedNotes(
  patientIds: string[],
  date: Date
): Promise<{
  reminders: Array<{ patientId: string }>;
  progressNotes: Array<{ patientId: string }>;
  schedules: Array<{ patientId: string }>;
}> {
  if (patientIds.length === 0) {
    return { reminders: [], progressNotes: [], schedules: [] };
  }

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const [reminders, progressNotes, schedules] = await Promise.all([
    listReminderNotesByPatientIdsAndAlertDate(patientIds, date),
    listProgressNotesByPatientIdsCreatedBetween(patientIds, dayStart, dayEnd),
    listSchedulesByPatientIdsAndDate(patientIds, date),
  ]);

  return { reminders, progressNotes, schedules };
}
