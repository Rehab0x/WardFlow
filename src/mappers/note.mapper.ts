import type { Inserts, Tables, Updates } from '@/types/supabase';
import type { Note, NoteCreateInput, NoteUpdateInput } from '@/domain/note';
import { fromNullableDateOnly, toNullableDateOnly } from './date';

export function fromNoteRow(row: Tables<'notes'>): Note {
  return {
    id: row.id,
    patientId: row.patient_id,
    content: row.content,
    type: row.type,
    alertDate: fromNullableDateOnly(row.alert_date),
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toNoteInsert(input: NoteCreateInput): Inserts<'notes'> {
  return {
    patient_id: input.patientId,
    content: input.content,
    type: input.type,
    alert_date: toNullableDateOnly(input.alertDate),
    created_by: input.createdBy,
  };
}

export function toNoteUpdate(input: NoteUpdateInput): Updates<'notes'> {
  return {
    content: input.content,
    type: input.type,
    alert_date: input.alertDate === undefined ? undefined : toNullableDateOnly(input.alertDate),
  };
}

