import { describe, expect, it } from 'vitest';
import { daysSince, describeRule, evaluateAlertRules } from './alertEngine';
import type { AlertRule } from '@/domain/alert';
import type { LabResult } from '@/types/lab';
import type { Medication } from '@/types/medication';
import type { Patient } from '@/types/patient';

const patient = { id: 'p1', name: '김환자', roomBed: '302-1' } as Patient;
const today = new Date(2026, 8, 20);

const rule = (overrides: Partial<AlertRule>): AlertRule => ({
  id: 'r1',
  ownerId: 'u1',
  name: '저나트륨혈증',
  kind: 'lab_threshold',
  labItem: 'Na',
  comparator: 'lt',
  threshold: 130,
  severity: 'critical',
  isEnabled: true,
  createdAt: today,
  updatedAt: today,
  ...overrides,
});

const lab = (value: number | string, overrides: Partial<LabResult> = {}): LabResult => ({
  id: 'lab1',
  patientId: 'p1',
  testDate: new Date(2026, 8, 19),
  category: 'BC',
  source: 'parsed',
  createdAt: today,
  items: [{ name: 'Na', value, unit: 'mmol/L', isAbnormal: false }],
  ...overrides,
});

const abx = (startDate: Date, overrides: Partial<Medication> = {}): Medication =>
  ({
    id: 'm1',
    patientId: 'p1',
    category: 'antibiotic',
    drugName: 'Meropenem',
    isActive: true,
    startDate,
    ...overrides,
  }) as Medication;

const base = { ownerId: 'u1', patients: [patient], labResults: [], medications: [], today };

describe('evaluateAlertRules — lab thresholds', () => {
  it('fires when the value crosses the threshold', () => {
    const events = evaluateAlertRules({ ...base, rules: [rule({})], labResults: [lab(128)] });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ patientId: 'p1', severity: 'critical' });
    expect(events[0]?.title).toContain('Na 128');
    expect(events[0]?.message).toContain('302-1');
  });

  it('stays quiet when the value is within range', () => {
    expect(evaluateAlertRules({ ...base, rules: [rule({})], labResults: [lab(140)] })).toEqual([]);
  });

  it('respects each comparator boundary', () => {
    const at130 = [lab(130)];
    expect(evaluateAlertRules({ ...base, rules: [rule({ comparator: 'lt' })], labResults: at130 })).toHaveLength(0);
    expect(evaluateAlertRules({ ...base, rules: [rule({ comparator: 'lte' })], labResults: at130 })).toHaveLength(1);
    expect(evaluateAlertRules({ ...base, rules: [rule({ comparator: 'gt', threshold: 129 })], labResults: at130 })).toHaveLength(1);
    expect(evaluateAlertRules({ ...base, rules: [rule({ comparator: 'gte', threshold: 130 })], labResults: at130 })).toHaveLength(1);
  });

  it('supports an abnormal-flag rule without a threshold', () => {
    const flagged = lab('trace', {
      items: [{ name: 'Na', value: 'trace', unit: '', isAbnormal: true, hlFlag: 'L' }],
    });
    const events = evaluateAlertRules({
      ...base,
      rules: [rule({ comparator: 'abnormal', threshold: undefined })],
      labResults: [flagged],
    });
    expect(events).toHaveLength(1);
  });

  it('ignores qualitative values for numeric comparisons', () => {
    const qualitative = lab('trace', {
      items: [{ name: 'Na', value: 'trace', unit: '', isAbnormal: false }],
    });
    expect(evaluateAlertRules({ ...base, rules: [rule({})], labResults: [qualitative] })).toEqual([]);
  });

  it('matches the item name case-insensitively', () => {
    const lowercase = lab(120, {
      items: [{ name: 'na', value: 120, unit: 'mmol/L', isAbnormal: false }],
    });
    expect(evaluateAlertRules({ ...base, rules: [rule({})], labResults: [lowercase] })).toHaveLength(1);
  });

  it('gives one dedupe key per lab result and item', () => {
    const events = evaluateAlertRules({
      ...base,
      rules: [rule({})],
      labResults: [lab(128), lab(125, { id: 'lab2', testDate: new Date(2026, 8, 20) })],
    });
    const keys = events.map((event) => event.dedupeKey);
    expect(new Set(keys).size).toBe(2);
    expect(keys[0]).toContain('lab1');
  });

  it('skips disabled rules and unknown patients', () => {
    expect(
      evaluateAlertRules({ ...base, rules: [rule({ isEnabled: false })], labResults: [lab(128)] })
    ).toEqual([]);
    expect(
      evaluateAlertRules({ ...base, patients: [], rules: [rule({})], labResults: [lab(128)] })
    ).toEqual([]);
  });
});

describe('evaluateAlertRules — antibiotic duration', () => {
  const abxRule = rule({
    id: 'r2',
    name: '항생제 장기 사용',
    kind: 'antibiotic_duration',
    labItem: undefined,
    comparator: undefined,
    threshold: undefined,
    dayThreshold: 14,
    severity: 'warning',
  });

  it('fires once the course reaches the day threshold', () => {
    const events = evaluateAlertRules({
      ...base,
      rules: [abxRule],
      medications: [abx(new Date(2026, 8, 7))], // 9/7 시작 → 9/20은 14일째
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.title).toContain('14일째');
  });

  it('stays quiet below the threshold', () => {
    expect(
      evaluateAlertRules({ ...base, rules: [abxRule], medications: [abx(new Date(2026, 8, 10))] })
    ).toEqual([]);
  });

  it('ignores finished courses and non-antibiotics', () => {
    const start = new Date(2026, 8, 1);
    expect(
      evaluateAlertRules({
        ...base,
        rules: [abxRule],
        medications: [
          abx(start, { isActive: false }),
          abx(start, { id: 'm2', category: 'hospital' }),
        ],
      })
    ).toEqual([]);
  });

  it('keys on the medication so it does not repeat every day', () => {
    const medications = [abx(new Date(2026, 8, 1))];
    const day1 = evaluateAlertRules({ ...base, rules: [abxRule], medications });
    const day2 = evaluateAlertRules({
      ...base,
      rules: [abxRule],
      medications,
      today: new Date(2026, 8, 21),
    });
    expect(day1[0]?.dedupeKey).toBe(day2[0]?.dedupeKey);
  });
});

describe('daysSince', () => {
  it('counts the start date as day 1', () => {
    expect(daysSince(new Date(2026, 8, 20), new Date(2026, 8, 20))).toBe(1);
    expect(daysSince(new Date(2026, 8, 7), new Date(2026, 8, 20))).toBe(14);
  });
});

describe('describeRule', () => {
  it('renders each rule kind readably', () => {
    expect(describeRule(rule({}))).toBe('Na < 130');
    expect(describeRule(rule({ comparator: 'gte', threshold: 5.5, labItem: 'K' }))).toBe('K ≥ 5.5');
    expect(describeRule(rule({ comparator: 'abnormal' }))).toBe('Na 참조범위 이탈');
    expect(describeRule(rule({ kind: 'antibiotic_duration', dayThreshold: 14 }))).toBe(
      '항생제 14일 이상'
    );
  });
});
