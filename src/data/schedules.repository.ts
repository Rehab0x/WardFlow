import { supabase } from '@/lib/supabase';
import type { Schedule, ScheduleCreateInput, ScheduleUpdateInput } from '@/domain/schedule';
import { fromScheduleRow, toScheduleInsert, toScheduleUpdate } from '@/mappers/schedule.mapper';
import { toDateOnly } from '@/mappers/date';
import { chunkArray } from './chunk';

const scheduleColumns = `
  id,
  patient_id,
  title,
  scheduled_date,
  scheduled_time,
  category,
  is_completed,
  notes,
  created_by,
  created_at,
  updated_at,
  deleted_at
`;

export async function listSchedulesByPatient(patientId: string): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select(scheduleColumns)
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return data.map(fromScheduleRow);
}

export async function listSchedulesByDate(date: Date): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select(scheduleColumns)
    .eq('scheduled_date', toDateOnly(date))
    .is('deleted_at', null)
    .order('scheduled_time', { ascending: true });

  if (error) throw error;
  return data.map(fromScheduleRow);
}

export async function listSchedulesByPatientIdsAndDate(
  patientIds: string[],
  date: Date
): Promise<Schedule[]> {
  if (patientIds.length === 0) return [];

  const chunkQueries = chunkArray(patientIds, 100).map(async (chunk) => {
    const { data, error } = await supabase
      .from('schedules')
      .select(scheduleColumns)
      .in('patient_id', chunk)
      .eq('scheduled_date', toDateOnly(date))
      .is('deleted_at', null)
      .order('scheduled_time', { ascending: true });

    if (error) throw error;
    return data.map(fromScheduleRow);
  });

  const rows = (await Promise.all(chunkQueries)).flat();
  return rows.sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
}

export async function createSchedule(input: ScheduleCreateInput): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .insert(toScheduleInsert(input))
    .select(scheduleColumns)
    .single();

  if (error) throw error;
  return fromScheduleRow(data);
}

export async function updateSchedule(id: string, input: ScheduleUpdateInput): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .update(toScheduleUpdate(input))
    .eq('id', id)
    .select(scheduleColumns)
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

