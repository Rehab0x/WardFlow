import type { Inserts, Tables, Updates } from '@/types/supabase';
import type { Medication, MedicationCreateInput, MedicationUpdateInput } from '@/domain/medication';
import { fromDateOnly, fromNullableDateOnly, toDateOnly, toNullableDateOnly } from './date';

export function fromMedicationRow(row: Tables<'medications'>): Medication {
  return {
    id: row.id,
    patientId: row.patient_id,
    category: row.category,
    drugName: row.drug_name,
    drugBaseName: row.drug_base_name,
    singleDose: row.single_dose ?? undefined,
    schedule: row.schedule,
    timing: row.timing ?? undefined,
    daysRemaining: row.days_remaining ?? undefined,
    dosage: row.dosage ?? undefined,
    frequency: row.frequency ?? undefined,
    startDate: fromDateOnly(row.start_date),
    endDate: fromNullableDateOnly(row.end_date),
    isActive: row.is_active,
    notes: row.notes ?? undefined,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toMedicationInsert(input: MedicationCreateInput): Inserts<'medications'> {
  return {
    patient_id: input.patientId,
    category: input.category,
    drug_name: input.drugName,
    drug_base_name: input.drugBaseName,
    single_dose: input.singleDose ?? null,
    schedule: input.schedule,
    timing: input.timing ?? null,
    days_remaining: input.daysRemaining ?? null,
    dosage: input.dosage ?? null,
    frequency: input.frequency ?? null,
    start_date: toDateOnly(input.startDate),
    end_date: toNullableDateOnly(input.endDate),
    is_active: input.isActive,
    notes: input.notes ?? null,
    created_by: input.createdBy,
  };
}

export function toMedicationUpdate(input: MedicationUpdateInput): Updates<'medications'> {
  return {
    category: input.category,
    drug_name: input.drugName,
    drug_base_name: input.drugBaseName,
    single_dose: input.singleDose,
    schedule: input.schedule,
    timing: input.timing,
    days_remaining: input.daysRemaining,
    dosage: input.dosage,
    frequency: input.frequency,
    start_date: input.startDate ? toDateOnly(input.startDate) : undefined,
    end_date: input.endDate === undefined ? undefined : toNullableDateOnly(input.endDate),
    is_active: input.isActive,
    notes: input.notes,
  };
}

