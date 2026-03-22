/**
 * Lab 참조 범위 데이터
 * 주요 검사 항목의 정상 범위 정의
 */

import type { LabReference } from '@/types/lab';

/**
 * 주요 Lab 검사 항목의 참조 범위
 * 병원마다 차이가 있을 수 있으므로, 추후 설정에서 커스텀 가능하도록 확장 예정
 */
export const LAB_REFERENCES: LabReference[] = [
  // === CBC (Complete Blood Count) ===
  {
    code: 'B1010',
    name: 'Hb',
    category: 'CBC',
    unit: 'g/dL',
    referenceMin: 12.0,
    referenceMax: 16.0,
    description: 'Hemoglobin (혈색소)',
  },
  {
    code: 'B1020',
    name: 'Hct',
    category: 'CBC',
    unit: '%',
    referenceMin: 37.0,
    referenceMax: 47.0,
    description: 'Hematocrit (적혈구 용적률)',
  },
  {
    code: 'B1050',
    name: 'WBC',
    category: 'CBC',
    unit: '×10³/μL',
    referenceMin: 4.0,
    referenceMax: 10.0,
    description: 'White Blood Cell (백혈구)',
  },
  {
    code: 'B1060',
    name: 'Platelet',
    category: 'CBC',
    unit: '×10³/μL',
    referenceMin: 150,
    referenceMax: 400,
    description: 'Platelet count (혈소판)',
  },
  {
    code: 'B1030',
    name: 'RBC',
    category: 'CBC',
    unit: '×10⁶/μL',
    referenceMin: 4.2,
    referenceMax: 5.4,
    description: 'Red Blood Cell (적혈구)',
  },
  {
    code: 'B1040',
    name: 'MCV',
    category: 'CBC',
    unit: 'fL',
    referenceMin: 80,
    referenceMax: 100,
    description: 'Mean Corpuscular Volume (평균 적혈구 용적)',
  },
  {
    code: 'B1041',
    name: 'MCH',
    category: 'CBC',
    unit: 'pg',
    referenceMin: 27,
    referenceMax: 32,
    description: 'Mean Corpuscular Hemoglobin (평균 적혈구 혈색소량)',
  },
  {
    code: 'B1042',
    name: 'MCHC',
    category: 'CBC',
    unit: 'g/dL',
    referenceMin: 32,
    referenceMax: 36,
    description: 'Mean Corpuscular Hemoglobin Concentration (평균 적혈구 혈색소 농도)',
  },

  // === Chemistry (화학검사) ===
  {
    code: 'B2500',
    name: 'Total Protein',
    category: 'Chemistry',
    unit: 'g/dL',
    referenceMin: 6.6,
    referenceMax: 8.3,
    description: '총 단백',
  },
  {
    code: 'B2510',
    name: 'Albumin',
    category: 'Chemistry',
    unit: 'g/dL',
    referenceMin: 3.5,
    referenceMax: 5.2,
    description: '알부민',
  },
  {
    code: 'B2730',
    name: 'BUN',
    category: 'RFT',
    unit: 'mg/dL',
    referenceMin: 8.0,
    referenceMax: 23.0,
    description: 'Blood Urea Nitrogen (혈중 요소 질소)',
  },
  {
    code: 'B2740',
    name: 'Cr',
    category: 'RFT',
    unit: 'mg/dL',
    referenceMin: 0.5,
    referenceMax: 1.2,
    description: 'Creatinine (크레아티닌)',
  },
  {
    code: 'B2800',
    name: 'Glucose',
    category: 'Chemistry',
    unit: 'mg/dL',
    referenceMin: 70,
    referenceMax: 110,
    description: 'Blood Glucose (혈당)',
  },
  {
    code: 'B2900',
    name: 'HbA1c',
    category: 'Chemistry',
    unit: '%',
    referenceMin: 4.0,
    referenceMax: 6.0,
    description: 'Glycated Hemoglobin (당화혈색소)',
  },

  // === LFT (Liver Function Test) ===
  {
    code: 'B2600',
    name: 'AST',
    category: 'LFT',
    unit: 'U/L',
    referenceMax: 40,
    description: 'Aspartate Aminotransferase (아스파르테이트 아미노전이효소)',
  },
  {
    code: 'B2610',
    name: 'ALT',
    category: 'LFT',
    unit: 'U/L',
    referenceMax: 40,
    description: 'Alanine Aminotransferase (알라닌 아미노전이효소)',
  },
  {
    code: 'B2620',
    name: 'ALP',
    category: 'LFT',
    unit: 'U/L',
    referenceMin: 30,
    referenceMax: 120,
    description: 'Alkaline Phosphatase (알칼리성 인산분해효소)',
  },
  {
    code: 'B2630',
    name: 'Total Bilirubin',
    category: 'LFT',
    unit: 'mg/dL',
    referenceMax: 1.2,
    description: '총 빌리루빈',
  },
  {
    code: 'B2631',
    name: 'Direct Bilirubin',
    category: 'LFT',
    unit: 'mg/dL',
    referenceMax: 0.3,
    description: '직접 빌리루빈',
  },
  {
    code: 'B2650',
    name: 'GGT',
    category: 'LFT',
    unit: 'U/L',
    referenceMax: 60,
    description: 'Gamma-Glutamyl Transferase',
  },

  // === Electrolyte (전해질) ===
  {
    code: 'B2100',
    name: 'Na',
    category: 'Electrolyte',
    unit: 'mEq/L',
    referenceMin: 135,
    referenceMax: 145,
    description: 'Sodium (나트륨)',
  },
  {
    code: 'B2110',
    name: 'K',
    category: 'Electrolyte',
    unit: 'mEq/L',
    referenceMin: 3.5,
    referenceMax: 5.0,
    description: 'Potassium (칼륨)',
  },
  {
    code: 'B2120',
    name: 'Cl',
    category: 'Electrolyte',
    unit: 'mEq/L',
    referenceMin: 98,
    referenceMax: 107,
    description: 'Chloride (염소)',
  },
  {
    code: 'B2130',
    name: 'Ca',
    category: 'Electrolyte',
    unit: 'mg/dL',
    referenceMin: 8.6,
    referenceMax: 10.2,
    description: 'Calcium (칼슘)',
  },
  {
    code: 'B2140',
    name: 'P',
    category: 'Electrolyte',
    unit: 'mg/dL',
    referenceMin: 2.5,
    referenceMax: 4.5,
    description: 'Phosphorus (인)',
  },
  {
    code: 'B2150',
    name: 'Mg',
    category: 'Electrolyte',
    unit: 'mg/dL',
    referenceMin: 1.8,
    referenceMax: 2.4,
    description: 'Magnesium (마그네슘)',
  },

  // === Coagulation (응고검사) ===
  {
    code: 'B3100',
    name: 'PT',
    category: 'Coagulation',
    unit: 'sec',
    referenceMin: 11,
    referenceMax: 13,
    description: 'Prothrombin Time (프로트롬빈 시간)',
  },
  {
    code: 'B3110',
    name: 'INR',
    category: 'Coagulation',
    unit: '',
    referenceMin: 0.8,
    referenceMax: 1.2,
    description: 'International Normalized Ratio',
  },
  {
    code: 'B3120',
    name: 'aPTT',
    category: 'Coagulation',
    unit: 'sec',
    referenceMin: 25,
    referenceMax: 35,
    description: 'Activated Partial Thromboplastin Time',
  },

  // === Cardiac (심장 마커) ===
  {
    code: 'B4100',
    name: 'Troponin I',
    category: 'Cardiac',
    unit: 'ng/mL',
    referenceMax: 0.04,
    description: '트로포닌 I',
  },
  {
    code: 'B4110',
    name: 'CK-MB',
    category: 'Cardiac',
    unit: 'ng/mL',
    referenceMax: 5.0,
    description: 'Creatine Kinase-MB',
  },
  {
    code: 'B4120',
    name: 'BNP',
    category: 'Cardiac',
    unit: 'pg/mL',
    referenceMax: 100,
    description: 'B-type Natriuretic Peptide',
  },

  // === Infection (감염 마커) ===
  {
    code: 'B5100',
    name: 'CRP',
    category: 'Infection',
    unit: 'mg/dL',
    referenceMax: 0.5,
    description: 'C-Reactive Protein',
  },
  {
    code: 'B5110',
    name: 'ESR',
    category: 'Infection',
    unit: 'mm/hr',
    referenceMax: 20,
    description: 'Erythrocyte Sedimentation Rate (적혈구 침강속도)',
  },
  {
    code: 'B5120',
    name: 'Procalcitonin',
    category: 'Infection',
    unit: 'ng/mL',
    referenceMax: 0.5,
    description: '프로칼시토닌',
  },

  // === Thyroid (갑상선 기능) ===
  {
    code: 'B6100',
    name: 'TSH',
    category: 'Thyroid',
    unit: 'μIU/mL',
    referenceMin: 0.4,
    referenceMax: 4.0,
    description: 'Thyroid Stimulating Hormone',
  },
  {
    code: 'B6110',
    name: 'Free T4',
    category: 'Thyroid',
    unit: 'ng/dL',
    referenceMin: 0.8,
    referenceMax: 1.8,
    description: 'Free Thyroxine',
  },
  {
    code: 'B6120',
    name: 'Free T3',
    category: 'Thyroid',
    unit: 'pg/mL',
    referenceMin: 2.3,
    referenceMax: 4.2,
    description: 'Free Triiodothyronine',
  },
];

/**
 * 검사 코드로 참조 범위 찾기
 */
export function getLabReference(code: string): LabReference | undefined {
  return LAB_REFERENCES.find((ref) => ref.code === code);
}

/**
 * 검사명으로 참조 범위 찾기 (대소문자 무시)
 */
export function getLabReferenceByName(name: string): LabReference | undefined {
  const normalized = name.toLowerCase().trim();
  return LAB_REFERENCES.find((ref) => ref.name.toLowerCase() === normalized);
}

/**
 * 카테고리별 참조 범위 필터링
 */
export function getLabReferencesByCategory(category: string): LabReference[] {
  return LAB_REFERENCES.filter((ref) => ref.category === category);
}

/**
 * 값이 정상 범위인지 확인
 */
export function isValueNormal(
  value: number | string,
  reference: LabReference
): boolean {
  // 문자열 값은 판정 불가
  if (typeof value === 'string') return true;

  const { referenceMin, referenceMax } = reference;

  // 범위가 정의되지 않은 경우 정상으로 간주
  if (referenceMin === undefined && referenceMax === undefined) {
    return true;
  }

  // 하한만 있는 경우
  if (referenceMin !== undefined && referenceMax === undefined) {
    return value >= referenceMin;
  }

  // 상한만 있는 경우
  if (referenceMin === undefined && referenceMax !== undefined) {
    return value <= referenceMax;
  }

  // 범위가 모두 있는 경우
  return value >= referenceMin! && value <= referenceMax!;
}

/**
 * H/L 플래그 계산
 */
export function getHLFlag(
  value: number | string,
  reference: LabReference
): 'H' | 'L' | undefined {
  if (typeof value === 'string') return undefined;

  const { referenceMin, referenceMax } = reference;

  if (referenceMax !== undefined && value > referenceMax) {
    return 'H';
  }

  if (referenceMin !== undefined && value < referenceMin) {
    return 'L';
  }

  return undefined;
}
