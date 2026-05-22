import { supabase } from '@/lib/supabase';
import type { Patient, PatientCreateInput, PatientUpdateInput } from '@/domain/patient';
import { fromPatientRow, toPatientInsert, toPatientUpdate } from '@/mappers/patient.mapper';

export async function listPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .is('deleted_at', null)
    .order('status', { ascending: true })
    .order('room_bed', { ascending: true });

  if (error) throw error;
  return data.map(fromPatientRow);
}

export async function getPatient(id: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data ? fromPatientRow(data) : null;
}

export async function createPatient(input: PatientCreateInput): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .insert(toPatientInsert(input))
    .select('*')
    .single();

  if (error) throw error;
  return fromPatientRow(data);
}

export async function updatePatient(id: string, input: PatientUpdateInput): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update(toPatientUpdate(input))
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return fromPatientRow(data);
}

export async function archivePatient(id: string): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .update({ status: 'archived', deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

