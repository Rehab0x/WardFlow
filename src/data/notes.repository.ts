import { supabase } from '@/lib/supabase';
import type { Note, NoteCreateInput, NoteUpdateInput } from '@/domain/note';
import { fromNoteRow, toNoteInsert, toNoteUpdate } from '@/mappers/note.mapper';

export async function listNotesByPatient(patientId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
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
    .select('*')
    .eq('type', 'reminder')
    .eq('alert_date', dateKey)
    .is('deleted_at', null);

  if (error) throw error;
  return data.map(fromNoteRow);
}

export async function listProgressNotesCreatedBetween(start: Date, end: Date): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('type', 'progress')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(fromNoteRow);
}

export async function createNote(input: NoteCreateInput): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert(toNoteInsert(input))
    .select('*')
    .single();

  if (error) throw error;
  return fromNoteRow(data);
}

export async function updateNote(id: string, input: NoteUpdateInput): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update(toNoteUpdate(input))
    .eq('id', id)
    .select('*')
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
