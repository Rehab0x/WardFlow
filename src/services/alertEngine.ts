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

/** 지금도 유효한(= 마지막 검사에서도 걸린) Lab 임계값 위반 */
export interface OpenLabBreach {
  patientId: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  itemName: string;
  value: number | string;
  unit: string;
  hlFlag?: 'H' | 'L';
  /** 임계값을 어느 쪽으로 넘었는지 — 화면에 ↑/↓로 쓴다 */
  direction: 'high' | 'low' | 'abnormal';
  /** 마지막 측정일 */
  testDate: Date;
  /** 연속으로 걸리기 시작한 검사일 */
  since: Date;
  /** 연속으로 걸린 검사 횟수 */
  streak: number;
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

/**
 * 지금도 열려 있는 Lab 임계값 위반 — **항목별 가장 최근 검사**만 본다.
 *
 * 알림 이벤트(`alert_events`)는 "언제 터졌나"의 기록이라 시간이 지나도 남지만,
 * 회진 목록에 띄울 신호는 "지금도 문제인가"여야 한다. 그래서 마지막 검사가
 * 여전히 조건을 만족할 때만 돌려주고, 다음 검사에서 값이 돌아오면 사라진다.
 *
 * 검사 자체가 없으면(항목을 최근에 안 냈으면) 판단할 근거가 없으므로 내보내지 않는다.
 */
export function findOpenLabBreaches(input: {
  rules: AlertRule[];
  labResults: AlertLabResult[];
}): OpenLabBreach[] {
  const rules = input.rules.filter(
    (rule) => rule.isEnabled && rule.kind === 'lab_threshold' && rule.labItem && rule.comparator
  );
  if (rules.length === 0) return [];

  const byPatient = new Map<string, AlertLabResult[]>();
  for (const lab of input.labResults) {
    const list = byPatient.get(lab.patientId) ?? [];
    list.push(lab);
    byPatient.set(lab.patientId, list);
  }

  const breaches: OpenLabBreach[] = [];

  for (const [patientId, results] of byPatient) {
    // 최신 검사부터 본다.
    const ordered = [...results].sort((a, b) => b.testDate.getTime() - a.testDate.getTime());

    for (const rule of rules) {
      const target = rule.labItem!.trim().toLowerCase();
      // 그 항목을 담고 있는 검사만 추려야 "마지막 측정값"을 알 수 있다.
      const measured = ordered
        .map((lab) => ({
          lab,
          item: lab.items.find((entry) => entry.name.trim().toLowerCase() === target),
        }))
        .filter((entry): entry is { lab: AlertLabResult; item: AlertLabItem } => Boolean(entry.item));

      const latest = measured[0];
      if (!latest || !matchesLabCondition(rule, latest.item)) continue; // 측정 없음 또는 해결됨

      // 연속으로 걸린 구간을 세어 "언제부터"를 보여준다.
      let streak = 0;
      let since = latest.lab.testDate;
      for (const entry of measured) {
        if (!matchesLabCondition(rule, entry.item)) break;
        streak++;
        since = entry.lab.testDate;
      }

      breaches.push({
        patientId,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        itemName: latest.item.name,
        value: latest.item.value,
        unit: latest.item.unit,
        hlFlag: latest.item.hlFlag,
        direction: breachDirection(rule, latest.item),
        testDate: latest.lab.testDate,
        since,
        streak,
      });
    }
  }

  return breaches.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.itemName.localeCompare(b.itemName)
  );
}

function breachDirection(rule: AlertRule, item: AlertLabItem): 'high' | 'low' | 'abnormal' {
  if (rule.comparator === 'lt' || rule.comparator === 'lte') return 'low';
  if (rule.comparator === 'gt' || rule.comparator === 'gte') return 'high';
  if (item.hlFlag === 'H') return 'high';
  if (item.hlFlag === 'L') return 'low';
  return 'abnormal';
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
