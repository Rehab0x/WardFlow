import type { Inserts, Tables, Updates } from '@/types/supabase';
import type { Patient, PatientCreateInput, PatientUpdateInput } from '@/domain/patient';
import type { PatientIdentity } from '@/lib/patientIdentityCrypto';
import { fromDateOnly, fromNullableDateOnly, toDateOnly, toNullableDateOnly } from './date';

/**
 * 이름·등록번호·생년월일은 행에 평문으로 없다 — 리포지토리가 복호화해 `identity`로 넘긴다
 * (`data/patientIdentity`).
 */
export function fromPatientRow(row: Tables<'patients'>, identity: PatientIdentity): Patient {
  return {
    id: row.id,
    registrationNumber: identity.registrationNumber,
    name: identity.name,
    birthDate: fromDateOnly(identity.birthDate),
    sex: row.sex,
    roomBed: row.room_bed,
    admissionDate: fromDateOnly(row.admission_date),
    dischargeDate: fromNullableDateOnly(row.discharge_date),
    attendingPhysician: row.attending_physician ?? undefined,
    patientType: row.patient_type,
    status: row.status,
    createdBy: row.created_by,
    attention: row.attention,
    tags: row.tags,
    chiefComplaint: row.chief_complaint,
    onset: row.onset,
    presentIllness: row.present_illness,
    pastHistory: row.past_history,
    reviewOfSystem: row.review_of_system,
    physicalExam: row.physical_exam,
    problemList: row.problem_list,
    plan: row.plan,
    guardianExplanation: row.guardian_explanation,
    etc: row.etc,
    // 마이그레이션 적용 전에는 컬럼이 없어 undefined로 온다.
    standingOrders: row.standing_orders ?? '',
    importantNotes: row.important_notes ?? undefined,
    heightCm: row.height_cm ?? undefined,
    weightKg: row.weight_kg ?? undefined,
    nutritionEnabled: row.nutrition_enabled ?? undefined,
    nutritionActivityFactorId: row.nutrition_activity_factor || undefined,
    nutritionInjuryFactorId: row.nutrition_injury_factor || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/** 식별정보 칸은 리포지토리가 `sealPatientIdentity`로 따로 채운다 */
export function toPatientInsert(input: PatientCreateInput): Inserts<'patients'> {
  return {
    sex: input.sex,
    room_bed: input.roomBed,
    admission_date: toDateOnly(input.admissionDate),
    discharge_date: toNullableDateOnly(input.dischargeDate),
    attending_physician: input.attendingPhysician ?? null,
    patient_type: input.patientType,
    status: input.status,
    created_by: input.createdBy,
    attention: input.attention,
    tags: input.tags,
    chief_complaint: input.chiefComplaint,
    onset: input.onset,
    present_illness: input.presentIllness,
    past_history: input.pastHistory,
    review_of_system: input.reviewOfSystem,
    physical_exam: input.physicalExam,
    problem_list: input.problemList,
    plan: input.plan,
    guardian_explanation: input.guardianExplanation,
    etc: input.etc,
    // 빈 값이면 컬럼 자체를 보내지 않는다 — 마이그레이션 적용 전 DB에서도 환자 추가가 되도록.
    ...(input.standingOrders ? { standing_orders: input.standingOrders } : {}),
    // 값이 있을 때만 보낸다 — 마이그레이션 적용 전 DB에서도 나머지 저장이 되도록.
    ...(input.importantNotes === undefined ? {} : { important_notes: input.importantNotes }),
    ...(input.heightCm === undefined ? {} : { height_cm: input.heightCm }),
    ...(input.weightKg === undefined ? {} : { weight_kg: input.weightKg }),
    ...(input.nutritionEnabled === undefined ? {} : { nutrition_enabled: input.nutritionEnabled }),
    ...(input.nutritionActivityFactorId === undefined
      ? {}
      : { nutrition_activity_factor: input.nutritionActivityFactorId }),
    ...(input.nutritionInjuryFactorId === undefined
      ? {}
      : { nutrition_injury_factor: input.nutritionInjuryFactorId }),
  };
}

/** 식별정보 칸은 리포지토리가 `sealPatientIdentity`로 따로 채운다 */
export function toPatientUpdate(input: PatientUpdateInput): Updates<'patients'> {
  return {
    sex: input.sex,
    room_bed: input.roomBed,
    admission_date: input.admissionDate ? toDateOnly(input.admissionDate) : undefined,
    discharge_date: input.dischargeDate === undefined ? undefined : toNullableDateOnly(input.dischargeDate),
    attending_physician: input.attendingPhysician,
    patient_type: input.patientType,
    status: input.status,
    attention: input.attention,
    tags: input.tags,
    chief_complaint: input.chiefComplaint,
    onset: input.onset,
    present_illness: input.presentIllness,
    past_history: input.pastHistory,
    review_of_system: input.reviewOfSystem,
    physical_exam: input.physicalExam,
    problem_list: input.problemList,
    plan: input.plan,
    guardian_explanation: input.guardianExplanation,
    etc: input.etc,
    standing_orders: input.standingOrders,
    // 값이 있을 때만 보낸다 — 마이그레이션 적용 전 DB에서도 나머지 저장이 되도록.
    ...(input.importantNotes === undefined ? {} : { important_notes: input.importantNotes }),
    ...(input.heightCm === undefined ? {} : { height_cm: input.heightCm }),
    ...(input.weightKg === undefined ? {} : { weight_kg: input.weightKg }),
    ...(input.nutritionEnabled === undefined ? {} : { nutrition_enabled: input.nutritionEnabled }),
    ...(input.nutritionActivityFactorId === undefined
      ? {}
      : { nutrition_activity_factor: input.nutritionActivityFactorId }),
    ...(input.nutritionInjuryFactorId === undefined
      ? {}
      : { nutrition_injury_factor: input.nutritionInjuryFactorId }),
  };
}


export function toPatientIdentity(
  input: Pick<Patient, 'name' | 'registrationNumber' | 'birthDate'>
): PatientIdentity {
  return {
    name: input.name,
    registrationNumber: input.registrationNumber,
    birthDate: toDateOnly(input.birthDate),
  };
}
