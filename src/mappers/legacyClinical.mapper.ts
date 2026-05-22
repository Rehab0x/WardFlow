import type { LabItem as DomainLabItem, LabResult as DomainLabResult } from '@/domain/lab';
import type { Medication as DomainMedication } from '@/domain/medication';
import type { Note as DomainNote } from '@/domain/note';
import type { Schedule as DomainSchedule } from '@/domain/schedule';
import type {
  LabItem as LegacyLabItem,
  LabResult as LegacyLabResult,
  Medication as LegacyMedication,
  Note as LegacyNote,
  Schedule as LegacySchedule,
} from '@/db/database';

export function fromDomainNote(note: DomainNote): LegacyNote {
  return {
    id: note.id,
    patientId: note.patientId,
    content: note.content,
    type: note.type,
    alertDate: note.alertDate,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export function fromDomainSchedule(schedule: DomainSchedule): LegacySchedule {
  return {
    id: schedule.id,
    patientId: schedule.patientId,
    title: schedule.title,
    scheduledDate: schedule.scheduledDate,
    scheduledTime: schedule.scheduledTime,
    category: schedule.category,
    isCompleted: schedule.isCompleted,
    notes: schedule.notes,
    createdAt: schedule.createdAt,
  };
}

export function fromDomainMedication(medication: DomainMedication): LegacyMedication {
  return {
    id: medication.id,
    patientId: medication.patientId,
    category: medication.category,
    drugName: medication.drugName,
    drugBaseName: medication.drugBaseName,
    singleDose: medication.singleDose ?? 0,
    schedule: medication.schedule,
    timing: medication.timing,
    daysRemaining: medication.daysRemaining,
    dosage: medication.dosage,
    frequency: medication.frequency,
    startDate: medication.startDate,
    endDate: medication.endDate,
    isAntibiotic: medication.category === 'antibiotic',
    isActive: medication.isActive,
    notes: medication.notes,
    createdAt: medication.createdAt,
    updatedAt: medication.updatedAt,
  };
}

export function toDomainMedicationCreateInput(
  medication: Omit<LegacyMedication, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string
) {
  return {
    patientId: medication.patientId,
    category: medication.category,
    drugName: medication.drugName,
    drugBaseName: medication.drugBaseName,
    singleDose: medication.singleDose,
    schedule: medication.schedule,
    timing: medication.timing,
    daysRemaining: medication.daysRemaining,
    dosage: medication.dosage,
    frequency: medication.frequency,
    startDate: medication.startDate,
    endDate: medication.endDate,
    isActive: medication.isActive,
    notes: medication.notes,
    createdBy,
  };
}

export function fromDomainLabResult(result: DomainLabResult): LegacyLabResult {
  return {
    id: result.id,
    patientId: result.patientId,
    testDate: result.testDate,
    category: result.category,
    source: result.source,
    rawText: result.rawText,
    createdAt: result.createdAt,
    items: result.items.map(fromDomainLabItem),
  };
}

export function fromDomainLabItem(item: DomainLabItem): LegacyLabItem {
  return {
    code: item.code,
    name: item.name,
    value: item.valueNumeric ?? item.valueText,
    unit: item.unit,
    referenceMin: item.referenceMin,
    referenceMax: item.referenceMax,
    isAbnormal: item.isAbnormal,
    hlFlag: item.hlFlag,
  };
}

export function toDomainLabItemCreateInput(item: LegacyLabItem, displayOrder: number) {
  const valueText = String(item.value);
  const valueNumeric = typeof item.value === 'number' ? item.value : undefined;

  return {
    code: item.code,
    name: item.name,
    valueText,
    valueNumeric,
    unit: item.unit,
    referenceMin: item.referenceMin,
    referenceMax: item.referenceMax,
    isAbnormal: item.isAbnormal,
    hlFlag: item.hlFlag,
    displayOrder,
  };
}

