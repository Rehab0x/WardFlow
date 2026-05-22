import { supabase } from '@/lib/supabase';
import type { Medication, MedicationCreateInput, MedicationUpdateInput } from '@/domain/medication';
import { fromMedicationRow, toMedicationInsert, toMedicationUpdate } from '@/mappers/medication.mapper';

export async function listMedicationsByPatient(patientId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data.map(fromMedicationRow);
}

export async function listActiveAntibiotics(): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('category', 'antibiotic')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data.map(fromMedicationRow);
}

export async function createMedication(input: MedicationCreateInput): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .insert(toMedicationInsert(input))
    .select('*')
    .single();

  if (error) throw error;
  return fromMedicationRow(data);
}

export async function createMedications(inputs: MedicationCreateInput[]): Promise<Medication[]> {
  if (inputs.length === 0) return [];

  const { data, error } = await supabase
    .from('medications')
    .insert(inputs.map(toMedicationInsert))
    .select('*');

  if (error) throw error;
  return data.map(fromMedicationRow);
}

export async function updateMedication(id: string, input: MedicationUpdateInput): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update(toMedicationUpdate(input))
    .eq('id', id)
    .select('*')
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

