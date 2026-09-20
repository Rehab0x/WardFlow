import type { Inserts, Tables, Updates } from '@/types/supabase';
import type {
  AlertEvent,
  AlertEventCreateInput,
  AlertRule,
  AlertRuleCreateInput,
  AlertRuleUpdateInput,
} from '@/domain/alert';

export function fromAlertRuleRow(row: Tables<'alert_rules'>): AlertRule {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    kind: row.kind,
    labItem: row.lab_item ?? undefined,
    comparator: row.comparator ?? undefined,
    threshold: row.threshold ?? undefined,
    dayThreshold: row.day_threshold ?? undefined,
    severity: row.severity,
    isEnabled: row.is_enabled,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toAlertRuleInsert(input: AlertRuleCreateInput): Inserts<'alert_rules'> {
  return {
    owner_id: input.ownerId,
    name: input.name,
    kind: input.kind,
    lab_item: input.labItem ?? null,
    comparator: input.comparator ?? null,
    threshold: input.threshold ?? null,
    day_threshold: input.dayThreshold ?? null,
    severity: input.severity,
    is_enabled: input.isEnabled,
  };
}

export function toAlertRuleUpdate(input: AlertRuleUpdateInput): Updates<'alert_rules'> {
  return {
    name: input.name,
    kind: input.kind,
    lab_item: input.labItem === undefined ? undefined : (input.labItem ?? null),
    comparator: input.comparator === undefined ? undefined : (input.comparator ?? null),
    threshold: input.threshold === undefined ? undefined : (input.threshold ?? null),
    day_threshold: input.dayThreshold === undefined ? undefined : (input.dayThreshold ?? null),
    severity: input.severity,
    is_enabled: input.isEnabled,
  };
}

export function fromAlertEventRow(row: Tables<'alert_events'>): AlertEvent {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ruleId: row.rule_id ?? undefined,
    ruleName: row.rule_name,
    patientId: row.patient_id,
    severity: row.severity,
    title: row.title,
    message: row.message,
    dedupeKey: row.dedupe_key,
    triggeredAt: new Date(row.triggered_at),
    acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
  };
}

export function toAlertEventInsert(input: AlertEventCreateInput): Inserts<'alert_events'> {
  return {
    owner_id: input.ownerId,
    rule_id: input.ruleId ?? null,
    rule_name: input.ruleName,
    patient_id: input.patientId,
    severity: input.severity,
    title: input.title,
    message: input.message,
    dedupe_key: input.dedupeKey,
  };
}
