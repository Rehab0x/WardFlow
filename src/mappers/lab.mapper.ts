import type { Inserts, Tables } from '@/types/supabase';
import type { LabItem, LabItemCreateInput, LabResult, LabResultCreateInput } from '@/domain/lab';
import { fromDateOnly, toDateOnly } from './date';

export function fromLabItemRow(row: Tables<'lab_items'>): LabItem {
  return {
    id: row.id,
    labResultId: row.lab_result_id,
    code: row.code ?? undefined,
    name: row.name,
    valueText: row.value_text,
    valueNumeric: row.value_numeric ?? undefined,
    unit: row.unit,
    referenceMin: row.reference_min ?? undefined,
    referenceMax: row.reference_max ?? undefined,
    isAbnormal: row.is_abnormal,
    hlFlag: row.hl_flag ?? undefined,
    displayOrder: row.display_order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function fromLabResultRow(
  row: Tables<'lab_results'>,
  items: Tables<'lab_items'>[] = []
): LabResult {
  return {
    id: row.id,
    patientId: row.patient_id,
    testDate: fromDateOnly(row.test_date),
    category: row.category,
    source: row.source,
    rawText: row.raw_text ?? undefined,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    items: items.map(fromLabItemRow),
  };
}

export function toLabResultInsert(input: LabResultCreateInput): Inserts<'lab_results'> {
  return {
    patient_id: input.patientId,
    test_date: toDateOnly(input.testDate),
    category: input.category,
    source: input.source,
    raw_text: input.rawText ?? null,
    created_by: input.createdBy,
  };
}

export function toLabItemInsert(
  labResultId: string,
  input: LabItemCreateInput
): Inserts<'lab_items'> {
  return {
    lab_result_id: labResultId,
    code: input.code ?? null,
    name: input.name,
    value_text: input.valueText,
    value_numeric: input.valueNumeric ?? null,
    unit: input.unit,
    reference_min: input.referenceMin ?? null,
    reference_max: input.referenceMax ?? null,
    is_abnormal: input.isAbnormal,
    hl_flag: input.hlFlag ?? null,
    display_order: input.displayOrder,
  };
}

