import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppShellV2,
  PatientWorkspace,
  TodayDashboard,
  daysBetweenDates,
  formatAgeYears,
  formatClockTime,
  formatDateInput,
  formatDetailedAge,
  isDateInRange,
  parseDateInput,
  type ChartingDraft,
  type PatientWorkspaceManualLab,
  type PatientWorkspaceInteractionState,
  type WorkspaceTabId,
} from '@/components/v2';
import type { Patient } from '@/db/database';
import type { BriefingData } from '@/services/briefingService';

const today = new Date();
const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
const previewStorageKey = 'wardflow:v2-preview-state';
const previewStorageVersion = 1;

interface QuickAddDraft {
  roomBed: string;
  name: string;
  registrationNumber: string;
  birthDate: string;
  attendingPhysician: string;
  tagsText: string;
  sex: 'M' | 'F';
  patientType: 'admitted' | 'consult';
}

interface AntibioticDraft {
  drugName: string;
  dosage: string;
  frequency: string;
  startDate: string;
}

interface LabDraft {
  itemName: string;
  value: string;
  unit: string;
  flag: '' | 'H' | 'L';
  dateKey: string;
}

const defaultQuickAddDraft: QuickAddDraft = {
  roomBed: '303',
  name: '',
  registrationNumber: '',
  birthDate: '1965-01-01',
  attendingPhysician: '재활의학과',
  tagsText: '',
  sex: 'F',
  patientType: 'admitted',
};

type PersistedAntibioticItem = Omit<
  BriefingData['antibiotics'][number],
  'startDate' | 'endDate'
> & {
  startDate: string;
  endDate?: string;
};

interface PreviewChangeSummaryItem {
  label: string;
  count: number;
}

interface PreviewPersistedState {
  version: number;
  savedAt: string;
  patients: Array<
    Omit<Patient, 'birthDate' | 'admissionDate' | 'dischargeDate' | 'createdAt' | 'updatedAt'> & {
      birthDate: string;
      admissionDate: string;
      dischargeDate?: string;
      createdAt: string;
      updatedAt: string;
    }
  >;
  selectedPatientId: string | null;
  selectedTab: WorkspaceTabId;
  lastTabsByPatient: Record<string, WorkspaceTabId>;
  chartingDrafts: Record<string, ChartingDraft>;
  interactionState: Record<string, PatientWorkspaceInteractionState>;
  reminders: BriefingData['reminders'];
  progressNotes: BriefingData['progressNotes'];
  customAntibiotics: PersistedAntibioticItem[];
  manualLabs: PatientWorkspaceManualLab[];
  customTodaySchedules: BriefingData['todaySchedules'];
  completedScheduleIds: string[];
}

function dateKey(date: Date) {
  return formatDateInput(date);
}

function safeDateKey(value: string) {
  const parsed = parseDateInput(value);
  return parsed ? formatDateInput(parsed) : dateKey(today);
}

function createPreviewId(prefix: string) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}-${Date.now()}-${random}`;
}

function normalizeClockTime(value?: string) {
  if (!value) return undefined;
  const match = value.trim().match(/^(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return undefined;

  const hour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return undefined;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeKeyPart(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

function createBasePatient(): Omit<
  Patient,
  | 'id'
  | 'registrationNumber'
  | 'name'
  | 'birthDate'
  | 'sex'
  | 'roomBed'
  | 'admissionDate'
  | 'patientType'
> {
  return {
    attendingPhysician: '재활의학과',
    status: 'active',
    createdBy: 'preview',
    chiefComplaint: '',
    onset: '',
    presentIllness: '',
    pastHistory: '',
    reviewOfSystem: '',
    physicalExam: '',
    problemList: [],
    plan: '',
    guardianExplanation: '',
    etc: '',
    createdAt: today,
    updatedAt: today,
  };
}

const previewPatients: Patient[] = [
  {
    ...createBasePatient(),
    id: 'preview-p1',
    registrationNumber: '24001531',
    name: '김서연',
    birthDate: new Date(1948, 4, 12),
    sex: 'F',
    roomBed: '301-1',
    admissionDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8),
    patientType: 'admitted',
    tags: ['#aspiration', '#DM'],
    attention: true,
    chiefComplaint: '연하곤란 및 반복 흡인',
    onset: '2026-05-14',
    presentIllness: '폐렴 치료 후 흡인 위험 지속되어 재활 및 연하 평가 위해 입원.',
    pastHistory: 'DM, HTN, old CVA',
    reviewOfSystem: 'Fever(-), dyspnea(-), sputum mild',
    physicalExam: 'Chest coarse breathing sound, Lt side weakness G4',
    problemList: ['Aspiration pneumonia', 'Post-stroke dysphagia', 'Diabetes mellitus'],
    plan: 'VFSS 확인 후 식이 단계 조정. 항생제 D14 시점 재평가.',
    guardianExplanation: '흡인 위험과 식이 조절 필요성 설명함.',
  },
  {
    ...createBasePatient(),
    id: 'preview-p2',
    registrationNumber: '24001820',
    name: '박민준',
    birthDate: new Date(1961, 9, 3),
    sex: 'M',
    roomBed: '302',
    admissionDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
    patientType: 'admitted',
    chiefComplaint: '보행 불안정',
    presentIllness: '우측 무릎 통증 및 균형 저하로 재활치료 진행 중.',
    physicalExam: 'Rt knee tenderness, gait unstable with walker',
    problemList: ['Gait disturbance', 'Right knee pain'],
    plan: '통증 조절하며 보행 훈련 지속. 낙상 주의.',
  },
  {
    ...createBasePatient(),
    id: 'preview-p3',
    registrationNumber: '24001904',
    name: '이하늘',
    birthDate: new Date(1955, 1, 27),
    sex: 'F',
    roomBed: '협진',
    admissionDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
    patientType: 'consult',
    chiefComplaint: '연하 평가 의뢰',
    presentIllness: '내과 입원 중 기침 및 사레 반복되어 협진 의뢰.',
    problemList: ['Dysphagia evaluation'],
    plan: '오늘 오후 연하 평가 예정.',
  },
];

const previewDataBase: Omit<BriefingData, 'patientSummary'> = {
  reminders: [
    {
      patientId: 'preview-p1',
      patientName: '김서연',
      roomBed: '301-1',
      noteId: 'preview-r1',
      content: '오전 회진 전 보호자 설명 필요',
    },
  ],
  progressNotes: [
    {
      patientId: 'preview-p2',
      patientName: '박민준',
      roomBed: '302',
      noteId: 'preview-n1',
      content: '보행 훈련 후 우측 무릎 통증 호소',
    },
  ],
  antibiotics: [
    {
      patientId: 'preview-p1',
      patientName: '김서연',
      roomBed: '301-1',
      medicationId: 'preview-m1',
      drugName: 'Piperacillin/Tazobactam',
      dosage: '4.5g',
      frequency: '#4',
      dDay: 13,
      isLongTerm: true,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13),
    },
  ],
  recentLabs: [
    {
      patientId: 'preview-p1',
      patientName: '김서연',
      roomBed: '301-1',
      dateKey: dateKey(today),
      abnormalCount: 2,
      abnormalItems: ['WBC H', 'CRP H'],
      totalItems: 18,
    },
    {
      patientId: 'preview-p2',
      patientName: '박민준',
      roomBed: '302',
      dateKey: dateKey(yesterday),
      abnormalCount: 0,
      abnormalItems: [],
      totalItems: 16,
    },
  ],
  todaySchedules: [
    {
      patientId: 'preview-p3',
      patientName: '이하늘',
      roomBed: '협진',
      scheduleId: 'preview-s1',
      title: '연하 평가',
      category: '검사',
      scheduledTime: '14:00',
      isCompleted: false,
    },
  ],
};

const workspaceTabs: WorkspaceTabId[] = [
  'overview',
  'charting',
  'lab',
  'medications',
  'notes',
  'schedule',
];

function toWorkspaceTab(tab?: string): WorkspaceTabId {
  return workspaceTabs.includes(tab as WorkspaceTabId) ? (tab as WorkspaceTabId) : 'overview';
}

function matchesPatientQuery(patient: Patient, normalizedQuery: string) {
  return [
    patient.roomBed,
    patient.name,
    patient.registrationNumber,
    patient.chiefComplaint,
    patient.presentIllness,
    patient.attendingPhysician,
    ...(patient.tags ?? []),
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

function splitProblemList(problemListText: string) {
  return problemListText
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTags(tagsText: string) {
  return tagsText
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
}

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;

  return left.every((item, index) => item === right[index]);
}

function serializeAntibiotic(item: BriefingData['antibiotics'][number]): PersistedAntibioticItem {
  return {
    ...item,
    startDate: item.startDate.toISOString(),
    endDate: item.endDate?.toISOString(),
  };
}

function restoreAntibiotic(item: PersistedAntibioticItem): BriefingData['antibiotics'][number] {
  return {
    ...item,
    startDate: new Date(item.startDate),
    endDate: item.endDate ? new Date(item.endDate) : undefined,
  };
}

function buildManualLabSummaries(
  labs: PatientWorkspaceManualLab[],
  patientMap: Map<string, Patient>
): BriefingData['recentLabs'] {
  const groups = new Map<string, BriefingData['recentLabs'][number]>();

  for (const lab of labs) {
    const patient = patientMap.get(lab.patientId);
    if (!patient) continue;

    const key = `${lab.patientId}-${lab.dateKey}`;
    const group =
      groups.get(key) ??
      ({
        patientId: lab.patientId,
        patientName: patient.name,
        roomBed: patient.roomBed,
        dateKey: lab.dateKey,
        abnormalCount: 0,
        abnormalItems: [],
        totalItems: 0,
      } satisfies BriefingData['recentLabs'][number]);

    group.totalItems += 1;
    if (lab.flag) {
      group.abnormalCount += 1;
      group.abnormalItems = [...group.abnormalItems, `${lab.itemName} ${lab.flag}`].slice(0, 5);
    }

    groups.set(key, group);
  }

  return Array.from(groups.values());
}

function mergeLabSummaries(
  base: BriefingData['recentLabs'],
  added: BriefingData['recentLabs']
): BriefingData['recentLabs'] {
  const groups = new Map<string, BriefingData['recentLabs'][number]>();

  for (const item of [...base, ...added]) {
    const key = `${item.patientId}-${item.dateKey}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...item, abnormalItems: [...item.abnormalItems] });
      continue;
    }

    existing.abnormalCount += item.abnormalCount;
    existing.totalItems += item.totalItems;
    existing.abnormalItems = [...existing.abnormalItems, ...item.abnormalItems].slice(0, 5);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
    return a.roomBed.localeCompare(b.roomBed, 'ko-KR', { numeric: true });
  });
}

function serializePatient(patient: Patient): PreviewPersistedState['patients'][number] {
  return {
    ...patient,
    birthDate: patient.birthDate.toISOString(),
    admissionDate: patient.admissionDate.toISOString(),
    dischargeDate: patient.dischargeDate?.toISOString(),
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}

function restorePatient(patient: PreviewPersistedState['patients'][number]): Patient {
  return {
    ...patient,
    birthDate: new Date(patient.birthDate),
    admissionDate: new Date(patient.admissionDate),
    dischargeDate: patient.dischargeDate ? new Date(patient.dischargeDate) : undefined,
    createdAt: new Date(patient.createdAt),
    updatedAt: new Date(patient.updatedAt),
  };
}

function buildPreviewChangeSummary({
  patientsChanged,
  patients,
  chartingDrafts,
  interactionState,
  reminders,
  progressNotes,
  customAntibiotics,
  manualLabs,
  customTodaySchedules,
  completedScheduleIds,
}: {
  patientsChanged: boolean;
  patients: Patient[];
  chartingDrafts: Record<string, ChartingDraft>;
  interactionState: Record<string, PatientWorkspaceInteractionState>;
  reminders: BriefingData['reminders'];
  progressNotes: BriefingData['progressNotes'];
  customAntibiotics: BriefingData['antibiotics'];
  manualLabs: PatientWorkspaceManualLab[];
  customTodaySchedules: BriefingData['todaySchedules'];
  completedScheduleIds: string[];
}): PreviewChangeSummaryItem[] {
  const interactionCount = countInteractionStateValues(interactionState);
  const newPatientCount = patients.filter((patient) => patient.id.startsWith('preview-new-')).length;
  const dischargedCount = patients.filter((patient) => patient.status === 'discharged').length;

  return [
    patientsChanged
      ? { label: newPatientCount > 0 ? '환자/정보' : '환자정보', count: Math.max(1, newPatientCount + dischargedCount) }
      : null,
    { label: '차팅', count: Object.keys(chartingDrafts).length },
    { label: '알림', count: reminders.length },
    { label: '메모', count: progressNotes.length },
    { label: '항생제', count: customAntibiotics.length },
    { label: 'Lab', count: manualLabs.length },
    { label: '일정', count: customTodaySchedules.length },
    { label: '완료', count: completedScheduleIds.length },
    { label: '검토', count: interactionCount },
  ].filter((item): item is PreviewChangeSummaryItem => Boolean(item && item.count > 0));
}

function countInteractionStateValues(
  interactionState: Record<string, PatientWorkspaceInteractionState>
) {
  return Object.values(interactionState).reduce(
    (sum, state) =>
      sum +
      (state.reviewedLabImports?.length ?? 0) +
      (state.pausedMedications?.length ?? 0) +
      (state.acceptedMedicationImports?.length ?? 0) +
      (state.completedUpcomingSchedules?.length ?? 0),
    0
  );
}

function hasInteractionStateValue(state?: PatientWorkspaceInteractionState) {
  if (!state) return false;
  return (
    (state.reviewedLabImports?.length ?? 0) > 0 ||
    (state.pausedMedications?.length ?? 0) > 0 ||
    (state.acceptedMedicationImports?.length ?? 0) > 0 ||
    (state.completedUpcomingSchedules?.length ?? 0) > 0 ||
    (state.completedTodaySchedules?.length ?? 0) > 0
  );
}

function arePatientListsEqual(left: Patient[], right: Patient[]) {
  if (left.length !== right.length) return false;

  const rightById = new Map(right.map((patient) => [patient.id, patient]));

  return left.every((patient) => {
    const base = rightById.get(patient.id);
    if (!base) return false;

    return (
      patient.registrationNumber === base.registrationNumber &&
      patient.name === base.name &&
      patient.birthDate.getTime() === base.birthDate.getTime() &&
      patient.sex === base.sex &&
      patient.roomBed === base.roomBed &&
      patient.patientType === base.patientType &&
      patient.attendingPhysician === base.attendingPhysician &&
      patient.status === base.status &&
      patient.dischargeDate?.getTime() === base.dischargeDate?.getTime() &&
      Boolean(patient.attention) === Boolean(base.attention) &&
      areStringArraysEqual(patient.tags ?? [], base.tags ?? []) &&
      patient.chiefComplaint === base.chiefComplaint &&
      patient.onset === base.onset &&
      patient.presentIllness === base.presentIllness &&
      patient.pastHistory === base.pastHistory &&
      patient.reviewOfSystem === base.reviewOfSystem &&
      patient.physicalExam === base.physicalExam &&
      areStringArraysEqual(patient.problemList, base.problemList) &&
      patient.plan === base.plan &&
      patient.guardianExplanation === base.guardianExplanation &&
      patient.etc === base.etc
    );
  });
}

function isPatientChangedFromBase(patient: Patient, base?: Patient) {
  if (!base) return true;

  return !arePatientListsEqual([patient], [base]);
}

function buildChangedPatientIds({
  patients,
  chartingDrafts,
  interactionState,
  reminders,
  progressNotes,
  customAntibiotics,
  manualLabs,
  customTodaySchedules,
  completedScheduleIds,
}: {
  patients: Patient[];
  chartingDrafts: Record<string, ChartingDraft>;
  interactionState: Record<string, PatientWorkspaceInteractionState>;
  reminders: BriefingData['reminders'];
  progressNotes: BriefingData['progressNotes'];
  customAntibiotics: BriefingData['antibiotics'];
  manualLabs: PatientWorkspaceManualLab[];
  customTodaySchedules: BriefingData['todaySchedules'];
  completedScheduleIds: string[];
}) {
  const changedIds = new Set<string>();
  const basePatientsById = new Map(previewPatients.map((patient) => [patient.id, patient]));

  for (const patient of patients) {
    if (isPatientChangedFromBase(patient, basePatientsById.get(patient.id))) {
      changedIds.add(patient.id);
    }
  }

  for (const patientId of Object.keys(chartingDrafts)) changedIds.add(patientId);
  for (const patientId of Object.keys(interactionState)) changedIds.add(patientId);
  for (const item of reminders) changedIds.add(item.patientId);
  for (const item of progressNotes) changedIds.add(item.patientId);
  for (const item of customAntibiotics) changedIds.add(item.patientId);
  for (const item of manualLabs) changedIds.add(item.patientId);
  for (const item of customTodaySchedules) changedIds.add(item.patientId);

  const schedulePatientById = new Map(
    [...customTodaySchedules, ...previewDataBase.todaySchedules].map((schedule) => [
      schedule.scheduleId,
      schedule.patientId,
    ])
  );
  for (const scheduleId of completedScheduleIds) {
    const patientId = schedulePatientById.get(scheduleId);
    if (patientId) changedIds.add(patientId);
  }

  return changedIds;
}

function buildChangedPatientDetail({
  patient,
  chartingDrafts,
  interactionState,
  reminders,
  progressNotes,
  customAntibiotics,
  manualLabs,
  customTodaySchedules,
  completedScheduleIds,
}: {
  patient: Patient;
  chartingDrafts: Record<string, ChartingDraft>;
  interactionState: Record<string, PatientWorkspaceInteractionState>;
  reminders: BriefingData['reminders'];
  progressNotes: BriefingData['progressNotes'];
  customAntibiotics: BriefingData['antibiotics'];
  manualLabs: PatientWorkspaceManualLab[];
  customTodaySchedules: BriefingData['todaySchedules'];
  completedScheduleIds: string[];
}) {
  const labels: string[] = [];
  const basePatient = previewPatients.find((candidate) => candidate.id === patient.id);
  const interaction = interactionState[patient.id];
  const scheduleIds = new Set(
    [...customTodaySchedules, ...previewDataBase.todaySchedules]
      .filter((schedule) => schedule.patientId === patient.id)
      .map((schedule) => schedule.scheduleId)
  );

  if (isPatientChangedFromBase(patient, basePatient)) labels.push('환자정보');
  if (chartingDrafts[patient.id]) labels.push('차팅');
  if (reminders.some((item) => item.patientId === patient.id)) labels.push('알림');
  if (progressNotes.some((item) => item.patientId === patient.id)) labels.push('메모');
  if (customAntibiotics.some((item) => item.patientId === patient.id)) labels.push('항생제');
  if (manualLabs.some((item) => item.patientId === patient.id)) labels.push('Lab');
  if (customTodaySchedules.some((item) => item.patientId === patient.id)) labels.push('일정');
  if (completedScheduleIds.some((scheduleId) => scheduleIds.has(scheduleId))) labels.push('완료');
  if (hasInteractionStateValue(interaction)) labels.push('검토');

  return labels.length > 0 ? labels.join(' / ') : `${patient.sex}/${formatAgeYears(patient.birthDate)}`;
}

function buildPreviewExportText({
  summary,
  changedPatients,
  savedAt,
}: {
  summary: PreviewChangeSummaryItem[];
  changedPatients: Array<{ patient: Patient; detail: string }>;
  savedAt?: Date | null;
}) {
  const lines = ['WardFlow v2 preview changes'];

  if (savedAt) lines.push(`Saved: ${formatClockTime(savedAt)}`);
  if (summary.length > 0) {
    lines.push(`Summary: ${summary.map((item) => `${item.label} ${item.count}`).join(', ')}`);
  }

  if (changedPatients.length > 0) {
    lines.push('Patients:');
    for (const { patient, detail } of changedPatients) {
      lines.push(`- ${patient.roomBed} ${patient.name} (${patient.registrationNumber}): ${detail}`);
    }
  }

  return lines.join('\n');
}

function readPreviewState(): PreviewPersistedState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(previewStorageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PreviewPersistedState;
    if (!Array.isArray(parsed.patients)) return null;
    if (parsed.version !== previewStorageVersion) return null;
    if (!workspaceTabs.includes(parsed.selectedTab)) parsed.selectedTab = 'overview';
    const patientIds = new Set(parsed.patients.map((patient) => patient.id));
    if (parsed.selectedPatientId && !patientIds.has(parsed.selectedPatientId)) {
      parsed.selectedPatientId = null;
      parsed.selectedTab = 'overview';
    }
    parsed.lastTabsByPatient = Object.fromEntries(
      Object.entries(parsed.lastTabsByPatient ?? {}).filter(
        ([patientId, tab]) => patientIds.has(patientId) && workspaceTabs.includes(tab)
      )
    );
    parsed.interactionState = pruneEmptyInteractionState(parsed.interactionState ?? {});

    return parsed;
  } catch {
    return null;
  }
}

function writePreviewState(state: PreviewPersistedState) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      previewStorageKey,
      JSON.stringify({
        ...state,
        version: previewStorageVersion,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Preview persistence is best-effort; Supabase remains the durable target.
  }
}

function clearPreviewState() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(previewStorageKey);
  } catch {
    // Preview persistence is best-effort; Supabase remains the durable target.
  }
}

function pruneEmptyInteractionState(
  interactionState: Record<string, PatientWorkspaceInteractionState>
) {
  return Object.fromEntries(
    Object.entries(interactionState)
      .map(([patientId, state]) => [patientId, normalizeInteractionState(state)] as const)
      .filter(([, state]) => hasInteractionStateValue(state))
  );
}

function normalizeInteractionState(state: PatientWorkspaceInteractionState) {
  const sortValues = (values?: string[]) =>
    values?.length ? [...values].sort((a, b) => a.localeCompare(b, 'ko-KR', { numeric: true })) : undefined;

  return {
    reviewedLabImports: sortValues(state.reviewedLabImports),
    pausedMedications: sortValues(state.pausedMedications),
    acceptedMedicationImports: sortValues(state.acceptedMedicationImports),
    completedUpcomingSchedules: sortValues(state.completedUpcomingSchedules),
    completedTodaySchedules: sortValues(state.completedTodaySchedules),
  } satisfies PatientWorkspaceInteractionState;
}

function sortStringValues(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, 'ko-KR', { numeric: true }));
}

export default function V2PreviewPage() {
  const navigate = useNavigate();
  const initialPreviewStateRef = useRef(readPreviewState());
  const lastPersistedStateRef = useRef<string | null>(null);
  const skipNextPreviewPersistRef = useRef(false);
  const previewHydratedRef = useRef(false);
  const [patients, setPatients] = useState<Patient[]>(
    () => initialPreviewStateRef.current?.patients.map(restorePatient) ?? previewPatients
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    () => initialPreviewStateRef.current?.selectedPatientId ?? null
  );
  const [selectedTab, setSelectedTab] = useState<WorkspaceTabId>(
    () => initialPreviewStateRef.current?.selectedTab ?? 'overview'
  );
  const [lastTabsByPatient, setLastTabsByPatient] = useState<Record<string, WorkspaceTabId>>(
    () => initialPreviewStateRef.current?.lastTabsByPatient ?? {}
  );
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaceUnsaved, setWorkspaceUnsaved] = useState(false);
  const [previewExportCopiedAt, setPreviewExportCopiedAt] = useState<Date | null>(null);
  const [previewSavedAt, setPreviewSavedAt] = useState<Date | null>(() =>
    initialPreviewStateRef.current?.savedAt ? new Date(initialPreviewStateRef.current.savedAt) : null
  );
  const [chartingDrafts, setChartingDrafts] = useState<Record<string, ChartingDraft>>(
    () => initialPreviewStateRef.current?.chartingDrafts ?? {}
  );
  const [interactionState, setInteractionState] = useState<
    Record<string, PatientWorkspaceInteractionState>
  >(() => initialPreviewStateRef.current?.interactionState ?? {});
  const [reminders, setReminders] = useState<BriefingData['reminders']>(
    () => initialPreviewStateRef.current?.reminders ?? []
  );
  const [progressNotes, setProgressNotes] = useState<BriefingData['progressNotes']>(
    () => initialPreviewStateRef.current?.progressNotes ?? []
  );
  const [customAntibiotics, setCustomAntibiotics] = useState<BriefingData['antibiotics']>(
    () => initialPreviewStateRef.current?.customAntibiotics?.map(restoreAntibiotic) ?? []
  );
  const [manualLabs, setManualLabs] = useState<PatientWorkspaceManualLab[]>(
    () => initialPreviewStateRef.current?.manualLabs ?? []
  );
  const [customTodaySchedules, setCustomTodaySchedules] = useState<BriefingData['todaySchedules']>(
    () => initialPreviewStateRef.current?.customTodaySchedules ?? []
  );
  const [completedScheduleIds, setCompletedScheduleIds] = useState<string[]>(
    () => initialPreviewStateRef.current?.completedScheduleIds ?? []
  );
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
  const editingPatient = patients.find((patient) => patient.id === editingPatientId);
  const patientsChanged = !arePatientListsEqual(patients, previewPatients);
  const changedPatientIds = useMemo(
    () =>
      buildChangedPatientIds({
        patients,
        chartingDrafts,
        interactionState,
        reminders,
        progressNotes,
        customAntibiotics,
        manualLabs,
        customTodaySchedules,
        completedScheduleIds,
      }),
    [
      patients,
      chartingDrafts,
      interactionState,
      reminders,
      progressNotes,
      customAntibiotics,
      manualLabs,
      customTodaySchedules,
      completedScheduleIds,
    ]
  );
  const previewChangeSummary = useMemo(
    () =>
      buildPreviewChangeSummary({
        patientsChanged,
        patients,
        chartingDrafts,
        interactionState,
        reminders,
        progressNotes,
        customAntibiotics,
        manualLabs,
        customTodaySchedules,
        completedScheduleIds,
      }),
    [
      patientsChanged,
      patients,
      chartingDrafts,
      interactionState,
      reminders,
      progressNotes,
      customAntibiotics,
      manualLabs,
      customTodaySchedules,
      completedScheduleIds,
    ]
  );
  const hasPreviewChanges =
    patientsChanged ||
    reminders.length > 0 ||
    progressNotes.length > 0 ||
    customAntibiotics.length > 0 ||
    manualLabs.length > 0 ||
    customTodaySchedules.length > 0 ||
    completedScheduleIds.length > 0 ||
    Object.keys(chartingDrafts).length > 0 ||
    countInteractionStateValues(interactionState) > 0;
  const changedPatients = useMemo(
    () =>
      patients
        .filter((patient) => changedPatientIds.has(patient.id))
        .sort((a, b) => a.roomBed.localeCompare(b.roomBed, 'ko-KR', { numeric: true })),
    [changedPatientIds, patients]
  );
  const changedPatientSummaries = useMemo(
    () =>
      changedPatients.map((patient) => ({
        patient,
        detail: buildChangedPatientDetail({
          patient,
          chartingDrafts,
          interactionState,
          reminders,
          progressNotes,
          customAntibiotics,
          manualLabs,
          customTodaySchedules,
          completedScheduleIds,
        }),
      })),
    [
      changedPatients,
      chartingDrafts,
      interactionState,
      reminders,
      progressNotes,
      customAntibiotics,
      manualLabs,
      customTodaySchedules,
      completedScheduleIds,
    ]
  );
  const previewExportText = useMemo(
    () =>
      buildPreviewExportText({
        summary: previewChangeSummary,
        changedPatients: changedPatientSummaries,
        savedAt: previewSavedAt,
      }),
    [changedPatientSummaries, previewChangeSummary, previewSavedAt]
  );

  useEffect(() => {
    setPreviewExportCopiedAt(null);
  }, [previewExportText]);

  useEffect(() => {
    if (selectedPatientId && !patients.some((patient) => patient.id === selectedPatientId)) {
      setSelectedPatientId(null);
      setSelectedTab('overview');
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (skipNextPreviewPersistRef.current) {
      skipNextPreviewPersistRef.current = false;
      return;
    }

    const nextState: PreviewPersistedState = {
      version: previewStorageVersion,
      savedAt: new Date().toISOString(),
      patients: patients.map(serializePatient),
      selectedPatientId,
      selectedTab,
      lastTabsByPatient,
      chartingDrafts,
      interactionState: pruneEmptyInteractionState(interactionState),
      reminders,
      progressNotes,
      customAntibiotics: customAntibiotics.map(serializeAntibiotic),
      manualLabs,
      customTodaySchedules,
      completedScheduleIds: sortStringValues(completedScheduleIds),
    };
    const serialized = JSON.stringify({
      ...nextState,
      savedAt: undefined,
    });

    if (!previewHydratedRef.current) {
      previewHydratedRef.current = true;
      lastPersistedStateRef.current = serialized;
      return;
    }

    if (serialized === lastPersistedStateRef.current) return;
    lastPersistedStateRef.current = serialized;
    writePreviewState(nextState);
    setPreviewSavedAt(new Date());
  }, [
    patients,
    selectedPatientId,
    selectedTab,
    lastTabsByPatient,
    chartingDrafts,
    interactionState,
    reminders,
    progressNotes,
    customAntibiotics,
    manualLabs,
    customTodaySchedules,
    completedScheduleIds,
  ]);

  const previewData: BriefingData = useMemo(
    () => {
      const activePatients = patients.filter((patient) => patient.status === 'active');
      const activePatientIds = new Set(activePatients.map((patient) => patient.id));
      const activePatientMap = new Map(activePatients.map((patient) => [patient.id, patient]));
      const activeOnly = <T extends { patientId: string }>(items: T[]) =>
        items.filter((item) => activePatientIds.has(item.patientId));
      const withPatientIdentity = <T extends { patientId: string; patientName: string; roomBed: string }>(
        items: T[]
      ) =>
        items.map((item) => {
          const patient = activePatientMap.get(item.patientId);
          return patient ? { ...item, patientName: patient.name, roomBed: patient.roomBed } : item;
        });
      const manualLabSummaries = buildManualLabSummaries(manualLabs, activePatientMap);

      return {
        ...previewDataBase,
        reminders: withPatientIdentity(activeOnly([...reminders, ...previewDataBase.reminders])),
        progressNotes: withPatientIdentity(activeOnly([...progressNotes, ...previewDataBase.progressNotes])),
        antibiotics: withPatientIdentity(activeOnly([...customAntibiotics, ...previewDataBase.antibiotics])),
        recentLabs: withPatientIdentity(
          mergeLabSummaries(activeOnly(previewDataBase.recentLabs), manualLabSummaries)
        ),
        todaySchedules: withPatientIdentity(
          activeOnly([...customTodaySchedules, ...previewDataBase.todaySchedules])
        ).map((schedule) => ({
            ...schedule,
            isCompleted: completedScheduleIds.includes(schedule.scheduleId) || schedule.isCompleted,
          })),
        patientSummary: {
          total: activePatients.length,
          admitted: activePatients.filter((patient) => patient.patientType === 'admitted').length,
          consult: activePatients.filter((patient) => patient.patientType === 'consult').length,
        },
      };
    },
    [
      patients,
      reminders,
      progressNotes,
      customAntibiotics,
      manualLabs,
      customTodaySchedules,
      completedScheduleIds,
    ]
  );

  const patientIndicators = useMemo(() => {
    const indicators: Record<
      string,
      {
        reminder?: boolean;
        schedule?: boolean;
        antibiotic?: boolean;
        lab?: boolean;
        changed?: boolean;
        changedDetail?: string;
      }
    > = {};

    for (const { patient, detail } of changedPatientSummaries) {
      indicators[patient.id] = { ...indicators[patient.id], changed: true, changedDetail: detail };
    }

    for (const item of previewData.reminders) {
      indicators[item.patientId] = { ...indicators[item.patientId], reminder: true };
    }

    for (const item of previewData.antibiotics) {
      indicators[item.patientId] = { ...indicators[item.patientId], antibiotic: true };
    }

    for (const item of previewData.todaySchedules) {
      if (!item.isCompleted) {
        indicators[item.patientId] = { ...indicators[item.patientId], schedule: true };
      }
    }

    for (const item of previewData.recentLabs) {
      if (item.abnormalCount > 0) {
        indicators[item.patientId] = { ...indicators[item.patientId], lab: true };
      }
    }

    return indicators;
  }, [changedPatientSummaries, previewData]);

  const searchResults = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return [];

    return patients
      .filter((patient) => matchesPatientQuery(patient, normalized))
      .sort((a, b) => a.roomBed.localeCompare(b.roomBed, 'ko-KR', { numeric: true }));
  }, [patients, searchQuery]);

  const activeMobileAction = selectedPatientId ? 'patients' : 'today';

  const confirmDiscardWorkspaceChanges = () =>
    !workspaceUnsaved || window.confirm('저장하지 않은 변경이 있습니다. 이동할까요?');

  const openPatient = (patientId: string, tab?: string) => {
    if (patientId !== selectedPatientId && !confirmDiscardWorkspaceChanges()) return false;
    const nextTab = tab ? toWorkspaceTab(tab) : lastTabsByPatient[patientId] ?? 'overview';
    setSelectedPatientId(patientId);
    setSelectedTab(nextTab);
    setLastTabsByPatient((current) => ({ ...current, [patientId]: nextTab }));
    setWorkspaceUnsaved(false);
    setSearchQuery('');
    return true;
  };

  const openToday = () => {
    if (!confirmDiscardWorkspaceChanges()) return false;
    setSelectedPatientId(null);
    setWorkspaceUnsaved(false);
    return true;
  };

  const updateSearchQuery = (value: string) => {
    if (value.trim() && selectedPatientId) {
      if (!confirmDiscardWorkspaceChanges()) return;
      setSelectedPatientId(null);
      setWorkspaceUnsaved(false);
    }

    setSearchQuery(value);
  };

  const openSettings = () => {
    if (!confirmDiscardWorkspaceChanges()) return;
    navigate('/settings');
  };

  const logoutPreview = () => {
    if (!confirmDiscardWorkspaceChanges()) return;
    navigate('/login');
  };

  const copyPreviewExport = async () => {
    if (!hasPreviewChanges) return;

    try {
      await navigator.clipboard.writeText(previewExportText);
      setPreviewExportCopiedAt(new Date());
    } catch {
      window.prompt('Preview changes', previewExportText);
    }
  };

  const openQuickAdd = () => {
    setQuickAddOpen(true);
  };

  const toggleAttention = (patientId: string) => {
    setPatients((current) =>
      current.map((patient) =>
        patient.id === patientId ? { ...patient, attention: !patient.attention } : patient
      )
    );
  };

  const syncPatientIdentity = (patient: Patient) => {
    const identity = {
      patientName: patient.name,
      roomBed: patient.roomBed,
    };

    setReminders((current) =>
      current.map((item) => (item.patientId === patient.id ? { ...item, ...identity } : item))
    );
    setProgressNotes((current) =>
      current.map((item) => (item.patientId === patient.id ? { ...item, ...identity } : item))
    );
    setCustomAntibiotics((current) =>
      current.map((item) => (item.patientId === patient.id ? { ...item, ...identity } : item))
    );
    setCustomTodaySchedules((current) =>
      current.map((item) => (item.patientId === patient.id ? { ...item, ...identity } : item))
    );
  };

  const updateChartingDraft = (patientId: string, draft: ChartingDraft) => {
    setChartingDrafts((current) => ({ ...current, [patientId]: draft }));
    setPatients((current) =>
      current.map((patient) =>
        patient.id === patientId
          ? {
              ...patient,
              chiefComplaint: draft.chiefComplaint.trim(),
              onset: draft.onset.trim(),
              presentIllness: draft.presentIllness.trim(),
              pastHistory: draft.pastHistory.trim(),
              reviewOfSystem: draft.reviewOfSystem.trim(),
              physicalExam: draft.physicalExam.trim(),
              problemList: splitProblemList(draft.problemListText),
              plan: draft.plan.trim(),
              guardianExplanation: draft.guardianExplanation.trim(),
              etc: draft.etc.trim(),
              updatedAt: new Date(),
            }
          : patient
      )
    );
  };

  const updatePatientTab = (patientId: string, tab: WorkspaceTabId) => {
    setSelectedTab(tab);
    setLastTabsByPatient((current) => ({ ...current, [patientId]: tab }));
  };

  const addPatientNote = (patient: Patient, content: string, type: 'progress' | 'reminder') => {
    const normalizedContent = content.trim();
    if (!normalizedContent) return;
    const noteId = createPreviewId(`preview-${type}`);
    const note = {
      patientId: patient.id,
      patientName: patient.name,
      roomBed: patient.roomBed,
      noteId,
      content: normalizedContent,
    };

    if (type === 'reminder') {
      setReminders((current) =>
        current.some(
          (item) =>
            item.patientId === patient.id &&
            normalizeKeyPart(item.content) === normalizeKeyPart(normalizedContent)
        )
          ? current
          : [note, ...current]
      );
      return;
    }

    setProgressNotes((current) =>
      current.some(
        (item) =>
          item.patientId === patient.id &&
          normalizeKeyPart(item.content) === normalizeKeyPart(normalizedContent)
      )
        ? current
        : [note, ...current]
    );
  };

  const removePatientNote = (noteId: string, type: 'progress' | 'reminder') => {
    if (type === 'reminder') {
      setReminders((current) => current.filter((item) => item.noteId !== noteId));
      return;
    }

    setProgressNotes((current) => current.filter((item) => item.noteId !== noteId));
  };

  const addTodaySchedule = (
    patient: Patient,
    schedule: { title: string; category: string; scheduledTime?: string }
  ) => {
    const scheduledTime = normalizeClockTime(schedule.scheduledTime);
    const title = schedule.title.trim();
    const category = schedule.category.trim() || '일정';
    if (!title) return;

    setCustomTodaySchedules((current) =>
      current.some(
        (item) =>
          item.patientId === patient.id &&
          normalizeKeyPart(item.title) === normalizeKeyPart(title) &&
          normalizeKeyPart(item.category) === normalizeKeyPart(category) &&
          normalizeKeyPart(item.scheduledTime) === normalizeKeyPart(scheduledTime)
      )
        ? current
        : [
            {
              patientId: patient.id,
              patientName: patient.name,
              roomBed: patient.roomBed,
              scheduleId: createPreviewId('preview-schedule'),
              title,
              category,
              scheduledTime,
              isCompleted: false,
            },
            ...current,
          ]
    );
  };

  const removeTodaySchedule = (scheduleId: string) => {
    setCustomTodaySchedules((current) => current.filter((item) => item.scheduleId !== scheduleId));
    setCompletedScheduleIds((current) => current.filter((item) => item !== scheduleId));
  };

  const addPatientAntibiotic = (patient: Patient, draft: AntibioticDraft) => {
    const drugName = draft.drugName.trim();
    if (!drugName) return;
    const startDate = parseDateInput(draft.startDate) ?? today;
    const dDay = Math.max(0, daysBetweenDates(startDate, today));
    const dosage = draft.dosage.trim() || undefined;
    const frequency = draft.frequency.trim() || undefined;

    setCustomAntibiotics((current) =>
      current.some(
        (item) =>
          item.patientId === patient.id &&
          normalizeKeyPart(item.drugName) === normalizeKeyPart(drugName) &&
          normalizeKeyPart(item.dosage) === normalizeKeyPart(dosage) &&
          normalizeKeyPart(item.frequency) === normalizeKeyPart(frequency) &&
          item.startDate.getTime() === startDate.getTime()
      )
        ? current
        : [
            {
              patientId: patient.id,
              patientName: patient.name,
              roomBed: patient.roomBed,
              medicationId: createPreviewId('preview-antibiotic'),
              drugName,
              dosage,
              frequency,
              dDay,
              isLongTerm: dDay >= 14,
              startDate,
            },
            ...current,
          ]
    );
  };

  const removePatientAntibiotic = (medicationId: string) => {
    setCustomAntibiotics((current) => current.filter((item) => item.medicationId !== medicationId));
  };

  const addPatientLab = (patient: Patient, draft: LabDraft) => {
    const itemName = draft.itemName.trim();
    const value = draft.value.trim();
    if (!itemName || !value) return;
    const unit = draft.unit.trim();
    const dateKeyValue = safeDateKey(draft.dateKey);

    setManualLabs((current) =>
      current.some(
        (item) =>
          item.patientId === patient.id &&
          normalizeKeyPart(item.itemName) === normalizeKeyPart(itemName) &&
          normalizeKeyPart(item.value) === normalizeKeyPart(value) &&
          normalizeKeyPart(item.unit) === normalizeKeyPart(unit) &&
          normalizeKeyPart(item.flag) === normalizeKeyPart(draft.flag) &&
          item.dateKey === dateKeyValue
      )
        ? current
        : [
            {
              id: createPreviewId('preview-lab'),
              patientId: patient.id,
              itemName,
              value,
              unit,
              flag: draft.flag || undefined,
              dateKey: dateKeyValue,
            },
            ...current,
          ]
    );
  };

  const removePatientLab = (target: PatientWorkspaceManualLab) => {
    setManualLabs((current) => {
      let removed = false;

      return current.filter((item) => {
        const matches =
          item.id && target.id
            ? item.id === target.id
            : item.patientId === target.patientId &&
              item.itemName === target.itemName &&
              item.value === target.value &&
              item.unit === target.unit &&
              item.flag === target.flag &&
              item.dateKey === target.dateKey;

        if (!removed && matches) {
          removed = true;
          return false;
        }

        return true;
      });
    });
  };

  const togglePatientArchive = (patientId: string) => {
    if (!confirmDiscardWorkspaceChanges()) return;
    setPatients((current) =>
      current.map((patient) =>
        patient.id === patientId
          ? patient.status === 'discharged'
            ? { ...patient, status: 'active', dischargeDate: undefined, updatedAt: new Date() }
            : { ...patient, status: 'discharged', dischargeDate: today, attention: false, updatedAt: new Date() }
          : patient
      )
    );
    const patient = patients.find((candidate) => candidate.id === patientId);
    if (patient?.status !== 'discharged') setSelectedPatientId(null);
    setWorkspaceUnsaved(false);
  };

  const resetPreviewState = () => {
    if (!confirmDiscardWorkspaceChanges()) return;
    if (!window.confirm('v2 프리뷰에서 변경한 내용을 모두 초기화할까요?')) return;

    clearPreviewState();
    skipNextPreviewPersistRef.current = true;
    initialPreviewStateRef.current = null;
    setPatients(previewPatients);
    setSelectedPatientId(null);
    setSelectedTab('overview');
    setLastTabsByPatient({});
    setSearchQuery('');
    setWorkspaceUnsaved(false);
    setChartingDrafts({});
    setInteractionState({});
    setReminders([]);
    setProgressNotes([]);
    setCustomAntibiotics([]);
    setManualLabs([]);
    setCustomTodaySchedules([]);
    setCompletedScheduleIds([]);
    setPreviewSavedAt(null);
    setQuickAddOpen(false);
    setEditingPatientId(null);
  };

  const addPreviewPatient = (draft: QuickAddDraft) => {
    if (!confirmDiscardWorkspaceChanges()) return;
    const birthDate = parseDateInput(draft.birthDate) ?? new Date(1965, 0, 1);
    const patient: Patient = {
      ...createBasePatient(),
      id: createPreviewId('preview-new'),
      registrationNumber: draft.registrationNumber.trim(),
      name: draft.name.trim(),
      birthDate,
      sex: draft.sex,
      roomBed: draft.patientType === 'consult' ? '협진' : draft.roomBed.trim(),
      admissionDate: today,
      patientType: draft.patientType,
      attendingPhysician: draft.attendingPhysician.trim() || '재활의학과',
      tags: splitTags(draft.tagsText),
    };

    setPatients((current) => [...current, patient]);
    setQuickAddOpen(false);
    setWorkspaceUnsaved(false);
    setSelectedPatientId(patient.id);
    setSelectedTab('charting');
    setLastTabsByPatient((current) => ({ ...current, [patient.id]: 'charting' }));
    setSearchQuery('');
  };

  const updatePreviewPatient = (patientId: string, draft: QuickAddDraft) => {
    const currentPatient = patients.find((patient) => patient.id === patientId);
    if (!currentPatient) return;
    const birthDate = parseDateInput(draft.birthDate) ?? currentPatient.birthDate;

    const updatedPatient: Patient = {
      ...currentPatient,
      registrationNumber: draft.registrationNumber.trim(),
      name: draft.name.trim(),
      birthDate,
      sex: draft.sex,
      roomBed: draft.patientType === 'consult' ? '협진' : draft.roomBed.trim(),
      patientType: draft.patientType,
      attendingPhysician: draft.attendingPhysician.trim() || '재활의학과',
      tags: splitTags(draft.tagsText),
      updatedAt: new Date(),
    };

    setPatients((current) =>
      current.map((patient) => (patient.id === patientId ? updatedPatient : patient))
    );
    syncPatientIdentity(updatedPatient);
    setEditingPatientId(null);
  };

  return (
    <AppShellV2
      patients={patients}
      userName="Preview"
      selectedPatientId={selectedPatientId ?? undefined}
      patientIndicators={patientIndicators}
      searchValue={searchQuery}
      activeMobileAction={activeMobileAction}
      onSearchChange={updateSearchQuery}
      onAddPatient={openQuickAdd}
      onSettings={openSettings}
      onToday={openToday}
      onLogout={logoutPreview}
      onPatientSelect={(patientId) => openPatient(patientId)}
    >
      {selectedPatient ? (
        <PatientWorkspace
          key={selectedPatient.id}
          patient={selectedPatient}
          data={previewData}
          manualLabs={manualLabs}
          initialTab={selectedTab}
          initialChartingDraft={chartingDrafts[selectedPatient.id]}
          onBack={openToday}
          onTabChange={(tab) => updatePatientTab(selectedPatient.id, tab)}
          onToggleAttention={() => toggleAttention(selectedPatient.id)}
          onEditPatient={() => setEditingPatientId(selectedPatient.id)}
          onChartingDraftChange={(draft) => updateChartingDraft(selectedPatient.id, draft)}
          onAddNote={(content, type) => addPatientNote(selectedPatient, content, type)}
          onRemoveNote={removePatientNote}
          onAddAntibiotic={(draft) => addPatientAntibiotic(selectedPatient, draft)}
          onRemoveAntibiotic={removePatientAntibiotic}
          onAddLab={(draft) => addPatientLab(selectedPatient, draft)}
          onRemoveLab={removePatientLab}
          onAddTodaySchedule={(schedule) => addTodaySchedule(selectedPatient, schedule)}
          onRemoveTodaySchedule={removeTodaySchedule}
          onUnsavedChange={setWorkspaceUnsaved}
          onArchive={() => togglePatientArchive(selectedPatient.id)}
        />
      ) : (
        <TodayDashboard
          data={previewData}
          date={today}
          subtitle="v2 디자인 프리뷰"
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {hasPreviewChanges && (
                <div className="hidden max-w-[30rem] flex-wrap items-center justify-end gap-1 md:flex">
                  {previewChangeSummary.slice(0, 4).map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex h-6 items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 text-[10.5px] text-zinc-500"
                    >
                      <span>{item.label}</span>
                      <span className="font-mono tabular-nums text-zinc-800">{item.count}</span>
                    </span>
                  ))}
                </div>
              )}
              {previewSavedAt && (
                <span className="hidden font-mono text-[10.5px] text-zinc-400 sm:inline">
                  저장 {formatClockTime(previewSavedAt)}
                </span>
              )}
              {previewExportCopiedAt && (
                <span className="hidden font-mono text-[10.5px] text-emerald-600 sm:inline">
                  복사 {formatClockTime(previewExportCopiedAt)}
                </span>
              )}
              <button
                type="button"
                onClick={copyPreviewExport}
                disabled={!hasPreviewChanges}
                className="h-7 rounded-md border border-zinc-200 px-2 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                변경 복사
              </button>
              <button
                type="button"
                onClick={resetPreviewState}
                disabled={!hasPreviewChanges}
                className="h-7 rounded-md border border-zinc-200 px-2 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                초기화
              </button>
            </div>
          }
          previewChangeSummary={previewChangeSummary}
          changedPatients={changedPatientSummaries}
          searchQuery={searchQuery}
          searchResults={searchResults}
          onOpenPatient={openPatient}
        />
      )}

      {quickAddOpen && (
        <QuickAddPanel
          existingRegistrationNumbers={patients.map((patient) => patient.registrationNumber.trim())}
          existingRoomBeds={patients
            .filter((patient) => patient.status === 'active' && patient.patientType === 'admitted')
            .map((patient) => patient.roomBed.trim())}
          onClose={() => setQuickAddOpen(false)}
          onSubmit={addPreviewPatient}
        />
      )}

      {editingPatient && (
        <QuickAddPanel
          title="환자 정보 수정"
          submitLabel="저장"
          initialDraft={draftFromPatient(editingPatient)}
          existingRegistrationNumbers={patients
            .filter((patient) => patient.id !== editingPatient.id)
            .map((patient) => patient.registrationNumber.trim())}
          existingRoomBeds={patients
            .filter(
              (patient) =>
                patient.id !== editingPatient.id &&
                patient.status === 'active' &&
                patient.patientType === 'admitted'
            )
            .map((patient) => patient.roomBed.trim())}
          onClose={() => setEditingPatientId(null)}
          onSubmit={(draft) => updatePreviewPatient(editingPatient.id, draft)}
        />
      )}
    </AppShellV2>
  );
}

function QuickAddPanel({
  title = '환자 추가',
  submitLabel = '추가',
  initialDraft: providedInitialDraft,
  existingRegistrationNumbers,
  existingRoomBeds,
  onClose,
  onSubmit,
}: {
  title?: string;
  submitLabel?: string;
  initialDraft?: QuickAddDraft;
  existingRegistrationNumbers: string[];
  existingRoomBeds: string[];
  onClose: () => void;
  onSubmit: (draft: QuickAddDraft) => void;
}) {
  const suggestedRoomBed = useMemo(() => suggestNextRoomBed(existingRoomBeds), [existingRoomBeds]);
  const initialDraft = useMemo<QuickAddDraft>(
    () =>
      providedInitialDraft ?? {
        ...defaultQuickAddDraft,
        roomBed: suggestedRoomBed,
      },
    [providedInitialDraft, suggestedRoomBed]
  );
  const [draft, setDraft] = useState<QuickAddDraft>(initialDraft);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const normalizedRegistrationNumber = draft.registrationNumber.trim();
  const normalizedRoomBed = draft.roomBed.trim();
  const registrationNumberSet = useMemo(
    () => new Set(existingRegistrationNumbers.map((item) => item.trim()).filter(Boolean)),
    [existingRegistrationNumbers]
  );
  const roomBedSet = useMemo(
    () => new Set(existingRoomBeds.map((item) => item.trim()).filter(Boolean)),
    [existingRoomBeds]
  );
  const isDuplicate =
    normalizedRegistrationNumber.length > 0 &&
    registrationNumberSet.has(normalizedRegistrationNumber);
  const roomOccupied =
    draft.patientType === 'admitted' &&
    Boolean(normalizedRoomBed) &&
    roomBedSet.has(normalizedRoomBed);
  const hasValidBirthDate = isValidBirthDateInput(draft.birthDate);
  const birthDatePreview = useMemo(() => {
    const parsed = parseDateInput(draft.birthDate);
    return parsed && hasValidBirthDate ? formatDetailedAge(parsed) : '';
  }, [draft.birthDate, hasValidBirthDate]);
  const hasRoom = draft.patientType === 'consult' || Boolean(normalizedRoomBed);
  const validationMessages = buildQuickAddValidationMessages({
    draft,
    normalizedRegistrationNumber,
    isDuplicate,
    roomOccupied,
    hasRoom,
    hasValidBirthDate,
  });
  const showValidationSummary =
    submitAttempted || isDuplicate || roomOccupied || (Boolean(draft.birthDate) && !hasValidBirthDate);
  const canSubmit =
    Boolean(draft.name.trim()) &&
    Boolean(normalizedRegistrationNumber) &&
    !isDuplicate &&
    !roomOccupied &&
    hasRoom &&
    hasValidBirthDate;
  const isDirty = !areQuickAddDraftsEqual(draft, initialDraft);
  const closeLabel = `${title} 닫기`;

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm('입력 중인 환자 정보가 있습니다. 닫을까요?')) return;
    onClose();
  }, [isDirty, onClose]);

  const submit = useCallback(() => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    onSubmit({
      ...draft,
      roomBed: normalizedRoomBed,
      registrationNumber: normalizedRegistrationNumber,
      name: draft.name.trim(),
      attendingPhysician: draft.attendingPhysician.trim(),
      tagsText: draft.tagsText.trim(),
    });
  }, [canSubmit, draft, normalizedRegistrationNumber, normalizedRoomBed, onSubmit]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'enter') {
        event.preventDefault();
        submit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose, submit]);

  const updateDraft = <K extends keyof QuickAddDraft>(key: K, value: QuickAddDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/35"
        aria-label={closeLabel}
        onClick={requestClose}
      />
      <div className="absolute right-0 top-0 flex h-full w-[min(24rem,92vw)] flex-col bg-white shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-zinc-200 px-3">
          <h2 className="text-[13px] font-medium text-zinc-900">{title}</h2>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label={closeLabel}
            onClick={requestClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <PreviewField
            label="이름"
            inputRef={firstFieldRef}
            value={draft.name}
            onChange={(value) => updateDraft('name', value)}
            onEnter={submit}
            placeholder="환자 이름"
          />
          <PreviewField
            label="등록번호"
            value={draft.registrationNumber}
            onChange={(value) =>
              updateDraft('registrationNumber', value.replace(/\D/g, '').slice(0, 12))
            }
            onEnter={submit}
            placeholder="24002001"
          />
          {isDuplicate && (
            <div className="-mt-2 text-[11px] text-red-600">이미 등록된 번호입니다.</div>
          )}
          <PreviewField
            label="병실"
            value={draft.roomBed}
            onChange={(value) => updateDraft('roomBed', value)}
            onEnter={submit}
            placeholder="303-1"
            disabled={draft.patientType === 'consult'}
          />
          {roomOccupied && (
            <div className="-mt-2 text-[11px] text-amber-600">이미 사용 중인 병실입니다.</div>
          )}
          <PreviewField
            label="생년월일"
            value={draft.birthDate}
            onChange={(value) => updateDraft('birthDate', value)}
            onEnter={submit}
            placeholder="1965-01-01"
            inputType="date"
          />
          {draft.birthDate && !hasValidBirthDate && (
            <div className="-mt-2 text-[11px] text-red-600">
              생년월일은 1900년부터 오늘 사이로 입력해 주세요.
            </div>
          )}
          {birthDatePreview && (
            <div className="-mt-2 text-[11px] text-zinc-500">
              표시 나이 <span className="font-mono text-zinc-700">{birthDatePreview}</span>
            </div>
          )}
          <PreviewField
            label="담당과"
            value={draft.attendingPhysician}
            onChange={(value) => updateDraft('attendingPhysician', value)}
            onEnter={submit}
            placeholder="재활의학과"
          />
          <PreviewField
            label="태그"
            value={draft.tagsText}
            onChange={(value) => updateDraft('tagsText', value)}
            onEnter={submit}
            placeholder="#stroke #DM"
          />

          <div className="grid grid-cols-2 gap-2">
            <SegmentedButton
              label="성별"
              value={draft.sex}
              options={[
                { value: 'F', label: 'F' },
                { value: 'M', label: 'M' },
              ]}
              onChange={(value) => updateDraft('sex', value as 'M' | 'F')}
            />
            <SegmentedButton
              label="구분"
              value={draft.patientType}
              options={[
                { value: 'admitted', label: '입원' },
                { value: 'consult', label: '협진' },
              ]}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  patientType: value as 'admitted' | 'consult',
                  roomBed: value === 'consult' ? '' : current.roomBed || suggestedRoomBed,
                }))
              }
            />
          </div>

        </div>

        <div className="grid gap-2 border-t border-zinc-200 p-3">
          {showValidationSummary && validationMessages[0] && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700">
              {validationMessages[0]}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={requestClose}
              className="inline-flex h-8 items-center rounded-md border border-zinc-200 px-2.5 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              취소
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              title={canSubmit ? undefined : validationMessages[0]}
              className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function areQuickAddDraftsEqual(left: QuickAddDraft, right: QuickAddDraft) {
  return (Object.keys(right) as Array<keyof QuickAddDraft>).every((key) => left[key] === right[key]);
}

function buildQuickAddValidationMessages({
  draft,
  normalizedRegistrationNumber,
  isDuplicate,
  roomOccupied,
  hasRoom,
  hasValidBirthDate,
}: {
  draft: QuickAddDraft;
  normalizedRegistrationNumber: string;
  isDuplicate: boolean;
  roomOccupied: boolean;
  hasRoom: boolean;
  hasValidBirthDate: boolean;
}) {
  const messages: string[] = [];
  if (!draft.name.trim()) messages.push('이름을 입력해 주세요.');
  if (!normalizedRegistrationNumber) messages.push('등록번호를 입력해 주세요.');
  if (isDuplicate) messages.push('이미 등록된 등록번호입니다.');
  if (!hasRoom) messages.push('입원 환자는 병실을 입력해 주세요.');
  if (roomOccupied) messages.push('이미 사용 중인 병실입니다.');
  if (!hasValidBirthDate) messages.push('생년월일은 1900년부터 오늘 사이 날짜로 입력해 주세요.');

  return messages;
}

function draftFromPatient(patient: Patient): QuickAddDraft {
  return {
    roomBed: patient.patientType === 'consult' ? '' : patient.roomBed,
    name: patient.name,
    registrationNumber: patient.registrationNumber,
    birthDate: formatDateInput(patient.birthDate),
    attendingPhysician: patient.attendingPhysician,
    tagsText: patient.tags?.join(' ') ?? '',
    sex: patient.sex,
    patientType: patient.patientType,
  };
}

function isValidBirthDateInput(value: string) {
  const date = parseDateInput(value);
  if (!date) return false;
  return isDateInRange(date, new Date(1900, 0, 1), today);
}

function suggestNextRoomBed(existingRoomBeds: string[]) {
  const numbers = existingRoomBeds
    .map((roomBed) => Number(roomBed.match(/\d+/)?.[0]))
    .filter((value) => Number.isFinite(value));
  const maxRoom = numbers.length > 0 ? Math.max(...numbers) : 302;

  return String(maxRoom + 1);
}

function PreviewField({
  label,
  inputRef,
  value,
  onChange,
  onEnter,
  placeholder,
  disabled,
  inputType = 'text',
}: {
  label: string;
  inputRef?: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  disabled?: boolean;
  inputType?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-zinc-500">{label}</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onEnter?.();
        }}
        placeholder={placeholder}
        disabled={disabled}
        type={inputType}
        className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400"
      />
    </label>
  );
}

function SegmentedButton({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium text-zinc-500">{label}</span>
      <div className="grid grid-cols-2 rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`h-7 rounded text-[12px] font-medium transition-colors ${
              value === option.value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
