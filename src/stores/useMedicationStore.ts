import { create } from 'zustand';
import { db } from '@/db/database';
import type { Medication } from '@/db/database';
import { refreshSidebarFlags } from '@/hooks/useSidebarFlags';

interface MedicationStore {
  medications: Medication[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMedicationsByPatient: (patientId: string) => Promise<void>;
  addMedication: (medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateMedication: (id: string, updates: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  toggleMedicationActive: (id: string) => Promise<void>;
}

export const useMedicationStore = create<MedicationStore>((set, get) => ({
  medications: [],
  isLoading: false,
  error: null,

  fetchMedicationsByPatient: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const medications = await db.medications
        .where('patientId')
        .equals(patientId)
        .reverse() // Most recent first
        .sortBy('startDate');

      // Auto-deactivate antibiotics whose endDate has passed
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const toDeactivate = medications.filter(
        (m) => m.isActive && m.endDate && new Date(m.endDate) < today
      );
      if (toDeactivate.length > 0) {
        await db.transaction('rw', db.medications, async () => {
          for (const m of toDeactivate) {
            await db.medications.update(m.id, { isActive: false, updatedAt: new Date() });
            m.isActive = false;
          }
        });
      }

      set({ medications: medications.reverse(), isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch medications',
        isLoading: false,
      });
    }
  },

  addMedication: async (medication) => {
    try {
      const id = `med${Date.now()}`;
      const now = new Date();

      const newMedication: Medication = {
        id,
        ...medication,
        createdAt: now,
        updatedAt: now,
      };

      await db.medications.add(newMedication);

      // Update local state
      set((state) => ({
        medications: [newMedication, ...state.medications],
      }));
      refreshSidebarFlags();

      return id;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add medication',
      });
      throw error;
    }
  },

  updateMedication: async (id: string, updates: Partial<Medication>) => {
    try {
      await db.medications.update(id, {
        ...updates,
        updatedAt: new Date(),
      });

      // Update local state
      set((state) => ({
        medications: state.medications.map((med) =>
          med.id === id
            ? { ...med, ...updates, updatedAt: new Date() }
            : med
        ),
      }));
      refreshSidebarFlags();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update medication',
      });
      throw error;
    }
  },

  deleteMedication: async (id: string) => {
    try {
      await db.medications.delete(id);

      // Update local state
      set((state) => ({
        medications: state.medications.filter((med) => med.id !== id),
      }));
      refreshSidebarFlags();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete medication',
      });
      throw error;
    }
  },

  toggleMedicationActive: async (id: string) => {
    try {
      const medication = get().medications.find((med) => med.id === id);
      if (!medication) {
        throw new Error('Medication not found');
      }

      await db.medications.update(id, {
        isActive: !medication.isActive,
        updatedAt: new Date(),
      });

      // Update local state
      set((state) => ({
        medications: state.medications.map((med) =>
          med.id === id
            ? { ...med, isActive: !med.isActive, updatedAt: new Date() }
            : med
        ),
      }));
      refreshSidebarFlags();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to toggle medication status',
      });
      throw error;
    }
  },
}));
