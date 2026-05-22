import type { Inserts, Tables, Updates } from '@/types/supabase';
import type { Schedule, ScheduleCreateInput, ScheduleUpdateInput } from '@/domain/schedule';
import { fromDateOnly, toDateOnly } from './date';

export function fromScheduleRow(row: Tables<'schedules'>): Schedule {
  return {
    id: row.id,
    patientId: row.patient_id,
    title: row.title,
    scheduledDate: fromDateOnly(row.scheduled_date),
    scheduledTime: row.scheduled_time ?? undefined,
    category: row.category,
    isCompleted: row.is_completed,
    notes: row.notes ?? undefined,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toScheduleInsert(input: ScheduleCreateInput): Inserts<'schedules'> {
  return {
    patient_id: input.patientId,
    title: input.title,
    scheduled_date: toDateOnly(input.scheduledDate),
    scheduled_time: input.scheduledTime ?? null,
    category: input.category,
    is_completed: input.isCompleted,
    notes: input.notes ?? null,
    created_by: input.createdBy,
  };
}

export function toScheduleUpdate(input: ScheduleUpdateInput): Updates<'schedules'> {
  return {
    title: input.title,
    scheduled_date: input.scheduledDate ? toDateOnly(input.scheduledDate) : undefined,
    scheduled_time: input.scheduledTime,
    category: input.category,
    is_completed: input.isCompleted,
    notes: input.notes,
  };
}

