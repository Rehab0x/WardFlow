export type PatientSex = 'M' | 'F';
export type PatientType = 'admitted' | 'consult';
export type PatientStatus = 'active' | 'discharged' | 'archived';

export interface Patient {
  id: string;
  registrationNumber: string;
  name: string;
  birthDate: Date;
  sex: PatientSex;
  roomBed: string;
  admissionDate: Date;
  dischargeDate?: Date;
  attendingPhysician?: string;
  patientType: PatientType;
  status: PatientStatus;
  createdBy: string;
  attention: boolean;
  tags: string[];
  chiefComplaint: string;
  onset: string;
  presentIllness: string;
  pastHistory: string;
  reviewOfSystem: string;
  physicalExam: string;
  problemList: string[];
  plan: string;
  guardianExplanation: string;
  etc: string;
  /** 환자별 중요사항 — 환자를 열 때 가장 먼저 보이는 메모 */
  importantNotes?: string;
  /** 지시오더 — 처방마다 갱신하는 간호 지시 묶음 */
  standingOrders: string;
  /** 키(cm) — 필요열량 계산 등에 쓴다. 측정 전이면 비어 있다 */
  heightCm?: number;
  /** 체중(kg) */
  weightKg?: number;
  /** 요약 탭 필요열량 박스를 켜 둔 환자인지 */
  nutritionEnabled?: boolean;
  /** 활동계수 선택 키 (`features/nutrition/calorieNeeds`의 id) */
  nutritionActivityFactorId?: string;
  /** 상해·스트레스 계수 선택 키 */
  nutritionInjuryFactorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PatientCreateInput = Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>;
export type PatientUpdateInput = Partial<Omit<Patient, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>;

