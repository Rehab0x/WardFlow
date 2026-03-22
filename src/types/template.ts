/**
 * Template related types
 * Re-export from database.ts
 */
export type { Template } from '../db/database';

export type TemplateField = 'chiefComplaint' | 'presentIllness' | 'pastHistory' | 'reviewOfSystem' | 'physicalExam' | 'plan' | 'etc' | 'global';
