import { describe, expect, it } from 'vitest';
import {
  buildPatientOwnershipEntries,
  comparePatientForAdmin,
  countAdminPatients,
  filterAdminPatients,
} from './adminPatients';
import type { Patient } from '@/db/database';
import type { User } from '@/types/user';

const makePatient = (overrides: Partial<Patient>): Patient => ({
  id: 'patient-1',
  name: '홍길동',
  birthDate: new Date('1956-01-01'),
  sex: 'M',
  registrationNumber: '12345678',
  roomBed: '101-1',
  admissionDate: new Date('2026-05-01'),
  attendingPhysician: '김의사',
  patientType: 'admitted',
  status: 'active',
  createdBy: 'doctor-1',
  tags: [],
  chiefComplaint: 'Stroke',
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
});

const users: User[] = [
  {
    id: 'doctor-1',
    username: 'doctor',
    name: '김의사',
    role: 'doctor',
    department: '재활의학과',
    status: 'approved',
    modules: ['wardflow'],
    createdAt: new Date('2026-05-25T00:00:00Z'),
    updatedAt: new Date('2026-05-25T00:00:00Z'),
  },
];

describe('adminPatients helpers', () => {
  it('sorts patients by room and then name', () => {
    const left = makePatient({ roomBed: '101-10', name: '나환자' });
    const right = makePatient({ roomBed: '101-2', name: '가환자' });
    expect(comparePatientForAdmin(left, right)).toBeGreaterThan(0);
    expect(
      comparePatientForAdmin(makePatient({ name: '가환자' }), makePatient({ name: '나환자' }))
    ).toBeLessThan(0);
  });

  it('counts active, discharged, and attention patients', () => {
    const patients = [
      makePatient({ id: 'active-1', status: 'active', attention: true }),
      makePatient({ id: 'active-2', status: 'active', attention: false }),
      makePatient({ id: 'discharged-1', status: 'discharged', attention: true }),
    ];

    expect(countAdminPatients(patients)).toEqual({
      all: 3,
      active: 2,
      discharged: 1,
      attention: 2,
    });
  });

  it('filters patients by status and search text', () => {
    const patients = [
      makePatient({ id: 'one', name: '홍길동', status: 'active', attention: true }),
      makePatient({ id: 'two', name: '김퇴원', status: 'discharged', attention: false }),
      makePatient({
        id: 'three',
        name: '박협진',
        patientType: 'consult',
        chiefComplaint: 'Back pain',
      }),
    ];

    expect(filterAdminPatients(patients, '퇴원', 'all').map((patient) => patient.id)).toEqual([
      'two',
    ]);
    expect(filterAdminPatients(patients, '', 'attention').map((patient) => patient.id)).toEqual([
      'one',
    ]);
    expect(filterAdminPatients(patients, '협진', 'active').map((patient) => patient.id)).toEqual([
      'three',
    ]);
    expect(filterAdminPatients(patients, '', 'discharged').map((patient) => patient.id)).toEqual([
      'two',
    ]);
  });

  it('groups patients by owner and labels unknown owners', () => {
    const entries = buildPatientOwnershipEntries(
      [
        makePatient({
          id: 'active',
          createdBy: 'doctor-1',
          status: 'active',
          patientType: 'admitted',
        }),
        makePatient({
          id: 'consult',
          createdBy: 'doctor-1',
          status: 'active',
          patientType: 'consult',
          attention: true,
        }),
        makePatient({ id: 'unknown', createdBy: '', status: 'discharged' }),
      ],
      users
    );

    expect(entries[0]).toMatchObject({
      doctorId: 'doctor-1',
      doctorName: '김의사',
      active: expect.arrayContaining([expect.objectContaining({ id: 'active' })]),
      admittedCount: 1,
      consultCount: 1,
      attentionCount: 1,
    });
    expect(entries[1]).toMatchObject({
      doctorId: 'unknown',
      doctorName: '미배정',
      discharged: expect.arrayContaining([expect.objectContaining({ id: 'unknown' })]),
    });
  });
});
