/**
 * Lab (검사 결과) 관련 타입 정의
 */

// Re-export from database
export type { LabResult, LabItem } from '@/db/database';

/**
 * Lab 카테고리
 */
export const LAB_CATEGORIES = [
  'CBC',           // Complete Blood Count
  'Chemistry',     // 화학검사
  'Electrolyte',   // 전해질
  'LFT',          // Liver Function Test
  'RFT',          // Renal Function Test
  'Coagulation',  // 응고검사
  'Cardiac',      // 심장 마커
  'Infection',    // 감염 마커
  'Thyroid',      // 갑상선 기능
  'Other',        // 기타
] as const;

export type LabCategory = typeof LAB_CATEGORIES[number];

/**
 * Lab 항목 표시 순서 (카테고리별)
 */
export const LAB_DISPLAY_ORDER: Record<string, number> = {
  // CBC (0-99)
  'CBC': 0,
  'WBC': 1,
  'RBC': 2,
  'Hb': 3,
  'Hct': 4,
  'MCV': 5,
  'MCH': 6,
  'MCHC': 7,
  'Platelet': 8,

  // WBC Differential (100-199)
  'Neutrophil': 100,
  'Lymphocyte': 101,
  'Monocyte': 102,
  'Eosinophil': 103,
  'Basophil': 104,
  'ANC': 105,
  'ALC': 106,

  // Blood Chemistry (200-299)
  'Glucose': 200,
  'HbA1c': 201,
  'Total Protein': 210,
  'Albumin': 211,
  'BUN': 220,
  'Cr': 221,
  'eGFR': 222,
  'AST': 230,
  'ALT': 231,
  'ALP': 232,
  'GGT': 233,
  'Total Bilirubin': 240,
  'Direct Bilirubin': 241,
  'Indirect Bilirubin': 242,

  // Electrolyte (300-399)
  'Na': 300,
  'K': 301,
  'Cl': 302,
  'Ca': 310,
  'P': 311,
  'Mg': 312,

  // ESR / CRP (400-499)
  'ESR': 400,
  'CRP': 401,
  'Procalcitonin': 402,

  // UA (500-599)
  'UA Color': 500,
  'UA Clarity': 501,
  'UA pH': 502,
  'UA Protein': 503,
  'UA Glucose': 504,
  'UA Ketone': 505,
  'UA Blood': 506,
  'UA Bilirubin': 507,
  'UA Urobilinogen': 508,
  'UA Nitrite': 509,
  'UA Leukocyte': 510,

  // Urine Sediment (600-699)
  'RBC/HPF': 600,
  'WBC/HPF': 601,
  'Epithelial cell': 602,
  'Cast': 603,
  'Crystal': 604,
  'Bacteria': 605,

  // Others (1000+)
  'PT': 1000,
  'INR': 1001,
  'aPTT': 1002,
  'Troponin I': 1100,
  'CK-MB': 1101,
  'BNP': 1102,
  'TSH': 1200,
  'Free T4': 1201,
  'Free T3': 1202,
};

/**
 * Lab 참조 범위 정의
 */
export interface LabReference {
  code: string;           // 검사 코드 (예: B1050)
  name: string;           // 검사명 (예: WBC)
  category: LabCategory;  // 카테고리
  unit: string;           // 단위 (예: ×10³/μL)
  referenceMin?: number;  // 정상 하한
  referenceMax?: number;  // 정상 상한
  referenceText?: string; // 서술형 참조 범위 (예: "음성")
  description?: string;   // 설명
}

/**
 * Lab 필터 조건
 */
export interface LabFilter {
  patientId?: string;
  categories?: LabCategory[];
  startDate?: Date;
  endDate?: Date;
  showAbnormalOnly?: boolean;
}

/**
 * Lab 차트 데이터 포인트
 */
export interface LabChartDataPoint {
  date: string;           // 날짜 (YYYY-MM-DD)
  value: number | string; // 값
  isAbnormal?: boolean;   // 비정상 여부
  hlFlag?: 'H' | 'L';    // High/Low 플래그
}

/**
 * Lab 추이 차트 데이터
 */
export interface LabTrendData {
  itemCode: string;
  itemName: string;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  dataPoints: LabChartDataPoint[];
}
