import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/supabase';
import type { Patient, PatientCreateInput, PatientUpdateInput } from '@/domain/patient';
import { fromPatientRow, toPatientInsert, toPatientUpdate } from '@/mappers/patient.mapper';
import { fromDateOnly, fromNullableDateOnly } from '@/mappers/date';

/**
 * 마이그레이션으로 나중에 붙은 컬럼들(지시오더 202609210001, 영양 202609210002).
 *
 * 아직 적용 전인 DB에 이 컬럼을 요청하면 PostgREST가 42703으로 거절하는데,
 * 그러면 **환자 조회 전체가 실패한다.** 없다고 알려 온 컬럼만 빼고 다시 조회해서,
 * 앱을 먼저 배포하고 마이그레이션을 나중에 적용해도 앱이 멀쩡하도록 한다.
 * (해당 컬럼 값만 비어 보이고 나머지는 정상 동작한다.)
 */
const UNDEFINED_COLUMN = '42703';
const MAX_MISSING_COLUMN_RETRIES = 6;

type QueryError = { code?: string; message?: string } | null;
type QueryResult<T> = { data: T | null; error: QueryError };

/** PostgREST 오류 문구에서 없다고 한 컬럼 이름을 꺼낸다. */
function missingColumnFrom(error: QueryError): string | undefined {
  const match = error?.message?.match(/column\s+(?:\w+\.)?"?([a-z0-9_]+)"?\s+does not exist/i);
  return match?.[1];
}

/**
 * 컬럼 목록을 런타임에 만들기 때문에 supabase-js의 행 타입 추론이 풀린다.
 * 돌려주는 행 모양은 호출부가 지정한 T로 단언한다 — 컬럼 목록과 T를 함께 바꿀 것.
 */
async function withMissingColumnFallback<T>(
  run: (columns: string) => PromiseLike<{ data: unknown; error: QueryError }>,
  columns: string
): Promise<QueryResult<T>> {
  let current = columns;

  for (let attempt = 0; attempt <= MAX_MISSING_COLUMN_RETRIES; attempt++) {
    const result = await run(current);
    if (result.error?.code !== UNDEFINED_COLUMN) return result as QueryResult<T>;

    const missing = missingColumnFrom(result.error);
    const reduced = missing ? current.replace(new RegExp(`\\s*\\b${missing}\\b,`), '') : current;
    // 줄일 수 없으면 더 돌려봐야 같은 오류다.
    if (reduced === current) return result as QueryResult<T>;
    current = reduced;
  }

  return run(current) as Promise<QueryResult<T>>;
}

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
  standing_orders,
  important_notes,
  height_cm,
  weight_kg,
  nutrition_enabled,
  nutrition_activity_factor,
  nutrition_injury_factor,
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
  const { data, error } = await withMissingColumnFallback<Tables<'patients'>[]>(
    (columns) =>
      supabase
        .from('patients')
        .select(columns)
        .is('deleted_at', null)
        .order('status', { ascending: true })
        .order('room_bed', { ascending: true }),
    patientColumns
  );

  if (error) throw error;
  return (data ?? []).map(fromPatientRow);
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
  const { data, error } = await withMissingColumnFallback<Tables<'patients'>[]>(
    (columns) =>
      supabase
        .from('patients')
        .select(columns)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('room_bed', { ascending: true }),
    patientColumns
  );

  if (error) throw error;
  return (data ?? []).map(fromPatientRow);
}

export async function getPatient(id: string): Promise<Patient | null> {
  const { data, error } = await withMissingColumnFallback<Tables<'patients'>>(
    (columns) =>
      supabase.from('patients').select(columns).eq('id', id).is('deleted_at', null).maybeSingle(),
    patientColumns
  );

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
    throw new Error(
      '현재 로그인 계정의 프로필이 없어 환자를 추가할 수 없습니다. Supabase profiles 테이블을 확인해주세요.'
    );
  }
  if (profile.status !== 'approved') {
    throw new Error(
      `현재 계정이 ${profile.status} 상태라 환자를 추가할 수 없습니다. 관리자 승인 후 다시 시도해주세요.`
    );
  }

  const patientId = crypto.randomUUID();
  const insertPayload = {
    ...toPatientInsert({ ...input, createdBy: authData.user.id }),
    id: patientId,
  };

  const { error } = await supabase.from('patients').insert(insertPayload);

  if (error) throw error;

  const patient = await getPatient(patientId);
  if (!patient) throw new Error('환자를 저장했지만 다시 불러오지 못했습니다.');
  return patient;
}

export async function updatePatient(id: string, input: PatientUpdateInput): Promise<Patient> {
  const { data, error } = await withMissingColumnFallback<Tables<'patients'>>(
    (columns) =>
      supabase
        .from('patients')
        .update(toPatientUpdate(input))
        .eq('id', id)
        .select(columns)
        .single(),
    patientColumns
  );

  if (error) throw error;
  if (!data) throw new Error('환자 정보를 저장했지만 다시 불러오지 못했습니다.');
  return fromPatientRow(data);
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase.from('patients').delete().eq('id', id);

  if (error) throw error;
}

/** 테스트 전용 — 마이그레이션 미적용 폴백은 실제 DB 없이 검증한다. */
export const __testing = { missingColumnFrom, withMissingColumnFallback };
