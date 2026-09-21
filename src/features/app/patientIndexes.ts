import type { Patient } from '@/types/patient';
import type { BriefingData } from '@/services/briefingService';
import type { PatientRailIndicators } from '@/components/layout/PatientRail';
import { normalizeRegistrationNumber } from '@/lib/registrationNumber';

export type PatientSearchRow = {
  patient: Patient;
  text: string;
};


export type PatientListIndexes = {
  summary: BriefingData['patientSummary'];
  patientsById: Map<string, Patient>;
  registrationNumbers: Map<string, string>;
  searchRows: PatientSearchRow[];
};


export function filterPatients(searchRows: PatientSearchRow[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return searchRows.filter((row) => row.text.includes(normalized)).map((row) => row.patient);
}

export function buildPatientIndexes(patients: Patient[]): PatientListIndexes {
  let total = 0;
  let admitted = 0;
  let consult = 0;
  const registrationNumbers = new Map<string, string>();
  const patientsById = new Map<string, Patient>();
  const searchRows: PatientSearchRow[] = [];

  for (const patient of patients) {
    patientsById.set(patient.id, patient);
    const registrationNumber = normalizeRegistrationNumber(patient.registrationNumber);
    if (registrationNumber) registrationNumbers.set(registrationNumber, patient.id);

    if (patient.status === 'active') {
      total++;
      if (patient.patientType === 'admitted') admitted++;
      if (patient.patientType === 'consult') consult++;
    }

    searchRows.push({
      patient,
      text: [
        patient.roomBed,
        patient.name,
        patient.registrationNumber,
        patient.chiefComplaint,
        patient.attendingPhysician,
        ...(patient.tags ?? []),
      ]
        .join(' ')
        .toLowerCase(),
    });
  }

  return {
    summary: { total, admitted, consult },
    patientsById,
    registrationNumbers,
    searchRows,
  };
}

export function buildPatientIndicators(
  patientsById: Map<string, Patient>,
  data: BriefingData
): Record<string, PatientRailIndicators> {
  const indicators: Record<string, PatientRailIndicators> = {};

  // 오늘 작성된 경과기록 — 대화 정리로 들어온 SOAP도 여기로 저장된다(type: 'progress').
  for (const item of data.progressNotes) {
    if (!patientsById.has(item.patientId)) continue;
    (indicators[item.patientId] ??= {}).note = true;
  }
  for (const item of data.reminders) {
    if (!patientsById.has(item.patientId)) continue;
    (indicators[item.patientId] ??= {}).reminder = true;
  }
  for (const item of data.antibiotics) {
    if (!patientsById.has(item.patientId)) continue;
    (indicators[item.patientId] ??= {}).antibiotic = true;
  }
  for (const item of data.todaySchedules) {
    if (!patientsById.has(item.patientId)) continue;
    (indicators[item.patientId] ??= {}).schedule = true;
  }
  for (const item of data.recentLabs) {
    if (!patientsById.has(item.patientId)) continue;
    if (item.abnormalCount === 0) continue;
    (indicators[item.patientId] ??= {}).lab = true;
  }

  return indicators;
}

/**
 * 특정 날짜 기준 인디케이터 — 환자 목록의 기준일을 바꿀 때 쓴다.
 *
 * 날짜에 묶이는 신호만 담는다(메모·알림·일정). 항생제와 Lab은 "지금 상태"라
 * 과거 날짜에 붙이면 뜻이 흐려지므로 넣지 않는다.
 */
export function buildDayIndicators(input: {
  reminders: Array<{ patientId: string }>;
  progressNotes: Array<{ patientId: string }>;
  schedules: Array<{ patientId: string }>;
  /** 현재 목록에 있는 환자만 남긴다 */
  patientsById: Map<string, Patient>;
}): Record<string, PatientRailIndicators> {
  const indicators: Record<string, PatientRailIndicators> = {};
  const mark = (patientId: string, key: 'note' | 'reminder' | 'schedule') => {
    if (!input.patientsById.has(patientId)) return;
    (indicators[patientId] ??= {})[key] = true;
  };

  for (const item of input.progressNotes) mark(item.patientId, 'note');
  for (const item of input.reminders) mark(item.patientId, 'reminder');
  for (const item of input.schedules) mark(item.patientId, 'schedule');

  return indicators;
}
