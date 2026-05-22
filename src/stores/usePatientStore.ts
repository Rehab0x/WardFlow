import { create } from 'zustand';
import { db } from '@/db/database';
import type { Patient } from '@/db/database';
import { useAuthStore } from './useAuthStore';
import { useSupabaseBackend } from '@/config/backend';
import {
  archivePatient as archiveSupabasePatient,
  createPatient as createSupabasePatient,
  listPatients as listSupabasePatients,
  updatePatient as updateSupabasePatient,
} from '@/data/patients.repository';
import {
  fromDomainPatient,
  toDomainPatientCreateInput,
  toDomainPatientUpdateInput,
} from '@/mappers/legacyPatient.mapper';

interface PatientStore {
  patients: Patient[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPatients: () => Promise<void>;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;
  dischargePatient: (id: string, dischargeDate: Date) => Promise<void>;
}

export const usePatientStore = create<PatientStore>((set, get) => ({
  patients: [],
  isLoading: false,
  error: null,

  fetchPatients: async () => {
    set({ isLoading: true, error: null });
    try {
      if (useSupabaseBackend) {
        const patients = await listSupabasePatients();
        set({ patients: patients.map(fromDomainPatient), isLoading: false });
        return;
      }

      const { currentUser } = useAuthStore.getState();

      let patients: Patient[];

      if (!currentUser) {
        // No user logged in - return empty
        set({ patients: [], isLoading: false });
        return;
      }

      if (currentUser.role === 'doctor') {
        // Doctor: Only own patients (createdBy) - both active and discharged
        patients = await db.patients
          .where('createdBy')
          .equals(currentUser.id)
          .toArray();

        // Also get shared patients
        const sharedPatients = await db.patients
          .where('sharedWith')
          .equals(currentUser.id)
          .toArray();

        // Combine and deduplicate
        const patientMap = new Map<string, Patient>();
        [...patients, ...sharedPatients].forEach((p) => patientMap.set(p.id, p));
        patients = Array.from(patientMap.values());
      } else if (currentUser.role === 'therapist') {
        // Therapist: Only shared patients
        patients = await db.patients
          .where('sharedWith')
          .equals(currentUser.id)
          .toArray();
      } else {
        // Admin & Nurse: All patients (active and discharged)
        patients = await db.patients.toArray();
      }

      set({ patients, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch patients',
        isLoading: false,
      });
    }
  },

  addPatient: async (patientData) => {
    try {
      const { currentUser } = useAuthStore.getState();

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (useSupabaseBackend) {
        const patient = await createSupabasePatient(
          toDomainPatientCreateInput({
            ...patientData,
            createdBy: currentUser.id,
            sharedWith: patientData.sharedWith || [],
          })
        );
        const legacyPatient = fromDomainPatient(patient);
        set((state) => ({
          patients: [...state.patients, legacyPatient],
        }));
        return legacyPatient.id;
      }

      const now = new Date();
      const id = `p${Date.now()}`; // Simple ID generation

      const patient: Patient = {
        ...patientData,
        id,
        createdBy: currentUser.id, // Set current user as creator
        sharedWith: patientData.sharedWith || [], // Default to empty array if not provided
        createdAt: now,
        updatedAt: now,
      };

      await db.patients.add(patient);

      // Update local state
      set((state) => ({
        patients: [...state.patients, patient],
      }));

      return id;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add patient',
      });
      throw error;
    }
  },

  updatePatient: async (id, updates) => {
    try {
      if (useSupabaseBackend) {
        const patient = await updateSupabasePatient(id, toDomainPatientUpdateInput(updates));
        const legacyPatient = fromDomainPatient(patient);
        set((state) => ({
          patients: state.patients.map((p) => (p.id === id ? legacyPatient : p)),
        }));
        return;
      }

      const updatedData = {
        ...updates,
        updatedAt: new Date(),
      };

      await db.patients.update(id, updatedData);

      // Update local state
      set((state) => ({
        patients: state.patients.map((p) => (p.id === id ? { ...p, ...updatedData } : p)),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update patient',
      });
      throw error;
    }
  },

  deletePatient: async (id) => {
    try {
      if (useSupabaseBackend) {
        await archiveSupabasePatient(id);
        set((state) => ({
          patients: state.patients.filter((p) => p.id !== id),
        }));
        return;
      }

      await db.patients.delete(id);

      // Update local state
      set((state) => ({
        patients: state.patients.filter((p) => p.id !== id),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete patient',
      });
      throw error;
    }
  },

  getPatientById: (id) => {
    return get().patients.find((p) => p.id === id);
  },

  dischargePatient: async (id, dischargeDate) => {
    try {
      if (useSupabaseBackend) {
        const patient = await updateSupabasePatient(id, {
          status: 'discharged',
          dischargeDate,
        });
        const legacyPatient = fromDomainPatient(patient);
        set((state) => ({
          patients: state.patients.map((p) => (p.id === id ? legacyPatient : p)),
        }));
        return;
      }

      await db.patients.update(id, {
        status: 'discharged',
        dischargeDate,
        updatedAt: new Date(),
      });

      // Update local state
      set((state) => ({
        patients: state.patients.map((p) =>
          p.id === id ? { ...p, status: 'discharged' as const, dischargeDate } : p
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to discharge patient',
      });
      throw error;
    }
  },
}));
