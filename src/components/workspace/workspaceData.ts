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

/** SOAP 초안의 A) 섹션에 쓰는 Problem List 접두사. */
const ASSESSMENT_PREFIX = '#. ';

/** "HTN" → "#. HTN". 이미 접두사가 붙어 있으면 덧붙이지 않는다. */
export function formatAssessmentProblem(problem: string): string {
  const text = problem.trim().replace(/^[#•\-*]+\s*\d*\.?\s*/, '');
  return text ? `${ASSESSMENT_PREFIX}${text}` : '';
}

/**
 * SOAP 초안의 A) 섹션에 Problem 한 줄을 끼워 넣는다.
 *
 * A)와 P) 사이가 Assessment 구간이다. P) 앞에 붙여야 순서가 깨지지 않는다.
 * 같은 문제가 이미 있으면 그대로 둔다 — 누르는 실수로 중복이 쌓이지 않게.
 * A) 섹션이 없으면 초안 끝에 만들어 붙인다.
 */
export function insertAssessmentProblem(draft: string, problem: string): string {
  const line = formatAssessmentProblem(problem);
  if (!line) return draft;

  const lines = draft.replace(/\r\n/g, '\n').split('\n');
  const startIndex = lines.findIndex((text) => /^\s*A\)/.test(text));

  if (startIndex === -1) {
    const base = draft.trimEnd();
    return base ? `${base}\n\nA)\n${line}` : `A)\n${line}`;
  }

  let endIndex = lines.findIndex((text, index) => index > startIndex && /^\s*P\)/.test(text));
  if (endIndex === -1) endIndex = lines.length;

  const section = lines.slice(startIndex, endIndex);
  const normalized = line.toLowerCase();
  if (section.some((text) => text.trim().toLowerCase() === normalized)) return draft;

  // 섹션 끝의 빈 줄 앞에 넣어야 P)와 붙어 버리지 않는다.
  let insertAt = endIndex;
  while (insertAt > startIndex + 1 && !lines[insertAt - 1]!.trim()) insertAt--;

  return [...lines.slice(0, insertAt), line, ...lines.slice(insertAt)].join('\n');
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
    problemList: patient.problemList.filter((item) => item.trim()).join('\n'),
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

export interface NoteDateGroup {
  /** YYYY-MM-DD */
  dateKey: string;
  notes: Array<{ id: string; type: 'progress' | 'reminder'; content: string; alertDate?: Date }>;
}

/**
 * 메모를 날짜별로 묶는다 — 최근 날짜가 위로.
 *
 * 경과기록은 작성일 기준, 알림은 **알림 날짜** 기준으로 묶는다.
 * 알림은 "언제 띄울 것인가"가 본래 의미라, 적어 둔 날이 아니라 뜨는 날에 있어야 찾기 쉽다.
 */
export function groupNotesByDate(
  notes: Array<{
    id: string;
    type: 'progress' | 'reminder';
    content: string;
    alertDate?: Date;
    createdAt: Date;
  }>
): NoteDateGroup[] {
  const groups = new Map<string, NoteDateGroup>();

  for (const note of notes) {
    const basis = note.type === 'reminder' ? (note.alertDate ?? note.createdAt) : note.createdAt;
    const dateKey = formatDateInput(basis);
    const group = groups.get(dateKey) ?? { dateKey, notes: [] };
    group.notes.push({
      id: note.id,
      type: note.type,
      content: note.content,
      alertDate: note.alertDate,
    });
    groups.set(dateKey, group);
  }

  return [...groups.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

/**
 * 메모 묶음을 최근 N개까지만 남긴다 — 입원이 길어지면 목록이 한없이 길어진다.
 *
 * 날짜 묶음은 쪼개지 않는다. 같은 날 메모가 중간에서 잘리면 "그 날 전부"인지
 * 알 수 없기 때문에, 한도를 넘더라도 그 날짜까지는 통째로 보여준다.
 */
export function limitNoteGroups(
  groups: NoteDateGroup[],
  limit: number
): { groups: NoteDateGroup[]; hiddenCount: number } {
  if (limit <= 0) return { groups: [], hiddenCount: groups.reduce((sum, g) => sum + g.notes.length, 0) };

  const visible: NoteDateGroup[] = [];
  let shown = 0;

  for (const group of groups) {
    if (shown >= limit) break;
    visible.push(group);
    shown += group.notes.length;
  }

  const total = groups.reduce((sum, group) => sum + group.notes.length, 0);
  return { groups: visible, hiddenCount: total - shown };
}
