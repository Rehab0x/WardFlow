import { supabase } from '@/lib/supabase';
import type { LabResult, LabResultCreateInput } from '@/domain/lab';
import { fromLabResultRow, toLabItemInsert, toLabResultInsert } from '@/mappers/lab.mapper';
import { toDateOnly } from '@/mappers/date';
import { chunkArray } from './chunk';

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

export type LabSummaryRow = {
  id: string;
  patientId: string;
  testDate: Date;
  category: string;
  items: Array<{
    name: string;
    isAbnormal: boolean;
    hlFlag?: 'H' | 'L';
  }>;
};

const PURE_NUMERIC = /^-?\d+(\.\d+)?$/;

const labResultColumns = `
  id,
  patient_id,
  test_date,
  category,
  source,
  raw_text,
  created_by,
  created_at,
  updated_at,
  deleted_at
`;

const labItemColumns = `
  id,
  lab_result_id,
  code,
  name,
  value_text,
  value_numeric,
  unit,
  reference_min,
  reference_max,
  is_abnormal,
  hl_flag,
  display_order,
  created_at,
  updated_at
`;

const labResultWithItemsColumns = `
  ${labResultColumns},
  lab_items (
    ${labItemColumns}
  )
`;

const labSummaryColumns = `
  id,
  patient_id,
  test_date,
  category,
  lab_items (
    name,
    is_abnormal,
    hl_flag
  )
`;

export async function listLabsByPatient(patientId: string): Promise<LabResult[]> {
  const { data, error } = await supabase
    .from('lab_results')
    .select(labResultWithItemsColumns)
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('test_date', { ascending: false });

  if (error) throw error;

  return (data as LabResultWithItems[]).map((row) =>
    fromLabResultRow(row, (row.lab_items ?? []) as Parameters<typeof fromLabResultRow>[1])
  );
}

export async function listLabsByDateRange(startDate: Date, endDate: Date): Promise<LabResult[]> {
  const { data, error } = await supabase
    .from('lab_results')
    .select(labResultWithItemsColumns)
    .gte('test_date', toDateOnly(startDate))
    .lte('test_date', toDateOnly(endDate))
    .is('deleted_at', null)
    .order('test_date', { ascending: false });

  if (error) throw error;

  return (data as LabResultWithItems[]).map((row) =>
    fromLabResultRow(row, (row.lab_items ?? []) as Parameters<typeof fromLabResultRow>[1])
  );
}

export async function listLabsByPatientIdsDateRange(
  patientIds: string[],
  startDate: Date,
  endDate: Date
): Promise<LabResult[]> {
  if (patientIds.length === 0) return [];

  const chunkQueries = chunkArray(patientIds, 100).map(async (chunk) => {
    const { data, error } = await supabase
      .from('lab_results')
      .select(labResultWithItemsColumns)
      .in('patient_id', chunk)
      .gte('test_date', toDateOnly(startDate))
      .lte('test_date', toDateOnly(endDate))
      .is('deleted_at', null)
      .order('test_date', { ascending: false });

    if (error) throw error;

    return (data as LabResultWithItems[]).map((row) =>
      fromLabResultRow(row, (row.lab_items ?? []) as Parameters<typeof fromLabResultRow>[1])
    );
  });

  const rows = (await Promise.all(chunkQueries)).flat();
  return rows.sort((a, b) => b.testDate.getTime() - a.testDate.getTime());
}

export async function listLabSummaryRowsByPatientIdsDateRange(
  patientIds: string[],
  startDate: Date,
  endDate: Date
): Promise<LabSummaryRow[]> {
  if (patientIds.length === 0) return [];

  const chunkQueries = chunkArray(patientIds, 100).map(async (chunk) => {
    const { data, error } = await supabase
      .from('lab_results')
      .select(labSummaryColumns)
      .in('patient_id', chunk)
      .gte('test_date', toDateOnly(startDate))
      .lte('test_date', toDateOnly(endDate))
      .is('deleted_at', null)
      .order('test_date', { ascending: false });

    if (error) throw error;

    return data.map((row) => ({
      id: row.id,
      patientId: row.patient_id,
      testDate: new Date(`${row.test_date}T00:00:00`),
      category: row.category,
      items: (row.lab_items ?? []).map((item) => ({
        name: item.name,
        isAbnormal: item.is_abnormal,
        hlFlag: item.hl_flag ?? undefined,
      })),
    }));
  });

  const rows = (await Promise.all(chunkQueries)).flat();
  return rows.sort((a, b) => b.testDate.getTime() - a.testDate.getTime());
}

export async function listLabsByPatientDateAndCategory(input: {
  patientId: string;
  testDate: Date;
  category: string;
}): Promise<LabResult[]> {
  const { data, error } = await supabase
    .from('lab_results')
    .select(labResultWithItemsColumns)
    .eq('patient_id', input.patientId)
    .eq('test_date', toDateOnly(input.testDate))
    .eq('category', input.category)
    .is('deleted_at', null);

  if (error) throw error;

  return (data as LabResultWithItems[]).map((row) =>
    fromLabResultRow(row, (row.lab_items ?? []) as Parameters<typeof fromLabResultRow>[1])
  );
}

export async function listLabsByPatientAndDate(input: {
  patientId: string;
  testDate: Date;
}): Promise<LabResult[]> {
  const { data, error } = await supabase
    .from('lab_results')
    .select(labResultWithItemsColumns)
    .eq('patient_id', input.patientId)
    .eq('test_date', toDateOnly(input.testDate))
    .is('deleted_at', null);

  if (error) throw error;

  return (data as LabResultWithItems[]).map((row) =>
    fromLabResultRow(row, (row.lab_items ?? []) as Parameters<typeof fromLabResultRow>[1])
  );
}

export async function getLabById(id: string): Promise<LabResult | null> {
  const { data, error } = await supabase
    .from('lab_results')
    .select(labResultWithItemsColumns)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as LabResultWithItems;
  return fromLabResultRow(row, (row.lab_items ?? []) as Parameters<typeof fromLabResultRow>[1]);
}

export async function listNonCultureLabHeadersByPatients(patientIds: string[]): Promise<LabResult[]> {
  if (patientIds.length === 0) return [];

  const chunkQueries = chunkArray(patientIds, 100).map(async (chunk) => {
    const { data, error } = await supabase
      .from('lab_results')
      .select(labResultColumns)
      .in('patient_id', chunk)
      .neq('category', 'Culture')
      .is('deleted_at', null)
      .order('test_date', { ascending: false });

    if (error) throw error;

    return data.map((row) => fromLabResultRow(row, []));
  });

  const rows = (await Promise.all(chunkQueries)).flat();
  return rows.sort((a, b) => b.testDate.getTime() - a.testDate.getTime());
}

export async function createLabResult(input: LabResultCreateInput): Promise<LabResult> {
  const { data: result, error: resultError } = await supabase
    .from('lab_results')
    .insert(toLabResultInsert(input))
    .select(labResultColumns)
    .single();

  if (resultError) throw resultError;

  const itemInputs = input.items.map((item) => toLabItemInsert(result.id, item));
  if (itemInputs.length === 0) {
    return fromLabResultRow(result, []);
  }

  const { data: items, error: itemError } = await supabase
    .from('lab_items')
    .insert(itemInputs)
    .select(labItemColumns);

  if (itemError) throw itemError;

  return fromLabResultRow(result, items);
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
}): Promise<LabResult | null> {
  const valueText = typeof input.newValue === 'string' ? input.newValue.trim() : String(input.newValue);
  const isNumeric = PURE_NUMERIC.test(valueText);
  const valueNumeric = isNumeric ? Number(valueText) : null;

  const { data, error } = await supabase
    .from('lab_results')
    .select(labResultWithItemsColumns)
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
    if (!targetResult) return null;

    if (valueText === '') {
      const { error: deleteError } = await supabase
        .from('lab_items')
        .delete()
        .eq('id', targetItem.id);
      if (deleteError) throw deleteError;
      return getLabById(targetResult.id);
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
    return getLabById(targetResult.id);
  }

  if (valueText === '') return null;

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
    return getLabById(targetResult.id);
  }

  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('로그인이 필요합니다.');

  const { data: newResult, error: resultError } = await supabase
    .from('lab_results')
    .insert({
      patient_id: input.patientId,
      test_date: input.date,
      category: 'Other',
      source: 'manual',
      created_by: user.id,
    })
    .select(labResultColumns)
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
  return getLabById(newResult.id);
}
