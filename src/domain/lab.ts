export type LabSource = 'manual' | 'parsed' | 'csv' | 'xls';

export interface LabItem {
  id: string;
  labResultId: string;
  code?: string;
  name: string;
  valueText: string;
  valueNumeric?: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  isAbnormal: boolean;
  hlFlag?: 'H' | 'L';
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LabResult {
  id: string;
  patientId: string;
  testDate: Date;
  category: string;
  source: LabSource;
  rawText?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  items: LabItem[];
}

export type LabItemCreateInput = Omit<LabItem, 'id' | 'labResultId' | 'createdAt' | 'updatedAt'>;

export interface LabResultCreateInput {
  patientId: string;
  testDate: Date;
  category: string;
  source: LabSource;
  rawText?: string;
  createdBy: string;
  items: LabItemCreateInput[];
}

