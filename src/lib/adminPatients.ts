import type { Patient } from '@/db/database';
import type { User, UserRole, UserStatus } from '@/types/user';

export type AdminPatientStatusFilter = 'all' | 'active' | 'discharged' | 'attention';

export interface PatientOwnershipEntry {
  doctorId: string;
  doctorName: string;
  department: string;
  status?: UserStatus;
  role?: UserRole;
  active: Patient[];
  discharged: Patient[];
  admittedCount: number;
  consultCount: number;
  attentionCount: number;
}

export interface AdminPatientCounts {
  all: number;
  active: number;
  discharged: number;
  attention: number;
}

export function comparePatientForAdmin(a: Patient, b: Patient) {
  const roomCompare = a.roomBed.localeCompare(b.roomBed, undefined, { numeric: true });
  if (roomCompare !== 0) return roomCompare;
  return a.name.localeCompare(b.name, 'ko-KR');
}

export function countAdminPatients(patients: Patient[]): AdminPatientCounts {
  return patients.reduce(
    (counts, patient) => {
      counts.all += 1;
      if (patient.status === 'active') counts.active += 1;
      else counts.discharged += 1;
      if (patient.attention) counts.attention += 1;
      return counts;
    },
    { all: 0, active: 0, discharged: 0, attention: 0 }
  );
}

export function filterAdminPatients(
  patients: Patient[],
  query: string,
  status: AdminPatientStatusFilter
): Patient[] {
  const normalizedQuery = query.trim().toLowerCase();
  return patients.filter((patient) => {
    if (status === 'active' && patient.status !== 'active') return false;
    if (status === 'discharged' && patient.status !== 'discharged') return false;
    if (status === 'attention' && !patient.attention) return false;
    if (!normalizedQuery) return true;

    return [
      patient.name,
      patient.registrationNumber,
      patient.roomBed,
      patient.attendingPhysician,
      patient.chiefComplaint,
      patient.presentIllness,
      patient.tags?.join(' ') ?? '',
      patient.patientType === 'admitted' ? '입원' : '협진',
      patient.status === 'active' ? '활성' : '퇴원',
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function buildPatientOwnershipEntries(
  patients: Patient[],
  users: User[]
): PatientOwnershipEntry[] {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const grouped = new Map<string, { active: Patient[]; discharged: Patient[] }>();

  for (const patient of patients) {
    const ownerId = patient.createdBy || 'unknown';
    if (!grouped.has(ownerId)) grouped.set(ownerId, { active: [], discharged: [] });
    const group = grouped.get(ownerId)!;
    if (patient.status === 'active') group.active.push(patient);
    else group.discharged.push(patient);
  }

  return Array.from(grouped.entries())
    .map(([doctorId, group]) => {
      const user = usersById.get(doctorId);
      const active = [...group.active].sort(comparePatientForAdmin);
      const discharged = [...group.discharged].sort(comparePatientForAdmin);
      return {
        doctorId,
        doctorName: user?.name ?? (doctorId === 'unknown' ? '미배정' : '알 수 없는 사용자'),
        department: user?.department ?? '',
        status: user?.status,
        role: user?.role,
        active,
        discharged,
        admittedCount: active.filter((patient) => patient.patientType === 'admitted').length,
        consultCount: active.filter((patient) => patient.patientType === 'consult').length,
        attentionCount: active.filter((patient) => patient.attention).length,
      };
    })
    .sort(
      (a, b) =>
        b.active.length - a.active.length || a.doctorName.localeCompare(b.doctorName, 'ko-KR')
    );
}
