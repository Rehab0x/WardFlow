import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_FACTORS,
  INJURY_FACTORS,
  adjustedBodyWeightKg,
  bodyMassIndex,
  calculateCalorieNeeds,
  idealBodyWeightKg,
  isUsableMeasurement,
} from './calorieNeeds';

const base = {
  sex: 'M' as const,
  ageYears: 70,
  heightCm: 170,
  weightKg: 65,
  activityFactorId: 'bedridden', // 1.2
  injuryFactorId: 'none', // 1.0
};

describe('calculateCalorieNeeds', () => {
  it('follows Mifflin-St Jeor for men', () => {
    // 10×65 + 6.25×170 − 5×70 + 5 = 650 + 1062.5 − 350 + 5 = 1367.5
    const result = calculateCalorieNeeds(base)!;
    expect(result.ree).toBeCloseTo(1367.5, 4);
    expect(result.total).toBeCloseTo(1367.5 * 1.2, 4);
  });

  it('follows Mifflin-St Jeor for women', () => {
    // 10×65 + 6.25×170 − 5×70 − 161 = 1201.5
    const result = calculateCalorieNeeds({ ...base, sex: 'F' })!;
    expect(result.ree).toBeCloseTo(1201.5, 4);
  });

  it('multiplies by the activity and injury factors', () => {
    const result = calculateCalorieNeeds({
      ...base,
      activityFactorId: 'out-of-bed', // 1.3
      injuryFactorId: 'sepsis-high', // 1.6
    })!;

    expect(result.activity.value).toBe(1.3);
    expect(result.injury.value).toBe(1.6);
    expect(result.total).toBeCloseTo(1367.5 * 1.3 * 1.6, 4);
  });

  it('uses the actual weight when BMI is 30 or below', () => {
    const result = calculateCalorieNeeds(base)!;
    expect(result.weightUsedKg).toBe(65);
    expect(result.adjustedWeightKg).toBeUndefined();
    expect(result.steps[1]).toContain('실제 체중');
  });

  it('switches to adjusted body weight above BMI 30', () => {
    // 170cm 100kg → BMI 34.6
    const result = calculateCalorieNeeds({ ...base, weightKg: 100 })!;

    const ibw = 1.7 * 1.7 * 22; // 63.58
    const adjusted = ibw + 0.25 * (100 - ibw); // 72.685
    expect(result.bmi).toBeCloseTo(34.6, 1);
    expect(result.ibwKg).toBeCloseTo(ibw, 4);
    expect(result.adjustedWeightKg).toBeCloseTo(adjusted, 4);
    expect(result.weightUsedKg).toBeCloseTo(adjusted, 4);
    // 보정체중이 공식에 들어갔는지
    expect(result.ree).toBeCloseTo(10 * adjusted + 6.25 * 170 - 5 * 70 + 5, 4);
    expect(result.steps[1]).toContain('보정체중');
  });

  it('uses 21 instead of 22 for the female ideal weight', () => {
    const result = calculateCalorieNeeds({ ...base, sex: 'F', weightKg: 100 })!;
    expect(result.ibwKg).toBeCloseTo(1.7 * 1.7 * 21, 4);
  });

  it('shows the numbers that went into each step', () => {
    const result = calculateCalorieNeeds(base)!;
    expect(result.steps).toHaveLength(4);
    expect(result.steps[2]).toContain('10 × 65');
    expect(result.steps[2]).toContain('6.25 × 170');
    expect(result.steps[2]).toContain('5 × 70');
    expect(result.steps[3]).toContain('1.2');
    expect(result.steps[3]).toContain('침상 생활');
  });

  it('refuses to calculate on impossible measurements', () => {
    expect(calculateCalorieNeeds({ ...base, heightCm: 0 })).toBeNull();
    expect(calculateCalorieNeeds({ ...base, heightCm: 17 })).toBeNull(); // 170 오타
    expect(calculateCalorieNeeds({ ...base, weightKg: 0 })).toBeNull();
    expect(calculateCalorieNeeds({ ...base, weightKg: 650 })).toBeNull(); // 65 오타
    expect(calculateCalorieNeeds({ ...base, weightKg: Number.NaN })).toBeNull();
    expect(calculateCalorieNeeds({ ...base, ageYears: 130 })).toBeNull();
  });

  it('falls back to the first factor when an unknown id arrives', () => {
    const result = calculateCalorieNeeds({ ...base, activityFactorId: 'nope' })!;
    expect(result.activity).toEqual(ACTIVITY_FACTORS[0]);
  });
});

describe('구성 요소', () => {
  it('computes BMI and ideal weight', () => {
    expect(bodyMassIndex(170, 65)).toBeCloseTo(22.49, 2);
    expect(idealBodyWeightKg(170, 'M')).toBeCloseTo(63.58, 2);
    expect(idealBodyWeightKg(170, 'F')).toBeCloseTo(60.69, 2);
  });

  it('takes a quarter of the excess for the adjusted weight', () => {
    expect(adjustedBodyWeightKg(100, 60)).toBe(70);
  });

  it('screens obviously wrong measurements', () => {
    expect(isUsableMeasurement(170, 65)).toBe(true);
    expect(isUsableMeasurement(170, 0)).toBe(false);
    expect(isUsableMeasurement(300, 65)).toBe(false);
  });

  it('keeps every factor id unique', () => {
    for (const factors of [ACTIVITY_FACTORS, INJURY_FACTORS]) {
      const ids = factors.map((factor) => factor.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
