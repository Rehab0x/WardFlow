export type MedicationCategory = 'hospital' | 'personal' | 'antibiotic';

export interface Medication {
  id: string;
  patientId: string;
  category: MedicationCategory;
  drugName: string;
  drugBaseName: string;
  singleDose?: number;
  schedule: string;
  timing?: string;
  daysRemaining?: number;
  dosage?: string;
  frequency?: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MedicationCreateInput = Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>;
export type MedicationUpdateInput = Partial<Omit<Medication, 'id' | 'patientId' | 'createdBy' | 'createdAt' | 'updatedAt'>>;

