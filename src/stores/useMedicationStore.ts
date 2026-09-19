import { create } from 'zustand';
import type { Medication } from '@/types/medication';
import { useAuthStore } from './useAuthStore';
import {
  createMedication,
  createMedications,
  listMedicationsByPatient,
  softDeleteMedication,
  updateMedication as updateMedicationRow,
} from '@/data/medications.repository';
import { fromDomainMedication, toDomainMedicationCreateInput } from '@/mappers/clinicalView.mapper';
import { formatUserFacingError } from '@/lib/errorMessages';
import { mergeEntityListByUpdateStamp, removeById, replaceById, upsertById } from './storeUtils';

interface MedicationStore {
  medications: Medication[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMedicationsByPatient: (patientId: string) => Promise<void>;
  addMedication: (medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  bulkAddMedications: (
    medications: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>[]
  ) => Promise<void>;
  updateMedication: (id: string, updates: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  toggleMedicationActive: (id: string) => Promise<void>;
}

function requireCurrentUserId(): string {
  const { currentUser } = useAuthStore.getState();
  if (!currentUser) throw new Error('로그인이 필요합니다.');
  return currentUser.id;
}

export const useMedicationStore = create<MedicationStore>((set, get) => ({
  medications: [],
  isLoading: false,
  error: null,

  fetchMedicationsByPatient: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const medications = (await listMedicationsByPatient(patientId)).map(fromDomainMedication);
      set((state) => ({
        medications: mergeEntityListByUpdateStamp(state.medications, medications),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: formatUserFacingError(error, '약제를 불러오지 못했습니다.'),
        isLoading: false,
      });
    }
  },

  addMedication: async (medication) => {
    try {
      const saved = await createMedication(
        toDomainMedicationCreateInput(medication, requireCurrentUserId())
      );
      const viewMedication = fromDomainMedication(saved);
      set((state) => ({
        medications: upsertById(state.medications, viewMedication),
      }));
      return viewMedication.id;
    } catch (error) {
      set({
        error: formatUserFacingError(error, '약제를 추가하지 못했습니다.'),
      });
      throw error;
    }
  },

  bulkAddMedications: async (medications) => {
    try {
      const createdBy = requireCurrentUserId();
      const saved = await createMedications(
        medications.map((medication) => toDomainMedicationCreateInput(medication, createdBy))
      );
      const viewMedications = saved.map(fromDomainMedication);
      set((state) => ({
        medications: viewMedications.reduce(
          (items, medication) => upsertById(items, medication),
          state.medications
        ),
      }));
    } catch (error) {
      set({
        error: formatUserFacingError(error, '약제를 추가하지 못했습니다.'),
      });
      throw error;
    }
  },

  updateMedication: async (id: string, updates: Partial<Medication>) => {
    try {
      const saved = await updateMedicationRow(id, {
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
      set((state) => ({
        medications: replaceById(state.medications, id, fromDomainMedication(saved)),
      }));
    } catch (error) {
      set({
        error: formatUserFacingError(error, '약제를 수정하지 못했습니다.'),
      });
      throw error;
    }
  },

  deleteMedication: async (id: string) => {
    try {
      await softDeleteMedication(id);
      set((state) => ({
        medications: removeById(state.medications, id),
      }));
    } catch (error) {
      set({
        error: formatUserFacingError(error, '약제를 삭제하지 못했습니다.'),
      });
      throw error;
    }
  },

  toggleMedicationActive: async (id: string) => {
    try {
      const medication = get().medications.find((med) => med.id === id);
      if (!medication) {
        throw new Error('약제를 찾을 수 없습니다.');
      }

      const saved = await updateMedicationRow(id, { isActive: !medication.isActive });
      set((state) => ({
        medications: replaceById(state.medications, id, fromDomainMedication(saved)),
      }));
    } catch (error) {
      set({
        error: formatUserFacingError(error, '약제 상태를 변경하지 못했습니다.'),
      });
      throw error;
    }
  },
}));
