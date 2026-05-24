import { supabase } from '@/lib/supabase';
import type { Medication, MedicationCreateInput, MedicationUpdateInput } from '@/domain/medication';
import { fromMedicationRow, toMedicationInsert, toMedicationUpdate } from '@/mappers/medication.mapper';
import { chunkArray } from './chunk';

const medicationColumns = `
  id,
  patient_id,
  category,
  drug_name,
  drug_base_name,
  single_dose,
  schedule,
  timing,
  days_remaining,
  dosage,
  frequency,
  start_date,
  end_date,
  is_active,
  notes,
  created_by,
  created_at,
  updated_at,
  deleted_at
`;

export async function listMedicationsByPatient(patientId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select(medicationColumns)
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data.map(fromMedicationRow);
}

export async function listActiveAntibiotics(): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select(medicationColumns)
    .eq('category', 'antibiotic')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data.map(fromMedicationRow);
}

export async function listActiveAntibioticsByPatientIds(patientIds: string[]): Promise<Medication[]> {
  if (patientIds.length === 0) return [];

  const chunkQueries = chunkArray(patientIds, 100).map(async (chunk) => {
    const { data, error } = await supabase
      .from('medications')
      .select(medicationColumns)
      .in('patient_id', chunk)
      .eq('category', 'antibiotic')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data.map(fromMedicationRow);
  });

  const rows = (await Promise.all(chunkQueries)).flat();
  return rows.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

export async function createMedication(input: MedicationCreateInput): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .insert(toMedicationInsert(input))
    .select(medicationColumns)
    .single();

  if (error) throw error;
  return fromMedicationRow(data);
}

export async function createMedications(inputs: MedicationCreateInput[]): Promise<Medication[]> {
  if (inputs.length === 0) return [];

  const { data, error } = await supabase
    .from('medications')
    .insert(inputs.map(toMedicationInsert))
    .select(medicationColumns);

  if (error) throw error;
  return data.map(fromMedicationRow);
}

export async function updateMedication(id: string, input: MedicationUpdateInput): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update(toMedicationUpdate(input))
    .eq('id', id)
    .select(medicationColumns)
    .single();

  if (error) throw error;
  return fromMedicationRow(data);
}

export async function softDeleteMedication(id: string): Promise<void> {
  const { error } = await supabase
    .from('medications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

