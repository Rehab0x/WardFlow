import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Patient as DomainPatient } from '@/domain/patient';
import type { Patient } from '@/db/database';
import { fromDomainPatient } from '@/mappers/legacyPatient.mapper';

const repo = vi.hoisted(() => ({
  archivePatient: vi.fn(),
  createPatient: vi.fn(),
  getPatient: vi.fn(),
  listPatients: vi.fn(),
  updatePatient: vi.fn(),
}));

vi.mock('@/config/backend', () => ({ useSupabaseBackend: true }));
vi.mock('@/data/patients.repository', () => ({
  archivePatient: repo.archivePatient,
  createPatient: repo.createPatient,
  getPatient: repo.getPatient,
  listPatients: repo.listPatients,
  updatePatient: repo.updatePatient,
}));
vi.mock('./useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({
      currentUser: {
        id: 'user-1',
        role: 'doctor',
      },
    }),
  },
}));

function makeDomainPatient(overrides: Partial<DomainPatient> = {}): DomainPatient {
  return {
    id: 'patient-1',
    registrationNumber: '900101',
    name: '테스트환자',
    birthDate: new Date('1970-01-01'),
    sex: 'F',
    roomBed: '901-1',
    admissionDate: new Date('2026-05-25'),
    attendingPhysician: '테스트의',
    patientType: 'admitted',
    status: 'active',
    createdBy: 'user-1',
    attention: false,
    tags: [],
    chiefComplaint: '',
    onset: '',
    presentIllness: '',
    pastHistory: '',
    reviewOfSystem: '',
    physicalExam: '',
    problemList: [],
    plan: '',
    guardianExplanation: '',
    etc: '',
    createdAt: new Date('2026-05-25T00:00:00Z'),
    updatedAt: new Date('2026-05-25T00:00:00Z'),
    ...overrides,
  };
}

function makeLegacyPatient(overrides: Partial<DomainPatient> = {}): Patient {
  return fromDomainPatient(makeDomainPatient(overrides));
}

describe('usePatientStore Supabase flow', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { usePatientStore } = await import('./usePatientStore');
    usePatientStore.setState({
      patients: [],
      patientById: new Map(),
      isLoading: false,
      error: null,
    });
  });

  it('fetches Supabase patients into the id map', async () => {
    repo.listPatients.mockResolvedValue([
      makeDomainPatient({ id: 'patient-a', name: '가환자' }),
      makeDomainPatient({ id: 'patient-b', name: '나환자' }),
    ]);

    const { usePatientStore } = await import('./usePatientStore');
    await usePatientStore.getState().fetchPatients();

    expect(repo.listPatients).toHaveBeenCalledTimes(1);
    expect(usePatientStore.getState().patients.map((patient) => patient.id)).toEqual([
      'patient-a',
      'patient-b',
    ]);
    expect(usePatientStore.getState().getPatientById('patient-b')?.name).toBe('나환자');
  });

  it('creates a Supabase patient with the current user and opens it in local state', async () => {
    repo.createPatient.mockResolvedValue(makeDomainPatient({ id: 'created-patient' }));

    const { usePatientStore } = await import('./usePatientStore');
    const id = await usePatientStore.getState().addPatient({
      registrationNumber: '900101',
      name: '테스트환자',
      birthDate: new Date('1970-01-01'),
      sex: 'F',
      roomBed: '901-1',
      admissionDate: new Date('2026-05-25'),
      attendingPhysician: '테스트의',
      patientType: 'admitted',
      status: 'active',
      createdBy: '',
      sharedWith: [],
      tags: [],
      attention: false,
      chiefComplaint: '',
      onset: '',
      presentIllness: '',
      pastHistory: '',
      reviewOfSystem: '',
      physicalExam: '',
      problemList: [],
      plan: '',
      guardianExplanation: '',
      etc: '',
    });

    expect(id).toBe('created-patient');
    expect(repo.createPatient).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: 'user-1',
        registrationNumber: '900101',
      })
    );
    expect(usePatientStore.getState().getPatientById('created-patient')?.name).toBe('테스트환자');
  });

  it('updates and archives Supabase patients in local state', async () => {
    repo.updatePatient.mockResolvedValue(
      makeDomainPatient({
        id: 'patient-1',
        name: '수정환자',
        roomBed: '902-1',
        updatedAt: new Date('2026-05-25T00:01:00Z'),
      })
    );
    repo.archivePatient.mockResolvedValue(undefined);

    const { usePatientStore } = await import('./usePatientStore');
    const patient = makeLegacyPatient();
    usePatientStore.setState({
      patients: [patient],
      patientById: new Map([['patient-1', patient]]),
      isLoading: false,
      error: null,
    });

    await usePatientStore.getState().updatePatient('patient-1', { name: '수정환자' });
    expect(repo.updatePatient).toHaveBeenCalledWith(
      'patient-1',
      expect.objectContaining({ name: '수정환자' })
    );
    expect(usePatientStore.getState().getPatientById('patient-1')?.roomBed).toBe('902-1');

    await usePatientStore.getState().deletePatient('patient-1');
    expect(repo.archivePatient).toHaveBeenCalledWith('patient-1');
    expect(usePatientStore.getState().getPatientById('patient-1')).toBeUndefined();
  });
});
