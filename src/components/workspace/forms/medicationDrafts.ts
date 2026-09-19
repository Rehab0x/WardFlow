import { formatDateInput } from '@/components/clinical/dateLabels';
import type { AntibioticDraft, MedicationDraft } from '../types';

export const medicationScheduleOptions = {
  '#1': ['아침', '점심', '저녁', '취침전'],
  '#2': ['아침,점심', '점심,저녁', '아침,저녁', '아침,취침전', '점심,취침전', '저녁,취침전'],
  '#3': ['아침,점심,저녁'],
  '#4': ['아침,점심,저녁,취침전'],
} as const;

export const medicationTimingOptions = [
  '식후',
  '식전',
  '식후 30분',
  '식전 30분',
  '상관없음',
] as const;

export const emptyAntibioticDraft = (): AntibioticDraft => ({
  drugName: '',
  dosage: '',
  frequency: '',
  startDate: formatDateInput(new Date()),
});

export const emptyMedicationDraft = (): MedicationDraft => ({
  category: 'hospital',
  drugName: '',
  singleDose: '',
  frequency: '#1',
  schedule: '아침',
  timing: '식후',
  notes: '',
});
