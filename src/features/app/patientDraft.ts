import type { Patient } from '@/types/patient';
import { formatDateInput, isDateInRange, parseDateInput } from '@/components/clinical/dateLabels';
import { normalizeRegistrationNumber } from '@/lib/registrationNumber';
import { type PatientListIndexes } from './patientIndexes';

export type AddPatientDraft = {
  roomBed: string;
  name: string;
  registrationNumber: string;
  birthDate: string;
  admissionDate: string;
  sex: 'M' | 'F';
  patientType: 'admitted' | 'consult';
  attendingPhysician: string;
  tagsText: string;
};


export const defaultAddPatientDraft: AddPatientDraft = {
  roomBed: '',
  name: '',
  registrationNumber: '',
  birthDate: '',
  admissionDate: formatDateInput(new Date()),
  sex: 'F',
  patientType: 'admitted',
  attendingPhysician: '',
  tagsText: '',
};


export function createDefaultAddPatientDraft(): AddPatientDraft {
  return {
    ...defaultAddPatientDraft,
    admissionDate: formatDateInput(new Date()),
  };
}

export function daysBetweenCalendarDates(startDate: Date, endDate: Date) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

export function validatePatientDraft(
  draft: AddPatientDraft,
  indexes: PatientListIndexes,
  excludePatientId?: string
) {
  if (!draft.roomBed.trim()) return '병실을 입력해주세요.';
  if (!draft.registrationNumber.trim()) return '등록번호를 입력해주세요.';
  if (!draft.name.trim()) return '이름을 입력해주세요.';
  if (!isValidBirthDateInput(draft.birthDate)) return '생년월일을 확인해주세요.';
  if (!isValidClinicalDateInput(draft.admissionDate)) return '입원일을 확인해주세요.';

  // 앞자리 0만 다른 등록번호는 같은 차트번호로 본다 (Lab import 매칭과 동일 기준).
  const registrationNumberOwner = indexes.registrationNumbers.get(
    normalizeRegistrationNumber(draft.registrationNumber)
  );
  if (registrationNumberOwner && registrationNumberOwner !== excludePatientId) {
    return '이미 같은 등록번호의 환자가 있습니다.';
  }

  return null;
}

export function areAddPatientDraftsEqual(left: AddPatientDraft, right: AddPatientDraft) {
  return (
    left.roomBed === right.roomBed &&
    left.name === right.name &&
    left.registrationNumber === right.registrationNumber &&
    left.birthDate === right.birthDate &&
    left.admissionDate === right.admissionDate &&
    left.sex === right.sex &&
    left.patientType === right.patientType &&
    left.attendingPhysician === right.attendingPhysician &&
    left.tagsText === right.tagsText
  );
}

export function buildAddPatientPanelValidationMessages(draft: AddPatientDraft) {
  const messages: string[] = [];
  if (!draft.name.trim()) messages.push('이름을 입력해주세요.');
  if (!draft.registrationNumber.trim()) messages.push('등록번호를 입력해주세요.');
  if (!draft.roomBed.trim()) messages.push('병실을 입력해주세요.');
  if (!isValidBirthDateInput(draft.birthDate))
    messages.push('생년월일은 1900년부터 오늘 사이로 입력해주세요.');
  if (!isValidClinicalDateInput(draft.admissionDate))
    messages.push('입원일은 1900년부터 오늘 사이로 입력해주세요.');
  return messages;
}

export function isValidBirthDateInput(value: string) {
  const date = parseDateInput(value);
  if (!date) return false;
  return isDateInRange(date, new Date(1900, 0, 1), new Date());
}

export function isValidClinicalDateInput(value: string) {
  const date = parseDateInput(value);
  if (!date) return false;
  return isDateInRange(date, new Date(1900, 0, 1), new Date());
}

export function draftFromPatient(patient: Patient): AddPatientDraft {
  return {
    roomBed: patient.roomBed,
    name: patient.name,
    registrationNumber: patient.registrationNumber,
    birthDate: formatDateInput(patient.birthDate),
    admissionDate: formatDateInput(patient.admissionDate),
    sex: patient.sex,
    patientType: patient.patientType,
    attendingPhysician: patient.attendingPhysician,
    tagsText: patient.tags?.join(', ') ?? '',
  };
}

export function parseTags(value: string) {
  return value
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
}
