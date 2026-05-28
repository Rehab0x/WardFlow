import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parseLabXls, type ParsedLabItem } from '../parser/labParser.js';
import type { Database } from '../../types/supabase';

declare const process: { env: Record<string, string | undefined> };

const BUCKET = 'lab-inbox';

type PatientRow = Pick<
  Database['public']['Tables']['patients']['Row'],
  'id' | 'registration_number' | 'name' | 'created_by' | 'room_bed' | 'patient_type' | 'status'
>;

type LabResultRow = Pick<Database['public']['Tables']['lab_results']['Row'], 'id'>;

export interface ApiFileImportDetail {
  fileName: string;
  fullPath: string;
  savedPatients?: number;
  savedItems?: number;
  failedPatients?: number;
  unmatchedPatients?: Array<{
    registrationNumber?: string;
    patientName?: string;
    orderDate?: string;
    itemCount: number;
  }>;
  errors?: Array<{ patientId?: string; name?: string; error: string }>;
  deleted?: boolean;
  deleteError?: string;
  error?: string;
}

export interface ApiStorageImportSummary {
  syncKey: string;
  deleteAfterProcessing: boolean;
  totalFiles: number;
  successCount: number;
  failedCount: number;
  unmatchedCount: number;
  savedPatients: number;
  savedItems: number;
  failedPatients: number;
  errors: Array<{ fileName: string; patientId?: string; name?: string; error: string }>;
  deletedFiles: number;
  deleteErrors: Array<{ fileName: string; error: string }>;
  details: ApiFileImportDetail[];
}

export interface ProcessStorageInboxInput {
  syncKey: string;
  deleteAfterProcessing?: boolean;
}

export async function processStorageInboxFromApi(
  input: ProcessStorageInboxInput
): Promise<ApiStorageImportSummary> {
  const syncKey = normalizeSyncKey(input.syncKey);
  const deleteAfterProcessing = Boolean(input.deleteAfterProcessing);
  const supabase = createServiceClient();
  const files = await listXlsFiles(supabase, syncKey);

  const details: ApiFileImportDetail[] = [];
  let successCount = 0;
  let failedCount = 0;
  let unmatchedCount = 0;
  let savedPatients = 0;
  let savedItems = 0;
  let failedPatients = 0;
  const errors: ApiStorageImportSummary['errors'] = [];
  let deletedFiles = 0;
  const deleteErrors: ApiStorageImportSummary['deleteErrors'] = [];

  for (const file of files) {
    const detail: ApiFileImportDetail = {
      fileName: file.name,
      fullPath: file.fullPath,
    };

    try {
      const fileResult = await processStorageFile(supabase, file.fullPath);
      Object.assign(detail, fileResult);

      successCount++;
      savedPatients += fileResult.savedPatients;
      savedItems += fileResult.savedItems;
      failedPatients += fileResult.failedPatients;
      unmatchedCount += fileResult.unmatchedPatients.length;
      errors.push(
        ...fileResult.errors.map((error) => ({
          fileName: file.name,
          ...error,
        }))
      );

      if (deleteAfterProcessing) {
        const { error } = await supabase.storage.from(BUCKET).remove([file.fullPath]);
        if (error) {
          detail.deleteError = error.message;
          deleteErrors.push({ fileName: file.name, error: error.message });
        } else {
          detail.deleted = true;
          deletedFiles++;
        }
      }
    } catch (error) {
      failedCount++;
      detail.error = error instanceof Error ? error.message : String(error);
      errors.push({ fileName: file.name, error: detail.error });
    }

    details.push(detail);
  }

  return {
    syncKey,
    deleteAfterProcessing,
    totalFiles: files.length,
    successCount,
    failedCount,
    unmatchedCount,
    savedPatients,
    savedItems,
    failedPatients,
    errors,
    deletedFiles,
    deleteErrors,
    details,
  };
}

function createServiceClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL.');
  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeSyncKey(syncKey: string) {
  const normalized = syncKey.trim().replace(/^\/+|\/+$/g, '');
  if (!normalized) throw new Error('syncKey is required.');
  if (!/^[A-Za-z0-9._-]+$/.test(normalized)) {
    throw new Error('syncKey may only contain letters, numbers, dots, underscores, and hyphens.');
  }
  return normalized;
}

async function listXlsFiles(supabase: SupabaseClient<Database>, syncKey: string) {
  const { data, error } = await supabase.storage.from(BUCKET).list(syncKey);
  if (error) throw new Error(`Storage list failed: ${error.message}`);

  return (data ?? [])
    .filter((file) => file.name && /\.xlsx?$/i.test(file.name))
    .map((file) => ({
      name: file.name,
      fullPath: `${syncKey}/${file.name}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR', { numeric: true }));
}

async function processStorageFile(supabase: SupabaseClient<Database>, fullPath: string) {
  const { data, error } = await supabase.storage.from(BUCKET).download(fullPath);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? 'No data'}`);

  const groups = await parseLabXls(await data.arrayBuffer());
  const patients = await listActivePatientsByRegistration(supabase);

  let savedPatients = 0;
  let savedItems = 0;
  const errors: NonNullable<ApiFileImportDetail['errors']> = [];
  const unmatchedPatients: NonNullable<ApiFileImportDetail['unmatchedPatients']> = [];

  for (const group of groups) {
    const registrationNumber = group.registrationNumber?.trim();
    const patient = registrationNumber
      ? patients.get(registrationNumber) ?? patients.get(registrationNumber.replace(/^0+/, ''))
      : undefined;

    if (!patient) {
      unmatchedPatients.push({
        registrationNumber,
        patientName: group.patientName,
        orderDate: group.orderDate,
        itemCount: group.items.length,
      });
      continue;
    }

    try {
      const testDate = group.orderDate ?? toDateOnly(new Date());
      await savePatientLabGroups(supabase, patient, testDate, group.items);
      savedPatients++;
      savedItems += group.items.length;
    } catch (error) {
      errors.push({
        patientId: patient.id,
        name: patient.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    savedPatients,
    savedItems,
    failedPatients: errors.length,
    unmatchedPatients,
    errors,
  };
}

async function listActivePatientsByRegistration(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('patients')
    .select('id, registration_number, name, created_by, room_bed, patient_type, status')
    .eq('status', 'active');

  if (error) throw new Error(`Patient lookup failed: ${error.message}`);

  const patients = new Map<string, PatientRow>();
  for (const patient of (data ?? []) as PatientRow[]) {
    const raw = patient.registration_number?.trim();
    if (!raw) continue;
    patients.set(raw, patient);
    patients.set(raw.replace(/^0+/, ''), patient);
  }
  return patients;
}

async function savePatientLabGroups(
  supabase: SupabaseClient<Database>,
  patient: PatientRow,
  testDate: string,
  items: ParsedLabItem[]
) {
  const grouped = groupByCategory(items);

  for (const [category, categoryItems] of grouped.entries()) {
    const { data: existing, error: listError } = await supabase
      .from('lab_results')
      .select('id')
      .eq('patient_id', patient.id)
      .eq('test_date', testDate)
      .eq('category', category)
      .is('deleted_at', null);

    if (listError) throw new Error(`Existing lab lookup failed: ${listError.message}`);

    const existingIds = ((existing ?? []) as LabResultRow[]).map((row) => row.id);
    if (existingIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('lab_results')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', existingIds);
      if (deleteError) throw new Error(`Existing lab replacement failed: ${deleteError.message}`);
    }

    const { data: labResult, error: resultError } = await supabase
      .from('lab_results')
      .insert({
        patient_id: patient.id,
        test_date: testDate,
        category,
        source: 'xls',
        created_by: patient.created_by,
      })
      .select('id')
      .single();

    if (resultError) throw new Error(`Lab result insert failed: ${resultError.message}`);

    const labItems = categoryItems.map((item, index) => {
      const valueText = item.value.trim();
      const valueNumeric = parseNumericValue(valueText);
      return {
        lab_result_id: labResult.id,
        code: item.code || null,
        name: item.name,
        value_text: valueText,
        value_numeric: valueNumeric,
        unit: item.unit,
        reference_min: item.referenceMin ?? null,
        reference_max: item.referenceMax ?? null,
        is_abnormal: item.flag !== '',
        hl_flag: item.flag || null,
        display_order: index,
      };
    });

    if (labItems.length === 0) continue;

    const { error: itemError } = await supabase.from('lab_items').insert(labItems);
    if (itemError) throw new Error(`Lab item insert failed: ${itemError.message}`);
  }
}

function groupByCategory(items: ParsedLabItem[]) {
  const map = new Map<string, ParsedLabItem[]>();
  for (const item of items) {
    const category = item.category || 'Other';
    map.set(category, [...(map.get(category) ?? []), item]);
  }
  return map;
}

function parseNumericValue(value: string) {
  if (!/^-?\d+(\.\d+)?$/.test(value)) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toDateOnly(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate()
  ).padStart(2, '0')}`;
}
