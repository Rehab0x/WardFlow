/**
 * Medication related types
 * Re-export from database.ts
 */
export type { Medication } from '../db/database';

/**
 * Medication parsing result from OCS paste
 */
export interface MedicationParseResult {
  drugName: string;
  drugBaseName: string;
  singleDose: number;
  schedule: string;
  daysRemaining?: number;
  success: boolean;
  error?: string;
}

/**
 * Medication display with calculated D-day for antibiotics
 */
export interface MedicationDisplay {
  id: string;
  patientId: string;
  drugName: string;
  drugBaseName: string;
  singleDose: number;
  schedule: string;
  daysRemaining?: number;
  startDate: Date;
  endDate?: Date;
  isAntibiotic: boolean;
  isActive: boolean;
  notes?: string;

  // Computed fields
  dDay?: number; // Days since start (for antibiotics)
  shouldAlert?: boolean; // True if antibiotic >= 14 days
}
