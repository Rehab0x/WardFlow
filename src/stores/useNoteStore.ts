import { create } from 'zustand';
import { db } from '@/db/database';
import type { Note } from '@/db/database';
import { parseLocalDate } from '@/utils/dateUtils';
import { refreshSidebarFlags } from '@/hooks/useSidebarFlags';
import { useSupabaseBackend } from '@/config/backend';
import { useAuthStore } from './useAuthStore';
import {
  createNote as createSupabaseNote,
  listNotesByPatient as listSupabaseNotesByPatient,
  softDeleteNote as softDeleteSupabaseNote,
  updateNote as updateSupabaseNote,
} from '@/data/notes.repository';
import { fromDomainNote } from '@/mappers/legacyClinical.mapper';
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
      if (useSupabaseBackend) {
        const notes = (await listSupabaseNotesByPatient(patientId)).map(fromDomainNote);
        set((state) => ({
          notes: mergeEntityListByUpdateStamp(state.notes, notes),
          isLoading: false,
        }));
        return;
      }

      const notes = await db.notes
        .where('patientId')
        .equals(patientId)
        .reverse() // Most recent first
        .sortBy('createdAt');

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
      if (useSupabaseBackend) {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) throw new Error('로그인이 필요합니다.');

        const now = new Date();
        const createdAt = noteData.date ? parseLocalDate(noteData.date) : now;
        const alertDate = noteData.alertDate ? parseLocalDate(noteData.alertDate) : undefined;
        const note = await createSupabaseNote({
          patientId: noteData.patientId,
          content: noteData.content,
          type: noteData.type,
          alertDate,
          createdBy: currentUser.id,
        });
        const legacyNote = { ...fromDomainNote(note), createdAt };
        set((state) => ({ notes: upsertById(state.notes, legacyNote) }));
        refreshSidebarFlags();
        return legacyNote.id;
      }

      const now = new Date();
      const id = crypto.randomUUID();

      // Use provided date for createdAt if available, otherwise use current time
      const createdAt = (noteData as any).date
        ? parseLocalDate((noteData as any).date)
        : now;

      // Use provided alertDate if available
      const alertDate = (noteData as any).alertDate
        ? parseLocalDate((noteData as any).alertDate)
        : undefined;

      const { date, ...restNoteData } = noteData as any;

      const note: Note = {
        ...restNoteData,
        id,
        createdAt,
        updatedAt: now,
        alertDate,
      };

      await db.notes.add(note);

      // Update local state
      set((state) => ({
        notes: upsertById(state.notes, note), // Add to beginning (most recent first)
      }));
      refreshSidebarFlags();

      return id;
    } catch (error) {
      set({
        error: formatUserFacingError(error, '메모를 추가하지 못했습니다.'),
      });
      throw error;
    }
  },

  updateNote: async (id, updates) => {
    try {
      if (useSupabaseBackend) {
        const note = await updateSupabaseNote(id, {
          content: updates.content,
          type: updates.type,
          alertDate: updates.alertDate ? parseLocalDate(updates.alertDate) : undefined,
        });
        const legacyNote = fromDomainNote(note);
        set((state) => ({
          notes: replaceById(state.notes, id, legacyNote),
        }));
        refreshSidebarFlags();
        return;
      }

      const now = new Date();

      // If date is provided in updates, update createdAt as well
      // If alertDate is provided, update it as well
      const { date, alertDate: alertDateStr, ...restUpdates } = updates as any;
      const updatedData: any = {
        ...restUpdates,
        updatedAt: now,
      };

      if (date) {
        updatedData.createdAt = parseLocalDate(date);
      }

      if (alertDateStr !== undefined) {
        updatedData.alertDate = alertDateStr ? parseLocalDate(alertDateStr) : undefined;
      }

      await db.notes.update(id, updatedData);

      // Update local state
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, ...updatedData } : n)),
      }));
      refreshSidebarFlags();
    } catch (error) {
      set({
        error: formatUserFacingError(error, '메모를 수정하지 못했습니다.'),
      });
      throw error;
    }
  },

  deleteNote: async (id) => {
    try {
      if (useSupabaseBackend) {
        await softDeleteSupabaseNote(id);
        set((state) => ({
          notes: removeById(state.notes, id),
        }));
        refreshSidebarFlags();
        return;
      }

      await db.notes.delete(id);

      // Update local state
      set((state) => ({
        notes: removeById(state.notes, id),
      }));
      refreshSidebarFlags();
    } catch (error) {
      set({
        error: formatUserFacingError(error, '메모를 삭제하지 못했습니다.'),
      });
      throw error;
    }
  },
}));
