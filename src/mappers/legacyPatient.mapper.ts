import type { Patient as DomainPatient, PatientCreateInput, PatientUpdateInput } from '@/domain/patient';
import type { Patient as LegacyPatient } from '@/db/database';

export function fromDomainPatient(patient: DomainPatient): LegacyPatient {
  return {
    id: patient.id,
    registrationNumber: patient.registrationNumber,
    name: patient.name,
    birthDate: patient.birthDate,
    sex: patient.sex,
    roomBed: patient.roomBed,
    admissionDate: patient.admissionDate,
    dischargeDate: patient.dischargeDate,
    attendingPhysician: patient.attendingPhysician ?? '',
    patientType: patient.patientType,
    status: patient.status === 'active' ? 'active' : 'discharged',
    createdBy: patient.createdBy,
    sharedWith: [],
    tags: patient.tags,
    attention: patient.attention,
    chiefComplaint: patient.chiefComplaint,
    onset: patient.onset,
    presentIllness: patient.presentIllness,
    pastHistory: patient.pastHistory,
    reviewOfSystem: patient.reviewOfSystem,
    physicalExam: patient.physicalExam,
    problemList: patient.problemList,
    plan: patient.plan,
    guardianExplanation: patient.guardianExplanation,
    etc: patient.etc,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
}

export function toDomainPatientCreateInput(patient: Omit<LegacyPatient, 'id' | 'createdAt' | 'updatedAt'>): PatientCreateInput {
  return {
    registrationNumber: patient.registrationNumber,
    name: patient.name,
    birthDate: patient.birthDate,
    sex: patient.sex,
    roomBed: patient.roomBed,
    admissionDate: patient.admissionDate,
    dischargeDate: patient.dischargeDate,
    attendingPhysician: patient.attendingPhysician,
    patientType: patient.patientType,
    status: patient.status,
    createdBy: patient.createdBy,
    attention: patient.attention ?? false,
    tags: patient.tags ?? [],
    chiefComplaint: patient.chiefComplaint,
    onset: patient.onset,
    presentIllness: patient.presentIllness,
    pastHistory: patient.pastHistory,
    reviewOfSystem: patient.reviewOfSystem,
    physicalExam: patient.physicalExam,
    problemList: patient.problemList,
    plan: patient.plan,
    guardianExplanation: patient.guardianExplanation,
    etc: patient.etc,
  };
}

export function toDomainPatientUpdateInput(updates: Partial<LegacyPatient>): PatientUpdateInput {
  return {
    registrationNumber: updates.registrationNumber,
    name: updates.name,
    birthDate: updates.birthDate,
    sex: updates.sex,
    roomBed: updates.roomBed,
    admissionDate: updates.admissionDate,
    dischargeDate: updates.dischargeDate,
    attendingPhysician: updates.attendingPhysician,
    patientType: updates.patientType,
    status: updates.status,
    attention: updates.attention,
    tags: updates.tags,
    chiefComplaint: updates.chiefComplaint,
    onset: updates.onset,
    presentIllness: updates.presentIllness,
    pastHistory: updates.pastHistory,
    reviewOfSystem: updates.reviewOfSystem,
    physicalExam: updates.physicalExam,
    problemList: updates.problemList,
    plan: updates.plan,
    guardianExplanation: updates.guardianExplanation,
    etc: updates.etc,
  };
}

