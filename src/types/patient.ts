/**
 * Patient-related type definitions
 * Re-export from database.ts for convenience
 */
export type { Patient } from '../db/database';

export type PatientStatus = 'active' | 'discharged';
export type Sex = 'M' | 'F';
