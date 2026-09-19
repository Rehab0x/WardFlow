import { create } from 'zustand';
import type { Patient } from '@/types/patient';
import { useAuthStore } from './useAuthStore';
import {
  createPatient,
  deletePatient as deletePatientRow,
  getPatient,
  listPatients,
  updatePatient as updatePatientRow,
} from '@/data/patients.repository';
import {
  fromDomainPatient,
  toDomainPatientCreateInput,
  toDomainPatientUpdateInput,
} from '@/mappers/patientView.mapper';
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
        const patients = (await listPatients()).map(fromDomainPatient);
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
        const patient = await getPatient(id);
        if (!patient) {
          set((state) => buildPatientCollectionState(state, removeById(state.patients, id)));
          return undefined;
        }

        const viewPatient = fromDomainPatient(patient);
        set((state) =>
          buildPatientCollectionState(state, upsertById(state.patients, viewPatient, 'append'))
        );
        return viewPatient;
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

      const patient = await createPatient(
        toDomainPatientCreateInput({
          ...patientData,
          createdBy: currentUser.id,
          sharedWith: patientData.sharedWith || [],
        })
      );
      const viewPatient = fromDomainPatient(patient);
      set((state) =>
        buildPatientCollectionState(state, upsertById(state.patients, viewPatient, 'append'))
      );
      return viewPatient.id;
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
      const patient = await updatePatientRow(id, toDomainPatientUpdateInput(updates));
      const viewPatient = fromDomainPatient(patient);
      set((state) =>
        buildPatientCollectionState(state, replaceById(state.patients, id, viewPatient))
      );
    } catch (error) {
      set({
        error: formatUserFacingError(error, '환자 정보를 수정하지 못했습니다.'),
      });
      throw error;
    }
  },

  deletePatient: async (id) => {
    try {
      await deletePatientRow(id);
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
      const patient = await updatePatientRow(id, {
        status: 'discharged',
        dischargeDate,
      });
      const viewPatient = fromDomainPatient(patient);
      set((state) =>
        buildPatientCollectionState(state, replaceById(state.patients, id, viewPatient))
      );
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
