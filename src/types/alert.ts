/**
 * Alert related types
 * Re-export from database.ts
 */
export type { Alert } from '../db/database';

export type AlertType = 'lab_abnormal' | 'antibiotic_duration' | 'schedule' | 'custom';
export type AlertSeverity = 'info' | 'warning' | 'critical';
