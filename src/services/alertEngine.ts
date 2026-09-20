import type {
  AlertEventCreateInput,
  AlertRule,
  AlertSeverity,
} from '@/domain/alert';
import type { Medication } from '@/types/medication';
import type { Patient } from '@/types/patient';
import { formatDate } from '@/utils/dateUtils';

/**
 * 알림 규칙 평가 엔진.
 *
 * 순수 함수다 — 입력(환자·Lab·투약·규칙)만 보고 "생성되어야 할 알림"을 계산한다.
 * 저장과 중복 제거는 호출자(`alertService`)와 DB 유니크 제약이 맡는다.
 *
 * 평가 시점은 Today 브리핑을 불러올 때다. 별도 서버 크론이 없으므로
 * "앱을 열면 그 시점 기준으로 다시 판정"하는 모델이며, 같은 근거로 반복 판정돼도
 * `dedupeKey` 덕분에 알림은 한 번만 남는다.
 */

/**
 * 평가에 필요한 최소 형태만 요구한다.
 * 뷰모델 `LabResult`와 리포지토리의 `LabValueRow` 둘 다 그대로 들어맞는다.
 */
export interface AlertLabItem {
  name: string;
  value: number | string;
  unit: string;
  isAbnormal: boolean;
  hlFlag?: 'H' | 'L';
}

export interface AlertLabResult {
  id: string;
  patientId: string;
  testDate: Date;
  items: AlertLabItem[];
}

export interface AlertEvaluationInput {
  ownerId: string;
  rules: AlertRule[];
  patients: Patient[];
  labResults: AlertLabResult[];
  medications: Medication[];
  /** 항생제 사용 일수 계산 기준일 (기본: 오늘) */
  today?: Date;
}

export function evaluateAlertRules(input: AlertEvaluationInput): AlertEventCreateInput[] {
  const { ownerId, rules, patients, labResults, medications } = input;
  const today = input.today ?? new Date();

  const enabled = rules.filter((rule) => rule.isEnabled);
  if (enabled.length === 0) return [];

  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const events: AlertEventCreateInput[] = [];

  for (const rule of enabled) {
    if (rule.kind === 'lab_threshold') {
      events.push(...evaluateLabRule(rule, ownerId, patientById, labResults));
    } else {
      events.push(...evaluateAntibioticRule(rule, ownerId, patientById, medications, today));
    }
  }

  return events;
}

function evaluateLabRule(
  rule: AlertRule,
  ownerId: string,
  patientById: Map<string, Patient>,
  labResults: AlertLabResult[]
): AlertEventCreateInput[] {
  const target = rule.labItem?.trim().toLowerCase();
  if (!target || !rule.comparator) return [];

  const events: AlertEventCreateInput[] = [];

  for (const lab of labResults) {
    const patient = patientById.get(lab.patientId);
    if (!patient) continue;

    for (const item of lab.items) {
      if (item.name.trim().toLowerCase() !== target) continue;
      if (!matchesLabCondition(rule, item)) continue;

      const unit = item.unit ? ` ${item.unit}` : '';
      events.push({
        ownerId,
        ruleId: rule.id,
        ruleName: rule.name,
        patientId: patient.id,
        severity: rule.severity,
        title: `${patient.name} · ${item.name} ${item.value}${unit}`,
        message: [
          `${patient.roomBed} ${patient.name}`,
          `${item.name} ${item.value}${unit}${item.hlFlag ? ` (${item.hlFlag})` : ''}`,
          `검사일 ${formatDate(lab.testDate)}`,
          `규칙: ${describeRule(rule)}`,
        ].join(' · '),
        // 같은 Lab 결과의 같은 항목이면 한 번만
        dedupeKey: `lab|${rule.id}|${lab.id}|${item.name.toLowerCase()}`,
      });
    }
  }

  return events;
}

function matchesLabCondition(rule: AlertRule, item: AlertLabItem): boolean {
  if (rule.comparator === 'abnormal') {
    return item.isAbnormal || Boolean(item.hlFlag);
  }

  const value = typeof item.value === 'number' ? item.value : Number(item.value);
  if (!Number.isFinite(value)) return false;
  if (rule.threshold === undefined) return false;

  switch (rule.comparator) {
    case 'lt':
      return value < rule.threshold;
    case 'lte':
      return value <= rule.threshold;
    case 'gt':
      return value > rule.threshold;
    case 'gte':
      return value >= rule.threshold;
    default:
      return false;
  }
}

function evaluateAntibioticRule(
  rule: AlertRule,
  ownerId: string,
  patientById: Map<string, Patient>,
  medications: Medication[],
  today: Date
): AlertEventCreateInput[] {
  if (rule.dayThreshold === undefined) return [];

  const events: AlertEventCreateInput[] = [];

  for (const medication of medications) {
    if (medication.category !== 'antibiotic' || !medication.isActive) continue;

    const patient = patientById.get(medication.patientId);
    if (!patient) continue;

    const days = daysSince(medication.startDate, today);
    if (days < rule.dayThreshold) continue;

    events.push({
      ownerId,
      ruleId: rule.id,
      ruleName: rule.name,
      patientId: patient.id,
      severity: rule.severity,
      title: `${patient.name} · ${medication.drugName} ${days}일째`,
      message: [
        `${patient.roomBed} ${patient.name}`,
        `${medication.drugName} ${days}일째 (시작 ${formatDate(medication.startDate)})`,
        `규칙: ${describeRule(rule)}`,
      ].join(' · '),
      // 한 약제 코스당 한 번만 — 매일 반복해서 뜨지 않게 한다
      dedupeKey: `abx|${rule.id}|${medication.id}`,
    });
  }

  return events;
}

/** 시작일을 1일째로 센다 (임상에서 "N일째"로 말하는 방식). */
export function daysSince(startDate: Date, today: Date): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

const COMPARATOR_LABEL: Record<string, string> = {
  lt: '<',
  lte: '≤',
  gt: '>',
  gte: '≥',
};

/** 규칙을 사람이 읽는 한 줄로 */
export function describeRule(rule: AlertRule): string {
  if (rule.kind === 'antibiotic_duration') {
    return `항생제 ${rule.dayThreshold}일 이상`;
  }
  if (rule.comparator === 'abnormal') {
    return `${rule.labItem} 참조범위 이탈`;
  }
  const symbol = rule.comparator ? COMPARATOR_LABEL[rule.comparator] : '';
  return `${rule.labItem} ${symbol} ${rule.threshold}`;
}

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  info: '정보',
  warning: '주의',
  critical: '위험',
};

export const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/** 기본 제안 규칙 — 설정 화면에서 한 번에 추가할 수 있게 한다. */
export const SUGGESTED_RULES: Array<Omit<AlertRule, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>> =
  [
    {
      name: '저나트륨혈증 (Na < 130)',
      kind: 'lab_threshold',
      labItem: 'Na',
      comparator: 'lt',
      threshold: 130,
      severity: 'critical',
      isEnabled: true,
    },
    {
      name: '고칼륨혈증 (K > 5.5)',
      kind: 'lab_threshold',
      labItem: 'K',
      comparator: 'gt',
      threshold: 5.5,
      severity: 'critical',
      isEnabled: true,
    },
    {
      name: '신기능 저하 (Cr > 2.0)',
      kind: 'lab_threshold',
      labItem: 'Cr',
      comparator: 'gt',
      threshold: 2.0,
      severity: 'warning',
      isEnabled: true,
    },
    {
      name: '항생제 장기 사용 (14일 이상)',
      kind: 'antibiotic_duration',
      dayThreshold: 14,
      severity: 'warning',
      isEnabled: true,
    },
  ];
