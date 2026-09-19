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
