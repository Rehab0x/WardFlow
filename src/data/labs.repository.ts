import { supabase } from '@/lib/supabase';
import type { LabResult, LabResultCreateInput } from '@/domain/lab';
import { fromLabResultRow, toLabItemInsert, toLabResultInsert } from '@/mappers/lab.mapper';

type LabResultWithItems = {
  lab_items?: Array<{
    id: string;
    lab_result_id: string;
    code: string | null;
    name: string;
    value_text: string;
    value_numeric: number | null;
    unit: string;
    reference_min: number | null;
    reference_max: number | null;
    is_abnormal: boolean;
    hl_flag: 'H' | 'L' | null;
    display_order: number;
    created_at: string;
    updated_at: string;
  }>;
} & Parameters<typeof fromLabResultRow>[0];

const PURE_NUMERIC = /^-?\d+(\.\d+)?$/;

export async function listLabsByPatient(patientId: string): Promise<LabResult[]> {
  const { data, error } = await supabase
    .from('lab_results')
    .select('*, lab_items(*)')
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('test_date', { ascending: false });

  if (error) throw error;

  return (data as LabResultWithItems[]).map((row) =>
    fromLabResultRow(row, (row.lab_items ?? []) as Parameters<typeof fromLabResultRow>[1])
  );
}

export async function createLabResult(input: LabResultCreateInput): Promise<LabResult> {
  const { data: result, error: resultError } = await supabase
    .from('lab_results')
    .insert(toLabResultInsert(input))
    .select('*')
    .single();

  if (resultError) throw resultError;

  const itemInputs = input.items.map((item) => toLabItemInsert(result.id, item));
  if (itemInputs.length > 0) {
    const { error: itemError } = await supabase.from('lab_items').insert(itemInputs);
    if (itemError) throw itemError;
  }

  const { data: hydrated, error: hydrateError } = await supabase
    .from('lab_results')
    .select('*, lab_items(*)')
    .eq('id', result.id)
    .single();

  if (hydrateError) throw hydrateError;

  const row = hydrated as LabResultWithItems;
  return fromLabResultRow(row, (row.lab_items ?? []) as Parameters<typeof fromLabResultRow>[1]);
}

export async function softDeleteLabResult(id: string): Promise<void> {
  const { error } = await supabase
    .from('lab_results')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function updateLabItemValue(input: {
  patientId: string;
  date: string;
  itemName: string;
  newValue: string | number;
}): Promise<void> {
  const valueText = typeof input.newValue === 'string' ? input.newValue.trim() : String(input.newValue);
  const isNumeric = PURE_NUMERIC.test(valueText);
  const valueNumeric = isNumeric ? Number(valueText) : null;

  const { data, error } = await supabase
    .from('lab_results')
    .select('*, lab_items(*)')
    .eq('patient_id', input.patientId)
    .eq('test_date', input.date)
    .is('deleted_at', null);

  if (error) throw error;

  const rows = data as unknown as LabResultWithItems[];
  let targetResult: LabResultWithItems | undefined;
  let targetItem: NonNullable<LabResultWithItems['lab_items']>[number] | undefined;

  for (const result of rows) {
    const item = result.lab_items?.find((candidate) => candidate.name === input.itemName);
    if (item) {
      targetResult = result;
      targetItem = item;
      break;
    }
    if (!targetResult && result.category !== 'Culture') {
      targetResult = result;
    }
  }

  if (targetItem) {
    if (valueText === '') {
      const { error: deleteError } = await supabase
        .from('lab_items')
        .delete()
        .eq('id', targetItem.id);
      if (deleteError) throw deleteError;
      return;
    }

    const referenceMin = targetItem.reference_min;
    const referenceMax = targetItem.reference_max;
    const isAbnormal = isNumeric
      ? (referenceMin !== null && valueNumeric !== null && valueNumeric < referenceMin) ||
        (referenceMax !== null && valueNumeric !== null && valueNumeric > referenceMax)
      : false;
    const hlFlag = isNumeric
      ? referenceMax !== null && valueNumeric !== null && valueNumeric > referenceMax
        ? 'H'
        : referenceMin !== null && valueNumeric !== null && valueNumeric < referenceMin
          ? 'L'
          : null
      : null;

    const { error: updateError } = await supabase
      .from('lab_items')
      .update({
        value_text: valueText,
        value_numeric: valueNumeric,
        is_abnormal: isAbnormal,
        hl_flag: hlFlag,
      })
      .eq('id', targetItem.id);

    if (updateError) throw updateError;
    return;
  }

  if (valueText === '') return;

  if (targetResult) {
    const displayOrder = targetResult.lab_items?.length ?? 0;
    const { error: insertItemError } = await supabase.from('lab_items').insert({
      lab_result_id: targetResult.id,
      name: input.itemName,
      value_text: valueText,
      value_numeric: valueNumeric,
      unit: '',
      is_abnormal: false,
      display_order: displayOrder,
    });

    if (insertItemError) throw insertItemError;
    return;
  }

  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('User not authenticated.');

  const { data: newResult, error: resultError } = await supabase
    .from('lab_results')
    .insert({
      patient_id: input.patientId,
      test_date: input.date,
      category: 'Other',
      source: 'manual',
      created_by: user.id,
    })
    .select('*')
    .single();

  if (resultError) throw resultError;

  const { error: itemError } = await supabase.from('lab_items').insert({
    lab_result_id: newResult.id,
    name: input.itemName,
    value_text: valueText,
    value_numeric: valueNumeric,
    unit: '',
    is_abnormal: false,
    display_order: 0,
  });

  if (itemError) throw itemError;
}
