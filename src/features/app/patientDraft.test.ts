import { describe, expect, it } from 'vitest';
import type { Patient } from '@/types/patient';
import { buildPatientIndexes } from './patientIndexes';
import {
  areAddPatientDraftsEqual,
  buildAddPatientPanelValidationMessages,
  createDefaultAddPatientDraft,
  draftFromPatient,
  isValidBirthDateInput,
  parseTags,
  validatePatientDraft,
  type AddPatientDraft,
} from './patientDraft';

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    registrationNumber: '0000004532',
    name: '김환자',
    birthDate: new Date(1965, 0, 1),
    sex: 'F',
    roomBed: '302-1',
    admissionDate: new Date(2026, 8, 1),
    attendingPhysician: '재활의학과',
    patientType: 'admitted',
    status: 'active',
    createdBy: 'u1',
    tags: ['#DM'],
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
    standingOrders: '',
    createdAt: new Date(2026, 8, 1),
    updatedAt: new Date(2026, 8, 1),
    ...overrides,
  };
}

function validDraft(overrides: Partial<AddPatientDraft> = {}): AddPatientDraft {
  return {
    ...createDefaultAddPatientDraft(),
    roomBed: '301',
    name: '신규환자',
    registrationNumber: '12345',
    birthDate: '1970-03-02',
    ...overrides,
  };
}

describe('validatePatientDraft', () => {
  const indexes = buildPatientIndexes([makePatient()]);

  it('returns null for a complete draft', () => {
    expect(validatePatientDraft(validDraft(), indexes)).toBeNull();
  });

  it('reports the first missing required field', () => {
    expect(validatePatientDraft(validDraft({ roomBed: '  ' }), indexes)).toBe('병실을 입력해주세요.');
    expect(validatePatientDraft(validDraft({ name: '' }), indexes)).toBe('이름을 입력해주세요.');
    expect(validatePatientDraft(validDraft({ birthDate: '' }), indexes)).toBe(
      '생년월일을 확인해주세요.'
    );
  });

  it('blocks a duplicate registration number', () => {
    expect(validatePatientDraft(validDraft({ registrationNumber: '0000004532' }), indexes)).toBe(
      '이미 같은 등록번호의 환자가 있습니다.'
    );
  });

  // 앞자리 0만 다른 등록번호는 같은 차트번호다 (Lab import 매칭과 동일 기준).
  it('blocks a leading-zero variant of an existing registration number', () => {
    expect(validatePatientDraft(validDraft({ registrationNumber: '4532' }), indexes)).toBe(
      '이미 같은 등록번호의 환자가 있습니다.'
    );
    expect(validatePatientDraft(validDraft({ registrationNumber: '004532' }), indexes)).toBe(
      '이미 같은 등록번호의 환자가 있습니다.'
    );
  });

  it('still allows a genuinely different registration number', () => {
    expect(validatePatientDraft(validDraft({ registrationNumber: '45320' }), indexes)).toBeNull();
  });

  it('allows the edited patient to keep its own registration number', () => {
    expect(
      validatePatientDraft(validDraft({ registrationNumber: '0000004532' }), indexes, 'p1')
    ).toBeNull();
    expect(validatePatientDraft(validDraft({ registrationNumber: '4532' }), indexes, 'p1')).toBeNull();
  });
});

describe('parseTags', () => {
  it('splits on commas and whitespace and drops empties', () => {
    expect(parseTags('#DM, #aspiration,  , #HTN')).toEqual(['#DM', '#aspiration', '#HTN']);
    expect(parseTags('   ')).toEqual([]);
  });
});

describe('isValidBirthDateInput', () => {
  it('rejects future and pre-1900 birth dates', () => {
    expect(isValidBirthDateInput('1970-01-01')).toBe(true);
    expect(isValidBirthDateInput('1899-12-31')).toBe(false);
    expect(isValidBirthDateInput(`${new Date().getFullYear() + 1}-01-01`)).toBe(false);
  });
});

describe('draftFromPatient / areAddPatientDraftsEqual', () => {
  it('round-trips a patient into an unchanged draft', () => {
    const draft = draftFromPatient(makePatient());
    expect(draft.name).toBe('김환자');
    expect(draft.tagsText).toBe('#DM');
    expect(areAddPatientDraftsEqual(draft, draftFromPatient(makePatient()))).toBe(true);
    expect(areAddPatientDraftsEqual(draft, { ...draft, roomBed: '999' })).toBe(false);
  });
});

describe('buildAddPatientPanelValidationMessages', () => {
  it('lists every unmet requirement', () => {
    const messages = buildAddPatientPanelValidationMessages(
      validDraft({ roomBed: '', name: '', birthDate: '' })
    );
    expect(messages.length).toBeGreaterThanOrEqual(3);
  });

  it('is empty for a complete draft', () => {
    expect(buildAddPatientPanelValidationMessages(validDraft())).toEqual([]);
  });
});
