/**
 * 1일 필요열량 계산 — Mifflin-St Jeor.
 *
 *   남자 REE = 10W + 6.25H - 5A + 5
 *   여자 REE = 10W + 6.25H - 5A - 161
 *   1일 필요열량 = REE × 활동계수 × 상해계수
 *
 * 비만(BMI > 30)에서는 실제 체중을 그대로 넣으면 과대 추정되므로 보정체중을 쓴다.
 *   IBW  = 키(m)² × 22(남) / 21(여)
 *   AdjBW = IBW + 0.25 × (실제체중 - IBW)
 *
 * 계산 과정을 `steps`로 함께 돌려준다 — 숫자만 보고 믿는 것이 아니라
 * 어떤 값이 어떻게 들어갔는지 화면에서 펼쳐 볼 수 있어야 한다.
 */

export type PatientSexInput = 'M' | 'F';

export interface CalorieFactor {
  /** 값이 같은 항목이 여러 개라(소수술·감염 모두 1.2) 선택 키는 따로 둔다 */
  id: string;
  label: string;
  value: number;
}

/** 활동계수 */
export const ACTIVITY_FACTORS: readonly CalorieFactor[] = [
  { id: 'ventilated', label: '기계환기 / 완전 침상', value: 1.1 },
  { id: 'bedridden', label: '침상 생활', value: 1.2 },
  { id: 'out-of-bed', label: '침상 외 활동 가능', value: 1.3 },
  { id: 'light', label: '가벼운 활동', value: 1.5 },
];

/** 상해·스트레스 계수. 패혈증은 1.4~1.6 범위라 단계로 나눠 둔다. */
export const INJURY_FACTORS: readonly CalorieFactor[] = [
  { id: 'none', label: '없음', value: 1.0 },
  { id: 'minor-surgery', label: '소수술', value: 1.2 },
  { id: 'infection', label: '감염 / 암 / 창상', value: 1.2 },
  { id: 'fracture', label: '골절 · 골격 외상', value: 1.3 },
  { id: 'major-surgery', label: '대수술', value: 1.3 },
  { id: 'fever', label: '발열', value: 1.3 },
  { id: 'sepsis-low', label: '패혈증 (1.4)', value: 1.4 },
  { id: 'sepsis-mid', label: '패혈증 (1.5)', value: 1.5 },
  { id: 'sepsis-high', label: '패혈증 (1.6)', value: 1.6 },
  { id: 'burn', label: '중증 화상', value: 1.5 },
];

export const DEFAULT_ACTIVITY_FACTOR_ID = 'bedridden';
export const DEFAULT_INJURY_FACTOR_ID = 'none';

/** 보정체중을 쓰기 시작하는 BMI */
export const ADJUSTED_WEIGHT_BMI_THRESHOLD = 30;

export interface CalorieNeedsInput {
  sex: PatientSexInput;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityFactorId: string;
  injuryFactorId: string;
}

export interface CalorieNeedsResult {
  bmi: number;
  /** 이상체중 */
  ibwKg: number;
  /** BMI가 기준을 넘어 보정체중을 쓴 경우에만 채워진다 */
  adjustedWeightKg?: number;
  /** 공식에 실제로 들어간 체중 */
  weightUsedKg: number;
  /** Mifflin-St Jeor 기초대사량 (kcal/일) */
  ree: number;
  activity: CalorieFactor;
  injury: CalorieFactor;
  /** 1일 필요열량 (kcal/일) */
  total: number;
  /** 화면에 펼쳐 보여줄 계산 과정 */
  steps: string[];
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** 이상체중 — 키(m)² × 22(남) / 21(여) */
export function idealBodyWeightKg(heightCm: number, sex: PatientSexInput): number {
  const heightM = heightCm / 100;
  return heightM * heightM * (sex === 'M' ? 22 : 21);
}

export function bodyMassIndex(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** 보정체중 — IBW + 0.25 × (실제체중 - IBW) */
export function adjustedBodyWeightKg(actualKg: number, ibwKg: number): number {
  return ibwKg + 0.25 * (actualKg - ibwKg);
}

/**
 * 입력이 임상적으로 말이 되는 범위인지. 범위를 벗어나면 계산하지 않는다
 * (오타 하나로 엉뚱한 열량이 나와 그대로 처방되는 일을 막는다).
 */
export function isUsableMeasurement(heightCm: number, weightKg: number): boolean {
  return (
    Number.isFinite(heightCm) &&
    Number.isFinite(weightKg) &&
    heightCm >= 50 &&
    heightCm <= 250 &&
    weightKg >= 1 &&
    weightKg <= 400
  );
}

export function findFactor(factors: readonly CalorieFactor[], id: string): CalorieFactor {
  return factors.find((factor) => factor.id === id) ?? factors[0]!;
}

/** 입력이 모자라거나 범위를 벗어나면 null. */
export function calculateCalorieNeeds(input: CalorieNeedsInput): CalorieNeedsResult | null {
  const { sex, ageYears, heightCm, weightKg } = input;
  if (!isUsableMeasurement(heightCm, weightKg)) return null;
  if (!Number.isFinite(ageYears) || ageYears < 0 || ageYears > 120) return null;

  const activity = findFactor(ACTIVITY_FACTORS, input.activityFactorId);
  const injury = findFactor(INJURY_FACTORS, input.injuryFactorId);

  const bmi = bodyMassIndex(heightCm, weightKg);
  const ibwKg = idealBodyWeightKg(heightCm, sex);
  const useAdjusted = bmi > ADJUSTED_WEIGHT_BMI_THRESHOLD;
  const adjustedWeightKg = useAdjusted ? adjustedBodyWeightKg(weightKg, ibwKg) : undefined;
  const weightUsedKg = adjustedWeightKg ?? weightKg;

  const sexOffset = sex === 'M' ? 5 : -161;
  const ree = 10 * weightUsedKg + 6.25 * heightCm - 5 * ageYears + sexOffset;
  const total = ree * activity.value * injury.value;

  const steps = [
    `BMI = ${round(weightKg)} ÷ (${round(heightCm / 100, 2)})² = ${round(bmi)}`,
    useAdjusted
      ? `BMI > ${ADJUSTED_WEIGHT_BMI_THRESHOLD} → 보정체중 사용` +
        `\n  IBW = (${round(heightCm / 100, 2)})² × ${sex === 'M' ? 22 : 21} = ${round(ibwKg)} kg` +
        `\n  보정체중 = ${round(ibwKg)} + 0.25 × (${round(weightKg)} − ${round(ibwKg)}) = ${round(weightUsedKg)} kg`
      : `BMI ≤ ${ADJUSTED_WEIGHT_BMI_THRESHOLD} → 실제 체중 ${round(weightKg)} kg 사용`,
    `REE = 10 × ${round(weightUsedKg)} + 6.25 × ${round(heightCm)} − 5 × ${ageYears} ${
      sex === 'M' ? '+ 5' : '− 161'
    } = ${Math.round(ree)} kcal`,
    `1일 필요열량 = ${Math.round(ree)} × ${activity.value} (${activity.label}) × ${injury.value} (${injury.label}) = ${Math.round(total)} kcal`,
  ];

  return {
    bmi,
    ibwKg,
    adjustedWeightKg,
    weightUsedKg,
    ree,
    activity,
    injury,
    total,
    steps,
  };
}
