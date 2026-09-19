import type { Dispatch, SetStateAction } from 'react';
import type { Patient } from '@/types/patient';
import type { BriefingData } from '@/services/briefingService';
import { formatDateInput } from '@/components/clinical/dateLabels';
import { daysBetweenCalendarDates } from './patientDraft';

export const emptyBriefingData: BriefingData = {
  reminders: [],
  progressNotes: [],
  antibiotics: [],
  recentLabs: [],
  todaySchedules: [],
  patientSummary: {
    total: 0,
    admitted: 0,
    consult: 0,
  },
};

export function applyOptimisticPatientIdentity(
  setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  previousPatient: Patient,
  nextPatient: Pick<Patient, 'name' | 'roomBed'>
) {
  const updateIdentity = <Item extends { patientId: string; patientName: string; roomBed: string }>(
    item: Item
  ): Item =>
    item.patientId === previousPatient.id
      ? { ...item, patientName: nextPatient.name, roomBed: nextPatient.roomBed }
      : item;

  setBriefingData((current) => {
    return {
      ...current,
      reminders: current.reminders.map(updateIdentity),
      progressNotes: current.progressNotes.map(updateIdentity),
      antibiotics: current.antibiotics.map(updateIdentity),
      recentLabs: current.recentLabs.map(updateIdentity),
      todaySchedules: current.todaySchedules.map(updateIdentity),
    };
  });
}

export function applyOptimisticRemovePatientItems(
  setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  patientId: string
) {
  setBriefingData((current) => ({
    ...current,
    reminders: removeBriefingItemsByPatient(current.reminders, patientId),
    progressNotes: removeBriefingItemsByPatient(current.progressNotes, patientId),
    antibiotics: removeBriefingItemsByPatient(current.antibiotics, patientId),
    recentLabs: removeBriefingItemsByPatient(current.recentLabs, patientId),
    todaySchedules: removeBriefingItemsByPatient(current.todaySchedules, patientId),
  }));
}

export function applyOptimisticNote(
  setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  patient: Patient,
  noteId: string,
  content: string,
  type: 'progress' | 'reminder'
) {
  const item = {
    patientId: patient.id,
    patientName: patient.name,
    roomBed: patient.roomBed,
    noteId,
    content,
  };

  setBriefingData((current) =>
    type === 'reminder'
      ? { ...current, reminders: upsertBriefingItem(current.reminders, item, 'noteId') }
      : { ...current, progressNotes: upsertBriefingItem(current.progressNotes, item, 'noteId') }
  );
}

export function applyOptimisticRemoveNote(
  setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  noteId: string
) {
  setBriefingData((current) => ({
    ...current,
    reminders: removeBriefingItemByKey(current.reminders, 'noteId', noteId),
    progressNotes: removeBriefingItemByKey(current.progressNotes, 'noteId', noteId),
  }));
}

export function applyOptimisticAntibiotic(
  setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  patient: Patient,
  medicationId: string,
  draft: { drugName: string; dosage: string; frequency: string; startDate: Date }
) {
  const dDay = daysBetweenCalendarDates(draft.startDate, new Date());
  setBriefingData((current) => ({
    ...current,
    antibiotics: upsertBriefingItem(
      current.antibiotics,
      {
        patientId: patient.id,
        patientName: patient.name,
        roomBed: patient.roomBed,
        medicationId,
        drugName: draft.drugName,
        dosage: draft.dosage || undefined,
        frequency: draft.frequency || undefined,
        dDay,
        isLongTerm: dDay >= 14,
        startDate: draft.startDate,
      },
      'medicationId'
    ),
  }));
}

export function applyOptimisticRemoveAntibiotic(
  setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  medicationId: string
) {
  setBriefingData((current) => ({
    ...current,
    antibiotics: removeBriefingItemByKey(current.antibiotics, 'medicationId', medicationId),
  }));
}

export function applyOptimisticLab(
  setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  patient: Patient,
  _labId: string,
  draft: { itemName: string; flag?: 'H' | 'L'; testDate: Date }
) {
  const dateKey = formatDateInput(draft.testDate);
  setBriefingData((current) => {
    const existing = current.recentLabs.find(
      (item) => item.patientId === patient.id && item.dateKey === dateKey
    );
    const optimisticItem = draft.flag ? `${draft.itemName} ${draft.flag}` : draft.itemName;
    const nextSummary = existing
      ? {
          ...existing,
          totalItems: existing.totalItems + 1,
          abnormalCount: existing.abnormalCount + (draft.flag ? 1 : 0),
          abnormalItems: draft.flag
            ? [
                optimisticItem,
                ...existing.abnormalItems.filter((item) => item !== optimisticItem),
              ].slice(0, 5)
            : existing.abnormalItems,
        }
      : {
          patientId: patient.id,
          patientName: patient.name,
          roomBed: patient.roomBed,
          dateKey,
          abnormalCount: draft.flag ? 1 : 0,
          abnormalItems: draft.flag ? [optimisticItem] : [],
          totalItems: 1,
        };

    return {
      ...current,
      recentLabs: upsertBriefingItem(
        current.recentLabs,
        nextSummary,
        (item) => `${item.patientId}|${item.dateKey}`
      ).sort((a, b) => {
        if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
        return a.roomBed.localeCompare(b.roomBed, 'ko-KR', { numeric: true });
      }),
    };
  });
}

export function applyOptimisticRemoveLab(
  _setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  _patientId: string | undefined,
  _labId: string
) {
  // Lab summaries do not carry individual result IDs, so the precise removal is confirmed by refresh.
}

export function formatParsedMedicationSchedule(schedule: string) {
  const normalized = schedule.trim();
  if (!normalized) return '';
  const count = normalized.split(',').filter(Boolean).length;
  return count > 0 ? `#${count} ${normalized}` : normalized;
}

export function applyOptimisticSchedule(
  setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  patient: Patient,
  scheduleId: string,
  schedule: { title: string; category: string; scheduledTime?: string }
) {
  setBriefingData((current) => ({
    ...current,
    todaySchedules: upsertBriefingItem(
      current.todaySchedules,
      {
        patientId: patient.id,
        patientName: patient.name,
        roomBed: patient.roomBed,
        scheduleId,
        title: schedule.title,
        category: schedule.category,
        scheduledTime: schedule.scheduledTime,
        isCompleted: false,
      },
      'scheduleId'
    ).sort((a, b) =>
      (a.scheduledTime || '').localeCompare(b.scheduledTime || '', 'ko-KR', { numeric: true })
    ),
  }));
}

export function applyOptimisticRemoveSchedule(
  setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  scheduleId: string
) {
  setBriefingData((current) => ({
    ...current,
    todaySchedules: removeBriefingItemByKey(current.todaySchedules, 'scheduleId', scheduleId),
  }));
}

function removeBriefingItemsByPatient<T extends { patientId: string }>(
  items: T[],
  patientId: string
) {
  if (!items.some((item) => item.patientId === patientId)) return items;
  return items.filter((item) => item.patientId !== patientId);
}

function removeBriefingItemByKey<T, K extends keyof T>(items: T[], key: K, value: T[K]) {
  if (!items.some((item) => item[key] === value)) return items;
  return items.filter((item) => item[key] !== value);
}

function upsertBriefingItem<T>(items: T[], nextItem: T, key: keyof T | ((item: T) => string)) {
  const getKey = typeof key === 'function' ? key : (item: T) => String(item[key]);
  const nextKey = getKey(nextItem);
  let replaced = false;
  const nextItems = items.map((item) => {
    if (getKey(item) !== nextKey) return item;
    replaced = true;
    return nextItem;
  });

  return replaced ? nextItems : [nextItem, ...items];
}
