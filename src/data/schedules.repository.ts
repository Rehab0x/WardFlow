import { supabase } from '@/lib/supabase';
import type { Schedule, ScheduleCreateInput, ScheduleUpdateInput } from '@/domain/schedule';
import { fromScheduleRow, toScheduleInsert, toScheduleUpdate } from '@/mappers/schedule.mapper';
import { toDateOnly } from '@/mappers/date';

export async function listSchedulesByPatient(patientId: string): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return data.map(fromScheduleRow);
}

export async function listSchedulesByDate(date: Date): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('scheduled_date', toDateOnly(date))
    .is('deleted_at', null)
    .order('scheduled_time', { ascending: true });

  if (error) throw error;
  return data.map(fromScheduleRow);
}

export async function createSchedule(input: ScheduleCreateInput): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .insert(toScheduleInsert(input))
    .select('*')
    .single();

  if (error) throw error;
  return fromScheduleRow(data);
}

export async function updateSchedule(id: string, input: ScheduleUpdateInput): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .update(toScheduleUpdate(input))
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return fromScheduleRow(data);
}

export async function softDeleteSchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from('schedules')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

