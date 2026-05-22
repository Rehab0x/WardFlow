export type PatientSex = 'M' | 'F';
export type PatientType = 'admitted' | 'consult';
export type PatientStatus = 'active' | 'discharged' | 'archived';

export interface Patient {
  id: string;
  registrationNumber: string;
  name: string;
  birthDate: Date;
  sex: PatientSex;
  roomBed: string;
  admissionDate: Date;
  dischargeDate?: Date;
  attendingPhysician?: string;
  patientType: PatientType;
  status: PatientStatus;
  createdBy: string;
  attention: boolean;
  tags: string[];
  chiefComplaint: string;
  onset: string;
  presentIllness: string;
  pastHistory: string;
  reviewOfSystem: string;
  physicalExam: string;
  problemList: string[];
  plan: string;
  guardianExplanation: string;
  etc: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PatientCreateInput = Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>;
export type PatientUpdateInput = Partial<Omit<Patient, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>;

