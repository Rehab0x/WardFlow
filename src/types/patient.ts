/**
 * Patient — 앱 레벨(뷰모델) 환자 타입.
 * Supabase 도메인 타입(`@/domain/patient`)과는 `@/mappers/patientView.mapper`로 변환한다.
 */
export type PatientStatus = 'active' | 'discharged';
export type PatientType = 'admitted' | 'consult';
export type Sex = 'M' | 'F';

export interface Patient {
  id: string;
  // Basic info
  registrationNumber: string; // 환자등록번호 (필수) - 외부 Lab 파일 매칭용
  name: string;
  birthDate: Date;
  sex: Sex;
  roomBed: string; // "301" or "301-1" (bed number is optional)
  admissionDate: Date;
  dischargeDate?: Date;
  attendingPhysician: string;
  patientType: PatientType; // 입원환자 vs 컨설트환자
  status: PatientStatus;

  // Ownership (의사별 환자 구분)
  createdBy: string; // User ID who created this patient
  sharedWith?: string[]; // User IDs who can access this patient (for collaboration)

  // Tags for patient overview (주의사항)
  tags?: string[]; // ['#Hypernatremia', '#Recurrent pneumonia']

  // Attention flag (수동 체크 — 주의 필요 환자 표시)
  attention?: boolean;

  // Charting fields (C/C ~ Etc)
  chiefComplaint: string;
  onset: string;
  presentIllness: string;
  pastHistory: string;
  reviewOfSystem: string;
  physicalExam: string;
  problemList: string[]; // Array for list mode
  plan: string;
  guardianExplanation: string;
  etc: string;

  createdAt: Date;
  updatedAt: Date;
}
