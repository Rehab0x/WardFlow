/**
 * Medication — 앱 레벨(뷰모델) 투약 타입.
 */
export type MedicationCategory = 'hospital' | 'personal' | 'antibiotic';

export interface Medication {
  id: string;
  patientId: string;

  // Category: 처방약 / 지참약 / 항생제
  category: MedicationCategory;

  // Common fields
  drugName: string; // Full name with dosage
  drugBaseName: string; // Base name for search

  // For 처방약/지참약 (Parsed from OCS)
  singleDose: number; // 1회 투약량 (예: 1)
  schedule: string; // 투약 시간 (예: "아침,저녁")
  timing?: string; // 복용 타이밍 (예: "식전 30분", "식후 30분", null)
  daysRemaining?: number; // From OCS paste (표시하지 않음, 파싱용)

  // For 항생제 (Free-text manual input)
  dosage?: string; // 하루 용량 + 단위 (예: "4V", "2g")
  frequency?: string; // 용법 (예: "#4", "#2")

  // Management
  startDate: Date;
  endDate?: Date; // 항생제 종료일 (항생제는 필수)
  isAntibiotic: boolean; // Deprecated: use category === 'antibiotic' instead
  isActive: boolean;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Medication parsing result from OCS paste
 */
export interface MedicationParseResult {
  drugName: string;
  drugBaseName: string;
  singleDose: number;
  schedule: string;
  daysRemaining?: number;
  success: boolean;
  error?: string;
}

/**
 * Medication display with calculated D-day for antibiotics
 */
export interface MedicationDisplay {
  id: string;
  patientId: string;
  drugName: string;
  drugBaseName: string;
  singleDose: number;
  schedule: string;
  daysRemaining?: number;
  startDate: Date;
  endDate?: Date;
  isAntibiotic: boolean;
  isActive: boolean;
  notes?: string;

  // Computed fields
  dDay?: number; // Days since start (for antibiotics)
  shouldAlert?: boolean; // True if antibiotic >= 14 days
}
