import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type {
  AlertEvent,
  AlertEventCreateInput,
  AlertRule,
  AlertRuleCreateInput,
  AlertRuleUpdateInput,
} from '@/domain/alert';
import {
  fromAlertEventRow,
  fromAlertRuleRow,
  toAlertEventInsert,
  toAlertRuleInsert,
  toAlertRuleUpdate,
} from '@/mappers/alert.mapper';

const ruleColumns = `
  id,
  owner_id,
  name,
  kind,
  lab_item,
  comparator,
  threshold,
  day_threshold,
  severity,
  is_enabled,
  created_at,
  updated_at
`;

const eventColumns = `
  id,
  owner_id,
  rule_id,
  rule_name,
  patient_id,
  severity,
  title,
  message,
  dedupe_key,
  triggered_at,
  acknowledged_at,
  created_at
`;

/** Postgres: relation does not exist — 마이그레이션 미적용 상태 */
const UNDEFINED_TABLE = '42P01';

/**
 * 알림 테이블은 별도 마이그레이션(`202609200001_alert_rules_and_events.sql`)으로 추가된다.
 * 앱이 먼저 배포되고 마이그레이션이 나중에 적용될 수 있으므로,
 * 테이블이 없을 때는 기능을 조용히 꺼둔 것처럼 동작시킨다(빈 결과). 앱 전체가 깨지면 안 된다.
 */
export function isAlertsMigrationMissing(error: unknown): boolean {
  const code = (error as PostgrestError | null)?.code;
  return code === UNDEFINED_TABLE;
}

export class AlertsMigrationMissingError extends Error {
  constructor() {
    super(
      '알림 테이블이 아직 없습니다. supabase/migrations의 알림 마이그레이션을 적용해주세요.'
    );
    this.name = 'AlertsMigrationMissingError';
  }
}

// ─── Rules ───

export async function listAlertRules(): Promise<AlertRule[]> {
  const { data, error } = await supabase
    .from('alert_rules')
    .select(ruleColumns)
    .order('created_at', { ascending: true });

  if (error) {
    if (isAlertsMigrationMissing(error)) return [];
    throw error;
  }
  return data.map(fromAlertRuleRow);
}

export async function createAlertRule(input: AlertRuleCreateInput): Promise<AlertRule> {
  const { data, error } = await supabase
    .from('alert_rules')
    .insert(toAlertRuleInsert(input))
    .select(ruleColumns)
    .single();

  if (error) {
    if (isAlertsMigrationMissing(error)) throw new AlertsMigrationMissingError();
    throw error;
  }
  return fromAlertRuleRow(data);
}

export async function updateAlertRule(
  id: string,
  input: AlertRuleUpdateInput
): Promise<AlertRule> {
  const { data, error } = await supabase
    .from('alert_rules')
    .update(toAlertRuleUpdate(input))
    .eq('id', id)
    .select(ruleColumns)
    .single();

  if (error) {
    if (isAlertsMigrationMissing(error)) throw new AlertsMigrationMissingError();
    throw error;
  }
  return fromAlertRuleRow(data);
}

export async function deleteAlertRule(id: string): Promise<void> {
  const { error } = await supabase.from('alert_rules').delete().eq('id', id);
  if (error) {
    if (isAlertsMigrationMissing(error)) throw new AlertsMigrationMissingError();
    throw error;
  }
}

// ─── Events ───

export async function listAlertEvents(options?: {
  limit?: number;
  /** true면 아직 확인하지 않은 알림만 */
  unacknowledgedOnly?: boolean;
}): Promise<AlertEvent[]> {
  let query = supabase
    .from('alert_events')
    .select(eventColumns)
    .order('triggered_at', { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.unacknowledgedOnly) query = query.is('acknowledged_at', null);

  const { data, error } = await query;
  if (error) {
    if (isAlertsMigrationMissing(error)) return [];
    throw error;
  }
  return data.map(fromAlertEventRow);
}

/**
 * 새 알림을 저장한다. `(owner_id, dedupe_key)` 유니크 제약 덕분에
 * 같은 근거로 다시 평가돼도 중복 행이 생기지 않는다(무시하고 지나간다).
 * @returns 실제로 새로 저장된 알림
 */
export async function insertNewAlertEvents(
  inputs: AlertEventCreateInput[]
): Promise<AlertEvent[]> {
  if (inputs.length === 0) return [];

  const { data, error } = await supabase
    .from('alert_events')
    .upsert(inputs.map(toAlertEventInsert), {
      onConflict: 'owner_id,dedupe_key',
      ignoreDuplicates: true,
    })
    .select(eventColumns);

  if (error) {
    if (isAlertsMigrationMissing(error)) return [];
    throw error;
  }
  return (data ?? []).map(fromAlertEventRow);
}

export async function acknowledgeAlertEvent(id: string): Promise<AlertEvent> {
  const { data, error } = await supabase
    .from('alert_events')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('id', id)
    .select(eventColumns)
    .single();

  if (error) {
    if (isAlertsMigrationMissing(error)) throw new AlertsMigrationMissingError();
    throw error;
  }
  return fromAlertEventRow(data);
}

export async function deleteAlertEvent(id: string): Promise<void> {
  const { error } = await supabase.from('alert_events').delete().eq('id', id);
  if (error) {
    if (isAlertsMigrationMissing(error)) throw new AlertsMigrationMissingError();
    throw error;
  }
}

/** 히스토리 정리 — 확인 완료된 알림을 한 번에 지운다. */
export async function deleteAcknowledgedAlertEvents(): Promise<void> {
  const { error } = await supabase
    .from('alert_events')
    .delete()
    .not('acknowledged_at', 'is', null);

  if (error) {
    if (isAlertsMigrationMissing(error)) throw new AlertsMigrationMissingError();
    throw error;
  }
}
