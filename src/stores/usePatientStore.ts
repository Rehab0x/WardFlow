import { create } from 'zustand';
import { db } from '@/db/database';
import type { Patient } from '@/db/database';
import { useAuthStore } from './useAuthStore';
import { useSupabaseBackend } from '@/config/backend';
import {
  archivePatient as archiveSupabasePatient,
  createPatient as createSupabasePatient,
  getPatient as getSupabasePatient,
  listPatients as listSupabasePatients,
  updatePatient as updateSupabasePatient,
} from '@/data/patients.repository';
import {
  fromDomainPatient,
  toDomainPatientCreateInput,
  toDomainPatientUpdateInput,
} from '@/mappers/legacyPatient.mapper';
import { formatUserFacingError } from '@/lib/errorMessages';
import { patientArchiveFailureMessage } from '@/lib/patientDeletionPolicy';
import { mergeEntityListByUpdateStamp, removeById, replaceById, upsertById } from './storeUtils';

let patientListFetchPromise: Promise<void> | null = null;
const patientReadPromises = new Map<string, Promise<Patient | undefined>>();

interface PatientStore {
  patients: Patient[];
  patientById: Map<string, Patient>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPatients: () => Promise<void>;
  fetchPatientById: (id: string) => Promise<Patient | undefined>;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;
  dischargePatient: (id: string, dischargeDate: Date) => Promise<void>;
}

export const usePatientStore = create<PatientStore>((set, get) => ({
  patients: [],
  patientById: new Map(),
  isLoading: false,
  error: null,

  fetchPatients: async () => {
    if (patientListFetchPromise) return patientListFetchPromise;

    const fetchPromise = (async () => {
      set({ isLoading: true, error: null });
      try {
        if (useSupabaseBackend) {
          const patients = (await listSupabasePatients()).map(fromDomainPatient);
          set((state) => ({
            ...buildPatientCollectionState(
              state,
              mergeEntityListByUpdateStamp(state.patients, patients)
            ),
            isLoading: false,
          }));
          return;
        }

        const { currentUser } = useAuthStore.getState();

        let patients: Patient[];

        if (!currentUser) {
          // No user logged in - return empty
          set({ patients: [], patientById: new Map(), isLoading: false });
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

        set((state) => ({
          ...buildPatientCollectionState(
            state,
            mergeEntityListByUpdateStamp(state.patients, patients)
          ),
          isLoading: false,
        }));
      } catch (error) {
        set({
          error: formatUserFacingError(error, '환자 목록을 불러오지 못했습니다.'),
          isLoading: false,
        });
      }
    })();

    patientListFetchPromise = fetchPromise;
    try {
      await fetchPromise;
    } finally {
      if (patientListFetchPromise === fetchPromise) patientListFetchPromise = null;
    }
  },

  fetchPatientById: async (id: string) => {
    const existingRead = patientReadPromises.get(id);
    if (existingRead) return existingRead;

    const readPromise = (async () => {
      try {
        if (useSupabaseBackend) {
          const patient = await getSupabasePatient(id);
          if (!patient) {
            set((state) => buildPatientCollectionState(state, removeById(state.patients, id)));
            return undefined;
          }

          const legacyPatient = fromDomainPatient(patient);
          set((state) =>
            buildPatientCollectionState(state, upsertById(state.patients, legacyPatient, 'append'))
          );
          return legacyPatient;
        }

        const patient = await db.patients.get(id);
        if (!patient) {
          set((state) => buildPatientCollectionState(state, removeById(state.patients, id)));
          return undefined;
        }

        set((state) =>
          buildPatientCollectionState(state, upsertById(state.patients, patient, 'append'))
        );
        return patient;
      } catch (error) {
        set({
          error: formatUserFacingError(error, '환자 정보를 불러오지 못했습니다.'),
        });
        throw error;
      }
    })();

    patientReadPromises.set(id, readPromise);
    try {
      return await readPromise;
    } finally {
      if (patientReadPromises.get(id) === readPromise) patientReadPromises.delete(id);
    }
  },

  addPatient: async (patientData) => {
    try {
      const { currentUser } = useAuthStore.getState();

      if (!currentUser) {
        throw new Error('로그인이 필요합니다.');
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
        set((state) =>
          buildPatientCollectionState(state, upsertById(state.patients, legacyPatient, 'append'))
        );
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
      set((state) =>
        buildPatientCollectionState(state, upsertById(state.patients, patient, 'append'))
      );

      return id;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to add patient:', error);
      }
      set({
        error: formatUserFacingError(error, '환자를 추가하지 못했습니다.'),
      });
      throw error;
    }
  },

  updatePatient: async (id, updates) => {
    try {
      if (useSupabaseBackend) {
        const patient = await updateSupabasePatient(id, toDomainPatientUpdateInput(updates));
        const legacyPatient = fromDomainPatient(patient);
        set((state) =>
          buildPatientCollectionState(state, replaceById(state.patients, id, legacyPatient))
        );
        return;
      }

      const updatedData = {
        ...updates,
        updatedAt: new Date(),
      };

      await db.patients.update(id, updatedData);

      // Update local state
      set((state) => {
        const currentPatient = state.patientById.get(id);
        if (!currentPatient) return state;
        return buildPatientCollectionState(
          state,
          replaceById(state.patients, id, { ...currentPatient, ...updatedData })
        );
      });
    } catch (error) {
      set({
        error: formatUserFacingError(error, '환자 정보를 수정하지 못했습니다.'),
      });
      throw error;
    }
  },

  deletePatient: async (id) => {
    try {
      if (useSupabaseBackend) {
        await archiveSupabasePatient(id);
        set((state) => buildPatientCollectionState(state, removeById(state.patients, id)));
        return;
      }

      await db.patients.delete(id);

      // Update local state
      set((state) => buildPatientCollectionState(state, removeById(state.patients, id)));
    } catch (error) {
      set({
        error: formatUserFacingError(error, patientArchiveFailureMessage),
      });
      throw error;
    }
  },

  getPatientById: (id) => {
    return get().patientById.get(id);
  },

  dischargePatient: async (id, dischargeDate) => {
    try {
      if (useSupabaseBackend) {
        const patient = await updateSupabasePatient(id, {
          status: 'discharged',
          dischargeDate,
        });
        const legacyPatient = fromDomainPatient(patient);
        set((state) =>
          buildPatientCollectionState(state, replaceById(state.patients, id, legacyPatient))
        );
        return;
      }

      await db.patients.update(id, {
        status: 'discharged',
        dischargeDate,
        updatedAt: new Date(),
      });

      // Update local state
      set((state) => {
        const currentPatient = state.patientById.get(id);
        if (!currentPatient) return state;
        return buildPatientCollectionState(
          state,
          replaceById(state.patients, id, {
            ...currentPatient,
            status: 'discharged' as const,
            dischargeDate,
            updatedAt: new Date(),
          })
        );
      });
    } catch (error) {
      set({
        error: formatUserFacingError(error, '환자 퇴원 처리를 하지 못했습니다.'),
      });
      throw error;
    }
  },
}));

function buildPatientCollectionState(
  state: Pick<PatientStore, 'patients' | 'patientById'>,
  patients: Patient[]
) {
  if (patients === state.patients) return { patients, patientById: state.patientById };
  return { patients, patientById: new Map(patients.map((patient) => [patient.id, patient])) };
}
