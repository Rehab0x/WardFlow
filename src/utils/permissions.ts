/**
 * Permission checking utilities
 */

import type { User, UserRole } from '@/types/user';
import type { Patient } from '@/db/database';

/**
 * Check if user can view a patient
 */
export function canViewPatient(user: User | null, patient: Patient): boolean {
  if (!user) return false;

  // Admin can view all patients
  if (user.role === 'admin') return true;

  // Nurses can view all patients in their department
  if (user.role === 'nurse') return true;

  // Therapists can view all patients they are assigned to
  if (user.role === 'therapist') {
    return patient.sharedWith?.includes(user.id) || false;
  }

  // Doctors can view their own patients or shared patients
  if (user.role === 'doctor') {
    return patient.createdBy === user.id || patient.sharedWith?.includes(user.id) || false;
  }

  return false;
}

/**
 * Check if user can edit a patient
 */
export function canEditPatient(user: User | null, patient: Patient): boolean {
  if (!user) return false;

  // Admin can edit all patients
  if (user.role === 'admin') return true;

  // Only the doctor who created the patient can edit
  if (user.role === 'doctor') {
    return patient.createdBy === user.id;
  }

  // Nurses and therapists cannot edit patient records
  return false;
}

/**
 * Check if user can delete a patient
 */
export function canDeletePatient(user: User | null, patient: Patient): boolean {
  if (!user) return false;

  // Admin can delete all patients
  if (user.role === 'admin') return true;

  // Only the doctor who created the patient can delete
  if (user.role === 'doctor') {
    return patient.createdBy === user.id;
  }

  return false;
}

/**
 * Check if user can create a patient
 */
export function canCreatePatient(user: User | null): boolean {
  if (!user) return false;

  // Admin and doctors can create patients
  return user.role === 'admin' || user.role === 'doctor';
}

/**
 * Check if user can add notes
 */
export function canAddNotes(user: User | null, patient: Patient): boolean {
  if (!user) return false;

  // Admin can add notes to all patients
  if (user.role === 'admin') return true;

  // All roles can add notes to patients they can view
  return canViewPatient(user, patient);
}

/**
 * Get role display name in Korean
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    doctor: '의사',
    nurse: '간호사',
    therapist: '치료사',
    admin: '관리자',
  };

  return roleNames[role];
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(user: User | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
