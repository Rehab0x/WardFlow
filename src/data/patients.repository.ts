import { supabase } from '@/lib/supabase';
import type { Patient, PatientCreateInput, PatientUpdateInput } from '@/domain/patient';
import { fromPatientRow, toPatientInsert, toPatientUpdate } from '@/mappers/patient.mapper';
import { fromDateOnly, fromNullableDateOnly } from '@/mappers/date';

const patientColumns = `
  id,
  registration_number,
  name,
  birth_date,
  sex,
  room_bed,
  admission_date,
  discharge_date,
  attending_physician,
  patient_type,
  status,
  created_by,
  attention,
  tags,
  chief_complaint,
  onset,
  present_illness,
  past_history,
  review_of_system,
  physical_exam,
  problem_list,
  plan,
  guardian_explanation,
  etc,
  created_at,
  updated_at,
  deleted_at
`;

const activePatientBriefingColumns = `
  id,
  name,
  room_bed,
  patient_type,
  status
`;

const patientShellColumns = `
  id,
  registration_number,
  name,
  birth_date,
  sex,
  room_bed,
  admission_date,
  discharge_date,
  attending_physician,
  patient_type,
  status,
  created_by,
  attention,
  tags,
  chief_complaint,
  onset,
  created_at,
  updated_at,
  deleted_at
`;

export type ActivePatientBriefingRow = {
  id: string;
  name: string;
  roomBed: string;
  patientType: Patient['patientType'];
  status: Patient['status'];
};

export type PatientShellRow = Pick<
  Patient,
  | 'id'
  | 'registrationNumber'
  | 'name'
  | 'birthDate'
  | 'sex'
  | 'roomBed'
  | 'admissionDate'
  | 'dischargeDate'
  | 'attendingPhysician'
  | 'patientType'
  | 'status'
  | 'createdBy'
  | 'attention'
  | 'tags'
  | 'chiefComplaint'
  | 'onset'
  | 'createdAt'
  | 'updatedAt'
>;

export async function listPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select(patientColumns)
    .is('deleted_at', null)
    .order('status', { ascending: true })
    .order('room_bed', { ascending: true });

  if (error) throw error;
  return data.map(fromPatientRow);
}

export async function listPatientShellRows(): Promise<PatientShellRow[]> {
  const { data, error } = await supabase
    .from('patients')
    .select(patientShellColumns)
    .is('deleted_at', null)
    .order('status', { ascending: true })
    .order('room_bed', { ascending: true });

  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    registrationNumber: row.registration_number,
    name: row.name,
    birthDate: fromDateOnly(row.birth_date),
    sex: row.sex,
    roomBed: row.room_bed,
    admissionDate: fromDateOnly(row.admission_date),
    dischargeDate: fromNullableDateOnly(row.discharge_date),
    attendingPhysician: row.attending_physician ?? undefined,
    patientType: row.patient_type,
    status: row.status,
    createdBy: row.created_by,
    attention: row.attention,
    tags: row.tags ?? [],
    chiefComplaint: row.chief_complaint ?? '',
    onset: row.onset ?? '',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

export async function listActivePatientBriefingRows(): Promise<ActivePatientBriefingRow[]> {
  const { data, error } = await supabase
    .from('patients')
    .select(activePatientBriefingColumns)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('room_bed', { ascending: true });

  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    roomBed: row.room_bed,
    patientType: row.patient_type,
    status: row.status,
  }));
}

export async function listActivePatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select(patientColumns)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('room_bed', { ascending: true });

  if (error) throw error;
  return data.map(fromPatientRow);
}

export async function getPatient(id: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .select(patientColumns)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data ? fromPatientRow(data) : null;
}

export async function createPatient(input: PatientCreateInput): Promise<Patient> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('로그인이 필요합니다.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) {
    throw new Error('현재 로그인 계정의 프로필이 없어 환자를 추가할 수 없습니다. Supabase profiles 테이블을 확인해주세요.');
  }
  if (profile.status !== 'approved') {
    throw new Error(`현재 계정이 ${profile.status} 상태라 환자를 추가할 수 없습니다. 관리자 승인 후 다시 시도해주세요.`);
  }

  const patientId = crypto.randomUUID();
  const insertPayload = {
    ...toPatientInsert({ ...input, createdBy: authData.user.id }),
    id: patientId,
  };

  const { error } = await supabase
    .from('patients')
    .insert(insertPayload);

  if (error) throw error;

  const patient = await getPatient(patientId);
  if (!patient) throw new Error('환자를 저장했지만 다시 불러오지 못했습니다.');
  return patient;
}

export async function updatePatient(id: string, input: PatientUpdateInput): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update(toPatientUpdate(input))
    .eq('id', id)
    .select(patientColumns)
    .single();

  if (error) throw error;
  return fromPatientRow(data);
}

export async function archivePatient(id: string): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .update({ status: 'archived', deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

