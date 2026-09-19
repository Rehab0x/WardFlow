import type { Patient } from '@/types/patient';
import type { LabResult } from '@/types/lab';
import type { Medication } from '@/types/medication';
import type { BriefingData } from '@/services/briefingService';
import type { ParsedLabItem } from '@/services/parser/labParser';
import type { ParsedMedication } from '@/services/parser/medParser';
import type { WorkspaceTabId } from './WorkspaceTabs';

export interface ChartingDraft {
  chiefComplaint: string;
  onset: string;
  presentIllness: string;
  pastHistory: string;
  reviewOfSystem: string;
  physicalExam: string;
  problemListText: string;
  plan: string;
  guardianExplanation: string;
  etc: string;
}

export interface PatientWorkspaceInteractionState {
  reviewedLabImports?: string[];
  pausedMedications?: string[];
  acceptedMedicationImports?: string[];
  completedUpcomingSchedules?: string[];
  completedTodaySchedules?: string[];
}

export interface PatientWorkspaceManualLab {
  id?: string;
  patientId: string;
  itemName: string;
  value: string;
  unit: string;
  flag?: 'H' | 'L';
  dateKey: string;
}

export interface LabValueUpdateInput {
  dateKey: string;
  itemName: string;
  value: string;
  metadata?: {
    code?: string;
    category?: string;
    unit?: string;
    referenceMin?: number;
    referenceMax?: number;
  };
}

export interface AntibioticDraft {
  drugName: string;
  dosage: string;
  frequency: string;
  startDate: string;
}

export interface MedicationDraft {
  category: 'hospital' | 'personal';
  drugName: string;
  singleDose: string;
  frequency: '#1' | '#2' | '#3' | '#4';
  schedule: string;
  timing: string;
  notes: string;
}

export interface ManualLabDraft {
  itemName: string;
  value: string;
  unit: string;
  flag: '' | 'H' | 'L';
  dateKey: string;
}

export interface TodayScheduleDraft {
  title: string;
  category: string;
  scheduledTime?: string;
}

/** 각 탭이 공통으로 받는 props */
export interface WorkspaceTabBaseProps {
  patient: Patient;
  data: BriefingData;
  onDirtyChange?: (dirty: boolean) => void;
}

export interface PatientWorkspaceProps {
  patient: Patient;
  data: BriefingData;
  manualLabs?: PatientWorkspaceManualLab[];
  labResults?: LabResult[];
  medications?: Medication[];
  initialTab?: WorkspaceTabId;
  initialChartingDraft?: ChartingDraft;
  onBack?: () => void;
  onTabChange?: (tab: WorkspaceTabId) => void;
  onToggleAttention?: () => void;
  onEditPatient?: () => void;
  onChartingDraftChange?: (draft: ChartingDraft) => void | Promise<void>;
  onAddNote?: (content: string, type: 'progress' | 'reminder') => void | Promise<void>;
  onRemoveNote?: (noteId: string, type: 'progress' | 'reminder') => void | Promise<void>;
  onAddAntibiotic?: (draft: AntibioticDraft) => void | Promise<void>;
  onAddMedication?: (draft: MedicationDraft) => void | Promise<void>;
  onSaveParsedMedications?: (
    category: 'hospital' | 'personal',
    medications: ParsedMedication[]
  ) => void | Promise<void>;
  onSaveParsedLabs?: (
    items: ParsedLabItem[],
    testDate: Date,
    source: 'parsed'
  ) => void | Promise<void>;
  onAddLab?: (draft: ManualLabDraft) => void | Promise<void>;
  onUpdateLabValue?: (input: LabValueUpdateInput) => void | Promise<void>;
  onDeleteLabDate?: (dateKey: string) => void | Promise<void>;
  onRemoveLab?: (lab: PatientWorkspaceManualLab) => void | Promise<void>;
  onLoadLabs?: (patientId: string) => void | Promise<void>;
  onLoadMedications?: (patientId: string) => void | Promise<void>;
  onAddTodaySchedule?: (schedule: TodayScheduleDraft) => void | Promise<void>;
  onRemoveTodaySchedule?: (scheduleId: string) => void | Promise<void>;
  onRemoveAntibiotic?: (medicationId: string) => void | Promise<void>;
  onRemoveMedication?: (medicationId: string) => void | Promise<void>;
  onUnsavedChange?: (hasUnsavedChanges: boolean) => void;
  onArchive?: () => void;
  attentionPending?: boolean;
  archivePending?: boolean;
}
