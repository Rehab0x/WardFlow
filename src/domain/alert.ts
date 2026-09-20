export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertRuleKind = 'lab_threshold' | 'antibiotic_duration';
/** 'abnormal'은 임계값 없이 참조범위 이탈(H/L)만으로 판정한다. */
export type AlertComparator = 'lt' | 'lte' | 'gt' | 'gte' | 'abnormal';

export interface AlertRule {
  id: string;
  ownerId: string;
  name: string;
  kind: AlertRuleKind;
  /** lab_threshold: 검사 항목 표시명 (대소문자 무시 매칭) */
  labItem?: string;
  comparator?: AlertComparator;
  threshold?: number;
  /** antibiotic_duration: 사용 일수 임계값 */
  dayThreshold?: number;
  severity: AlertSeverity;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AlertRuleCreateInput = Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>;
export type AlertRuleUpdateInput = Partial<
  Omit<AlertRule, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
>;

export interface AlertEvent {
  id: string;
  ownerId: string;
  /** 규칙이 삭제되면 null이 된다. 어떤 규칙이었는지는 ruleName에 남는다. */
  ruleId?: string;
  ruleName: string;
  patientId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  /** 같은 근거로 중복 생성되지 않게 하는 키 */
  dedupeKey: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
}

export type AlertEventCreateInput = Omit<AlertEvent, 'id' | 'triggeredAt' | 'acknowledgedAt'>;
