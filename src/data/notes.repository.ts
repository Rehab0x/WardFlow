import { supabase } from '@/lib/supabase';
import type { Note, NoteCreateInput, NoteUpdateInput } from '@/domain/note';
import { fromNoteRow, toNoteInsert, toNoteUpdate } from '@/mappers/note.mapper';
import { chunkArray } from './chunk';

const noteColumns = `
  id,
  patient_id,
  content,
  type,
  alert_date,
  created_by,
  created_at,
  updated_at,
  deleted_at
`;

export async function listNotesByPatient(patientId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select(noteColumns)
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(fromNoteRow);
}

export async function listReminderNotesByAlertDate(date: Date): Promise<Note[]> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;

  const { data, error } = await supabase
    .from('notes')
    .select(noteColumns)
    .eq('type', 'reminder')
    .eq('alert_date', dateKey)
    .is('deleted_at', null);

  if (error) throw error;
  return data.map(fromNoteRow);
}

export async function listReminderNotesByPatientIdsAndAlertDate(
  patientIds: string[],
  date: Date
): Promise<Note[]> {
  if (patientIds.length === 0) return [];

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;
  const chunkQueries = chunkArray(patientIds, 100).map(async (chunk) => {
    const { data, error } = await supabase
      .from('notes')
      .select(noteColumns)
      .in('patient_id', chunk)
      .eq('type', 'reminder')
      .eq('alert_date', dateKey)
      .is('deleted_at', null);

    if (error) throw error;
    return data.map(fromNoteRow);
  });

  return (await Promise.all(chunkQueries)).flat();
}

export async function listProgressNotesCreatedBetween(start: Date, end: Date): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select(noteColumns)
    .eq('type', 'progress')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(fromNoteRow);
}

export async function listProgressNotesByPatientIdsCreatedBetween(
  patientIds: string[],
  start: Date,
  end: Date
): Promise<Note[]> {
  if (patientIds.length === 0) return [];

  const chunkQueries = chunkArray(patientIds, 100).map(async (chunk) => {
    const { data, error } = await supabase
      .from('notes')
      .select(noteColumns)
      .in('patient_id', chunk)
      .eq('type', 'progress')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(fromNoteRow);
  });

  const rows = (await Promise.all(chunkQueries)).flat();
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createNote(input: NoteCreateInput): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert(toNoteInsert(input))
    .select(noteColumns)
    .single();

  if (error) throw error;
  return fromNoteRow(data);
}

export async function updateNote(id: string, input: NoteUpdateInput): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update(toNoteUpdate(input))
    .eq('id', id)
    .select(noteColumns)
    .single();

  if (error) throw error;
  return fromNoteRow(data);
}

export async function softDeleteNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
