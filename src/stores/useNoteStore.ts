import { create } from 'zustand';
import type { Note } from '@/types/note';
import { parseLocalDate } from '@/utils/dateUtils';
import { useAuthStore } from './useAuthStore';
import {
  createNote,
  listNotesByPatient,
  softDeleteNote,
  updateNote as updateNoteRow,
} from '@/data/notes.repository';
import { fromDomainNote } from '@/mappers/clinicalView.mapper';
import { formatUserFacingError } from '@/lib/errorMessages';
import { mergeEntityListByUpdateStamp, removeById, replaceById, upsertById } from './storeUtils';

// Extended type for adding/updating notes (accepts string dates from forms)
type NoteInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'alertDate'> & {
  date?: string;
  alertDate?: string;
};

type NoteUpdateInput = Partial<Omit<Note, 'alertDate'>> & {
  date?: string;
  alertDate?: string;
};

interface NoteStore {
  notes: Note[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchNotesByPatient: (patientId: string) => Promise<void>;
  addNote: (note: NoteInput) => Promise<string>;
  updateNote: (id: string, updates: NoteUpdateInput) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const useNoteStore = create<NoteStore>((set) => ({
  notes: [],
  isLoading: false,
  error: null,

  fetchNotesByPatient: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const notes = (await listNotesByPatient(patientId)).map(fromDomainNote);
      set((state) => ({
        notes: mergeEntityListByUpdateStamp(state.notes, notes),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: formatUserFacingError(error, '메모를 불러오지 못했습니다.'),
        isLoading: false,
      });
    }
  },

  addNote: async (noteData) => {
    try {
      const { currentUser } = useAuthStore.getState();
      if (!currentUser) throw new Error('로그인이 필요합니다.');

      const createdAt = noteData.date ? parseLocalDate(noteData.date) : new Date();
      const alertDate = noteData.alertDate ? parseLocalDate(noteData.alertDate) : undefined;
      const note = await createNote({
        patientId: noteData.patientId,
        content: noteData.content,
        type: noteData.type,
        alertDate,
        createdBy: currentUser.id,
      });
      const viewNote = { ...fromDomainNote(note), createdAt };
      set((state) => ({ notes: upsertById(state.notes, viewNote) }));
      return viewNote.id;
    } catch (error) {
      set({
        error: formatUserFacingError(error, '메모를 추가하지 못했습니다.'),
      });
      throw error;
    }
  },

  updateNote: async (id, updates) => {
    try {
      const note = await updateNoteRow(id, {
        content: updates.content,
        type: updates.type,
        alertDate: updates.alertDate ? parseLocalDate(updates.alertDate) : undefined,
      });
      set((state) => ({
        notes: replaceById(state.notes, id, fromDomainNote(note)),
      }));
    } catch (error) {
      set({
        error: formatUserFacingError(error, '메모를 수정하지 못했습니다.'),
      });
      throw error;
    }
  },

  deleteNote: async (id) => {
    try {
      await softDeleteNote(id);
      set((state) => ({
        notes: removeById(state.notes, id),
      }));
    } catch (error) {
      set({
        error: formatUserFacingError(error, '메모를 삭제하지 못했습니다.'),
      });
      throw error;
    }
  },
}));
