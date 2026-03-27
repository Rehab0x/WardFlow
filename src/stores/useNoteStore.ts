import { create } from 'zustand';
import { db } from '@/db/database';
import type { Note } from '@/db/database';
import { parseLocalDate } from '@/utils/dateUtils';
import { refreshSidebarFlags } from '@/hooks/useSidebarFlags';

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
      const notes = await db.notes
        .where('patientId')
        .equals(patientId)
        .reverse() // Most recent first
        .sortBy('createdAt');

      set({ notes, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch notes',
        isLoading: false,
      });
    }
  },

  addNote: async (noteData) => {
    try {
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
        notes: [note, ...state.notes], // Add to beginning (most recent first)
      }));
      refreshSidebarFlags();

      return id;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add note',
      });
      throw error;
    }
  },

  updateNote: async (id, updates) => {
    try {
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
        error: error instanceof Error ? error.message : 'Failed to update note',
      });
      throw error;
    }
  },

  deleteNote: async (id) => {
    try {
      await db.notes.delete(id);

      // Update local state
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      }));
      refreshSidebarFlags();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete note',
      });
      throw error;
    }
  },
}));
