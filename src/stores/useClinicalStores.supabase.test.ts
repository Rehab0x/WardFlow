import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LabResult } from '@/domain/lab';
import type { Medication } from '@/domain/medication';
import type { Note } from '@/domain/note';
import type { Schedule } from '@/domain/schedule';

const noteRepo = vi.hoisted(() => ({
  createNote: vi.fn(),
  listNotesByPatient: vi.fn(),
  softDeleteNote: vi.fn(),
  updateNote: vi.fn(),
}));
const labRepo = vi.hoisted(() => ({
  createLabResult: vi.fn(),
  listLabsByPatient: vi.fn(),
  softDeleteLabResult: vi.fn(),
  updateLabItemValue: vi.fn(),
}));
const medicationRepo = vi.hoisted(() => ({
  createMedication: vi.fn(),
  createMedications: vi.fn(),
  listMedicationsByPatient: vi.fn(),
  softDeleteMedication: vi.fn(),
  updateMedication: vi.fn(),
}));
const scheduleRepo = vi.hoisted(() => ({
  createSchedule: vi.fn(),
  listSchedulesByDate: vi.fn(),
  listSchedulesByPatient: vi.fn(),
  softDeleteSchedule: vi.fn(),
  updateSchedule: vi.fn(),
}));

vi.mock('@/config/backend', () => ({ useSupabaseBackend: true }));
vi.mock('@/hooks/useSidebarFlags', () => ({ refreshSidebarFlags: vi.fn() }));
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
vi.mock('@/data/notes.repository', () => noteRepo);
vi.mock('@/data/labs.repository', () => labRepo);
vi.mock('@/data/medications.repository', () => medicationRepo);
vi.mock('@/data/schedules.repository', () => scheduleRepo);

const now = new Date('2026-05-25T00:00:00Z');

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    patientId: 'patient-1',
    content: '회진 메모',
    type: 'progress',
    createdBy: 'user-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeLab(overrides: Partial<LabResult> = {}): LabResult {
  return {
    id: 'lab-1',
    patientId: 'patient-1',
    testDate: now,
    category: 'Other',
    source: 'manual',
    rawText: undefined,
    createdBy: 'user-1',
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: 'lab-item-1',
        labResultId: 'lab-1',
        name: 'CRP',
        valueText: '3.1',
        valueNumeric: 3.1,
        unit: 'mg/dL',
        isAbnormal: true,
        hlFlag: 'H',
        displayOrder: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    ...overrides,
  };
}

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    patientId: 'patient-1',
    category: 'antibiotic',
    drugName: 'Ceftriaxone',
    drugBaseName: 'Ceftriaxone',
    singleDose: 0,
    schedule: '#1',
    dosage: '2g',
    frequency: '#1',
    startDate: now,
    isActive: true,
    createdBy: 'user-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'schedule-1',
    patientId: 'patient-1',
    title: 'CT',
    scheduledDate: now,
    scheduledTime: '14:00',
    category: '검사',
    isCompleted: false,
    createdBy: 'user-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('clinical stores Supabase write flow', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const [{ useNoteStore }, { useLabStore }, { useMedicationStore }, { useScheduleStore }] =
      await Promise.all([
        import('./useNoteStore'),
        import('./useLabStore'),
        import('./useMedicationStore'),
        import('./useScheduleStore'),
      ]);

    useNoteStore.setState({ notes: [], isLoading: false, error: null });
    useLabStore.setState({ labs: [], isLoading: false, error: null });
    useMedicationStore.setState({ medications: [], isLoading: false, error: null });
    useScheduleStore.setState({ schedules: [], isLoading: false, error: null });
  });

  it('adds and removes notes through Supabase', async () => {
    noteRepo.createNote.mockResolvedValue(makeNote());
    noteRepo.softDeleteNote.mockResolvedValue(undefined);

    const { useNoteStore } = await import('./useNoteStore');
    const id = await useNoteStore.getState().addNote({
      patientId: 'patient-1',
      content: '회진 메모',
      type: 'progress',
    });

    expect(id).toBe('note-1');
    expect(noteRepo.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1', createdBy: 'user-1' })
    );
    expect(useNoteStore.getState().notes).toHaveLength(1);

    await useNoteStore.getState().deleteNote('note-1');
    expect(noteRepo.softDeleteNote).toHaveBeenCalledWith('note-1');
    expect(useNoteStore.getState().notes).toHaveLength(0);
  });

  it('adds and removes manual Labs through Supabase', async () => {
    labRepo.createLabResult.mockResolvedValue(makeLab());
    labRepo.softDeleteLabResult.mockResolvedValue(undefined);

    const { useLabStore } = await import('./useLabStore');
    const id = await useLabStore
      .getState()
      .addLabResult(
        'patient-1',
        'Other',
        [{ name: 'CRP', value: 3.1, unit: 'mg/dL', isAbnormal: true, hlFlag: 'H' }],
        now,
        'manual'
      );

    expect(id).toBe('lab-1');
    expect(labRepo.createLabResult).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1', createdBy: 'user-1' })
    );
    expect(useLabStore.getState().labs[0]?.items[0]?.name).toBe('CRP');

    await useLabStore.getState().deleteLabResult('lab-1');
    expect(labRepo.softDeleteLabResult).toHaveBeenCalledWith('lab-1');
    expect(useLabStore.getState().labs).toHaveLength(0);
  });

  it('adds and removes antibiotics through Supabase', async () => {
    medicationRepo.createMedication.mockResolvedValue(makeMedication());
    medicationRepo.softDeleteMedication.mockResolvedValue(undefined);

    const { useMedicationStore } = await import('./useMedicationStore');
    const id = await useMedicationStore.getState().addMedication({
      patientId: 'patient-1',
      category: 'antibiotic',
      drugName: 'Ceftriaxone',
      drugBaseName: 'Ceftriaxone',
      singleDose: 0,
      schedule: '#1',
      dosage: '2g',
      frequency: '#1',
      startDate: now,
      isAntibiotic: true,
      isActive: true,
    });

    expect(id).toBe('med-1');
    expect(medicationRepo.createMedication).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1', createdBy: 'user-1' })
    );
    expect(useMedicationStore.getState().medications[0]?.drugName).toBe('Ceftriaxone');

    await useMedicationStore.getState().deleteMedication('med-1');
    expect(medicationRepo.softDeleteMedication).toHaveBeenCalledWith('med-1');
    expect(useMedicationStore.getState().medications).toHaveLength(0);
  });

  it('adds and removes today schedules through Supabase', async () => {
    scheduleRepo.createSchedule.mockResolvedValue(makeSchedule());
    scheduleRepo.softDeleteSchedule.mockResolvedValue(undefined);

    const { useScheduleStore } = await import('./useScheduleStore');
    const id = await useScheduleStore.getState().addSchedule({
      patientId: 'patient-1',
      title: 'CT',
      scheduledDate: now,
      scheduledTime: '14:00',
      category: '검사',
      isCompleted: false,
    });

    expect(id).toBe('schedule-1');
    expect(scheduleRepo.createSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1', createdBy: 'user-1' })
    );
    expect(useScheduleStore.getState().schedules[0]?.title).toBe('CT');

    await useScheduleStore.getState().deleteSchedule('schedule-1');
    expect(scheduleRepo.softDeleteSchedule).toHaveBeenCalledWith('schedule-1');
    expect(useScheduleStore.getState().schedules).toHaveLength(0);
  });
});
