import type { Patient } from '@/types/patient';
import type { LabResult } from '@/types/lab';
import type { BriefingData } from '@/services/briefingService';
import type { ChartingCopyFormat } from '@/types/charting';
import { formatChartingForCopy } from '@/services/chartingFormatter';
import { DEFAULT_LAB_CATEGORIES, labCategoryService } from '@/services/labCategoryService';
import { getLabReferenceByName } from '@/utils/labReference';
import { formatDateInput, formatOnsetElapsedText } from '../clinical/dateLabels';
import type { ChartingDraft } from './types';
import type { WorkspaceTabId } from './WorkspaceTabs';

export type StandardLabItemOption = {
  name: string;
  category: string;
  code?: string;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
};

export function createChartingDraft(patient: Patient): ChartingDraft {
  return {
    chiefComplaint: patient.chiefComplaint,
    onset: patient.onset,
    presentIllness: patient.presentIllness,
    pastHistory: patient.pastHistory,
    reviewOfSystem: patient.reviewOfSystem,
    physicalExam: patient.physicalExam,
    problemListText: patient.problemList.join('\n'),
    plan: patient.plan,
    guardianExplanation: patient.guardianExplanation,
    etc: patient.etc,
  };
}

export function buildTabBadges(
  patientId: string,
  data: BriefingData
): Partial<Record<WorkspaceTabId, number>> {
  let lab = 0;
  let medications = 0;
  let notes = 0;
  let schedule = 0;

  for (const item of data.recentLabs) {
    if (item.patientId === patientId && item.abnormalCount > 0) lab++;
  }
  for (const item of data.antibiotics) {
    if (item.patientId === patientId) medications++;
  }
  for (const item of data.reminders) {
    if (item.patientId === patientId) notes++;
  }
  for (const item of data.progressNotes) {
    if (item.patientId === patientId) notes++;
  }
  for (const item of data.todaySchedules) {
    if (item.patientId === patientId && !item.isCompleted) schedule++;
  }

  return { lab, medications, notes, schedule };
}

export function getPatientRows(patientId: string, data: BriefingData) {
  const reminders: BriefingData['reminders'] = [];
  const antibiotics: BriefingData['antibiotics'] = [];
  const labs: BriefingData['recentLabs'] = [];
  const schedules: BriefingData['todaySchedules'] = [];

  for (const item of data.reminders) {
    if (item.patientId === patientId) reminders.push(item);
  }
  for (const item of data.antibiotics) {
    if (item.patientId === patientId) antibiotics.push(item);
  }
  for (const item of data.recentLabs) {
    if (item.patientId === patientId && item.abnormalCount > 0) labs.push(item);
  }
  for (const item of data.todaySchedules) {
    if (item.patientId === patientId && !item.isCompleted) schedules.push(item);
  }

  return {
    reminders,
    antibiotics,
    labs,
    schedules,
    queue: [
      ...reminders.map((item) => ({
        key: item.noteId,
        prefix: '알림',
        title: item.content,
        detail: item.roomBed,
        tab: 'notes' as WorkspaceTabId,
        tone: 'warning' as const,
      })),
      ...schedules.map((item) => ({
        key: item.scheduleId,
        prefix: item.scheduledTime ?? '일정',
        title: item.title,
        detail: item.category,
        tab: 'schedule' as WorkspaceTabId,
        tone: 'default' as const,
      })),
      ...antibiotics.map((item) => ({
        key: item.medicationId,
        prefix: `D+${item.dDay}`,
        title: item.drugName,
        detail: `${item.dosage ?? ''} ${item.frequency ?? ''}`.trim(),
        tab: 'medications' as WorkspaceTabId,
        tone: item.isLongTerm ? ('danger' as const) : ('warning' as const),
      })),
      ...labs.map((item) => ({
        key: `${item.patientId}-${item.dateKey}`,
        prefix: 'Lab',
        title: item.abnormalItems.join(', '),
        detail: item.dateKey,
        tab: 'lab' as WorkspaceTabId,
        tone: 'danger' as const,
      })),
    ],
  };
}

export function buildHandoffLines(patient: Patient, rows: ReturnType<typeof getPatientRows>) {
  const onsetElapsed = formatOnsetElapsedText(patient.onset);
  return [
    `${patient.roomBed} ${patient.name} ${patient.sex}`,
    patient.chiefComplaint &&
      `C/C: ${patient.chiefComplaint}${onsetElapsed ? ` (${onsetElapsed})` : ''}`,
    patient.problemList.length > 0 && `Problems: ${patient.problemList.join(', ')}`,
    patient.presentIllness && `PI: ${patient.presentIllness}`,
    patient.plan && `Plan: ${patient.plan}`,
    rows.reminders.length > 0 && `알림: ${rows.reminders.map((item) => item.content).join(' / ')}`,
    rows.schedules.length > 0 &&
      `일정: ${rows.schedules
        .map((item) => `${item.scheduledTime ? `${item.scheduledTime} ` : ''}${item.title}`)
        .join(' / ')}`,
    rows.antibiotics.length > 0 &&
      `항생제: ${rows.antibiotics.map((item) => `${item.drugName} D+${item.dDay}`).join(' / ')}`,
    rows.labs.length > 0 &&
      `Lab: ${rows.labs.map((item) => item.abnormalItems.join(', ')).join(' / ')}`,
  ].filter(Boolean) as string[];
}

/**
 * 차팅 초안을 OCS 복사 텍스트로 변환한다.
 * 설정 > 차팅 설정(`useChartingSettingsStore`)의 복사 포맷을 그대로 따른다.
 */
export function buildChartingCopy(draft: ChartingDraft, format?: ChartingCopyFormat) {
  return formatChartingForCopy(
    {
      chiefComplaint: draft.chiefComplaint,
      onset: draft.onset,
      presentIllness: draft.presentIllness,
      pastHistory: draft.pastHistory,
      reviewOfSystem: draft.reviewOfSystem,
      physicalExam: draft.physicalExam,
      problemList: draft.problemListText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      plan: draft.plan,
      guardianExplanation: draft.guardianExplanation,
      etc: draft.etc,
    },
    format
  );
}

export function buildSoapContext(
  patient: Patient,
  data: BriefingData,
  draftNote: string,
  progressNotes: Array<{ content: string }>
) {
  const noteLines = [
    draftNote.trim() && `[작성 중]\n${draftNote.trim()}`,
    ...progressNotes
      .slice(0, 5)
      .map((item) => item.content.trim())
      .filter(Boolean),
  ].filter(Boolean);

  return {
    patientName: patient.name,
    chiefComplaint: patient.chiefComplaint,
    onset: patient.onset,
    progressNote: noteLines.join('\n\n'),
    currentMedications: buildMedicationLines(patient.id, data).join('\n'),
    recentLab: buildLabLines(patient.id, data).join('\n'),
  };
}

export function buildMedicationLines(patientId: string, data: BriefingData) {
  return data.antibiotics
    .filter((item) => item.patientId === patientId)
    .map((item) =>
      [
        item.drugName,
        item.dosage,
        item.frequency,
        `D+${item.dDay}`,
        item.endDate ? `until ${formatDateInput(item.endDate)}` : '',
      ]
        .filter(Boolean)
        .join(' ')
    );
}

export function buildLabLines(patientId: string, data: BriefingData, limit = 5) {
  return data.recentLabs
    .filter((item) => item.patientId === patientId)
    .slice(0, limit)
    .map((item) =>
      [
        item.dateKey,
        item.abnormalItems.length > 0
          ? item.abnormalItems.join(', ')
          : `abnormal 0/${item.totalItems}`,
      ].join(': ')
    );
}

export interface LabValueTableRow {
  name: string;
  code?: string;
  category: string;
  displayOrder: number;
  unit: string;
  referenceText: string;
  values: Map<string, { value: string | number; flag?: 'H' | 'L' }>;
}

export function buildLabValueTable(labs: LabResult[], extraDateKey?: string) {
  const dates = Array.from(
    new Set([
      ...labs.map((lab) => formatDateInput(lab.testDate)),
      ...(extraDateKey ? [extraDateKey] : []),
    ])
  ).sort((a, b) => b.localeCompare(a));
  const dateLabIds = new Map<string, string[]>();
  const rows = new Map<string, LabValueTableRow>();
  const displayOrderMap = labCategoryService.buildDisplayOrderMap(DEFAULT_LAB_CATEGORIES);
  const categoryOrderMap = new Map(
    DEFAULT_LAB_CATEGORIES.map((category) => [category.name, category.order])
  );

  for (const lab of labs) {
    const date = formatDateInput(lab.testDate);
    dateLabIds.set(date, [...(dateLabIds.get(date) ?? []), lab.id]);
    for (const item of lab.items) {
      const orderEntry = displayOrderMap.get(item.name.toLowerCase());
      const category = orderEntry?.category ?? lab.category;
      const fallbackOrder = (categoryOrderMap.get(category) ?? 99) * 1000 + 999;
      const reference = getLabReferenceByName(item.name);
      const referenceText = formatLabReferenceRange(
        item.referenceMin ?? reference?.referenceMin,
        item.referenceMax ?? reference?.referenceMax,
        reference?.referenceText
      );
      const row = rows.get(item.name) ?? {
        name: item.name,
        code: item.code ?? reference?.code,
        category,
        displayOrder: orderEntry?.order ?? fallbackOrder,
        unit: item.unit,
        referenceText,
        values: new Map(),
      };
      if (!row.unit && item.unit) row.unit = item.unit;
      if (!row.code) row.code = item.code ?? reference?.code;
      if (!row.referenceText) row.referenceText = referenceText;
      row.values.set(date, { value: item.value, flag: item.hlFlag });
      rows.set(item.name, row);
    }
  }

  return {
    dates,
    dateLabIds,
    itemRows: Array.from(rows.values()).sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
      return a.name.localeCompare(b.name, 'ko-KR');
    }),
  };
}

export function formatLabReferenceRange(min?: number, max?: number, text?: string) {
  if (text) return text;
  if (min !== undefined && max !== undefined) return `${min}-${max}`;
  if (min !== undefined) return `>=${min}`;
  if (max !== undefined) return `<=${max}`;
  return '';
}

export function buildStandardLabItemOptions(): StandardLabItemOption[] {
  const seen = new Set<string>();
  const options: StandardLabItemOption[] = [];

  for (const category of DEFAULT_LAB_CATEGORIES) {
    if (category.name === 'Culture') continue;

    for (const name of category.items) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const reference = getLabReferenceByName(name);
      options.push({
        name,
        category: category.name,
        code: reference?.code,
        unit: reference?.unit ?? '',
        referenceMin: reference?.referenceMin,
        referenceMax: reference?.referenceMax,
      });
    }
  }

  return options;
}
