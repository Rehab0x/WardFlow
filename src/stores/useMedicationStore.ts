import { create } from 'zustand';
import { db } from '@/db/database';
import type { Medication } from '@/db/database';
import { refreshSidebarFlags } from '@/hooks/useSidebarFlags';
import { useSupabaseBackend } from '@/config/backend';
import { useAuthStore } from './useAuthStore';
import {
  createMedication as createSupabaseMedication,
  createMedications as createSupabaseMedications,
  listMedicationsByPatient as listSupabaseMedicationsByPatient,
  softDeleteMedication as softDeleteSupabaseMedication,
  updateMedication as updateSupabaseMedication,
} from '@/data/medications.repository';
import {
  fromDomainMedication,
  toDomainMedicationCreateInput,
} from '@/mappers/legacyClinical.mapper';

interface MedicationStore {
  medications: Medication[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMedicationsByPatient: (patientId: string) => Promise<void>;
  addMedication: (medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  bulkAddMedications: (medications: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
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
      if (useSupabaseBackend) {
        const medications = await listSupabaseMedicationsByPatient(patientId);
        set({ medications: medications.map(fromDomainMedication), isLoading: false });
        return;
      }

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
      if (useSupabaseBackend) {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) throw new Error('User not authenticated');
        const saved = await createSupabaseMedication(
          toDomainMedicationCreateInput(medication, currentUser.id)
        );
        const legacyMedication = fromDomainMedication(saved);
        set((state) => ({
          medications: [legacyMedication, ...state.medications],
        }));
        refreshSidebarFlags();
        return legacyMedication.id;
      }

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

  bulkAddMedications: async (medications) => {
    try {
      if (useSupabaseBackend) {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) throw new Error('User not authenticated');
        const saved = await createSupabaseMedications(
          medications.map((medication) => toDomainMedicationCreateInput(medication, currentUser.id))
        );
        const legacyMedications = saved.map(fromDomainMedication);
        set((state) => ({
          medications: [...legacyMedications, ...state.medications],
        }));
        refreshSidebarFlags();
        return;
      }

      const now = new Date();
      const newMedications: Medication[] = medications.map((med, i) => ({
        id: `med${Date.now()}_${i}`,
        ...med,
        createdAt: now,
        updatedAt: now,
      }));

      // Single transaction for all inserts
      await db.transaction('rw', db.medications, async () => {
        await db.medications.bulkAdd(newMedications);
      });

      // Single state update
      set((state) => ({
        medications: [...newMedications, ...state.medications],
      }));

      // Single sidebar refresh
      refreshSidebarFlags();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add medications',
      });
      throw error;
    }
  },

  updateMedication: async (id: string, updates: Partial<Medication>) => {
    try {
      if (useSupabaseBackend) {
        const saved = await updateSupabaseMedication(id, {
          category: updates.category,
          drugName: updates.drugName,
          drugBaseName: updates.drugBaseName,
          singleDose: updates.singleDose,
          schedule: updates.schedule,
          timing: updates.timing,
          daysRemaining: updates.daysRemaining,
          dosage: updates.dosage,
          frequency: updates.frequency,
          startDate: updates.startDate,
          endDate: updates.endDate,
          isActive: updates.isActive,
          notes: updates.notes,
        });
        const legacyMedication = fromDomainMedication(saved);
        set((state) => ({
          medications: state.medications.map((med) =>
            med.id === id ? legacyMedication : med
          ),
        }));
        refreshSidebarFlags();
        return;
      }

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
      if (useSupabaseBackend) {
        await softDeleteSupabaseMedication(id);
        set((state) => ({
          medications: state.medications.filter((med) => med.id !== id),
        }));
        refreshSidebarFlags();
        return;
      }

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

      if (useSupabaseBackend) {
        const saved = await updateSupabaseMedication(id, { isActive: !medication.isActive });
        const legacyMedication = fromDomainMedication(saved);
        set((state) => ({
          medications: state.medications.map((med) =>
            med.id === id ? legacyMedication : med
          ),
        }));
        refreshSidebarFlags();
        return;
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
