import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { parseDateInput, formatDateInput } from '@/components/clinical/dateLabels';
import type { BriefingData } from '@/services/briefingService';
import type { ParsedLabItem } from '@/services/parser/labParser';
import type { ParsedMedication } from '@/services/parser/medParser';
import type { ChartingDraft } from '@/components/workspace/PatientWorkspace';
import type {
  AntibioticDraft,
  LabValueUpdateInput,
  ManualLabDraft,
  MedicationDraft,
  TodayScheduleDraft,
} from '@/components/workspace/types';
import type { LabItem, LabResult } from '@/types/lab';
import type { Patient } from '@/types/patient';
import { useLabStore } from '@/stores/useLabStore';
import { useMedicationStore } from '@/stores/useMedicationStore';
import { useNoteStore } from '@/stores/useNoteStore';
import { usePatientStore } from '@/stores/usePatientStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { isValidClinicalDateInput } from '@/features/app/patientDraft';
import {
  applyOptimisticAntibiotic,
  applyOptimisticLab,
  applyOptimisticNote,
  applyOptimisticRemoveAntibiotic,
  applyOptimisticRemoveLab,
  applyOptimisticRemoveNote,
  applyOptimisticRemoveSchedule,
  applyOptimisticSchedule,
  formatParsedMedicationSchedule,
} from '@/features/app/optimisticBriefing';

interface UseClinicalWritersInput {
  selectedPatient: Patient | undefined;
  labs: LabResult[];
  setBriefingData: Dispatch<SetStateAction<BriefingData>>;
  markLocalBriefingUpdated: () => void;
  queueBriefingRefresh: () => void;
  /** 쓰기 실패를 공통 배너로 노출하는 래퍼 */
  runWrite: (action: () => Promise<void>, fallbackMessage: string) => Promise<void>;
}

/**
 * 선택된 환자의 임상 데이터(차팅/메모/약제/Lab/일정) 쓰기 핸들러 모음.
 * 저장 성공 시 Today 브리핑을 낙관적으로 갱신한 뒤 서버 확인 갱신을 예약한다.
 */
export function useClinicalWriters({
  selectedPatient,
  labs,
  setBriefingData,
  markLocalBriefingUpdated,
  queueBriefingRefresh,
  runWrite,
}: UseClinicalWritersInput) {
  const { updatePatient } = usePatientStore();
  const { addNote, deleteNote } = useNoteStore();
  const { addSchedule, deleteSchedule } = useScheduleStore();
  const { fetchMedicationsByPatient, addMedication, deleteMedication } = useMedicationStore();
  const { fetchLabsByPatient, addLabResult, deleteLabResult, updateLabItemValue } = useLabStore();

  const handleChartingSave = async (draft: ChartingDraft) => {
    if (!selectedPatient) return;
    await runWrite(async () => {
      await updatePatient(selectedPatient.id, {
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
      });
    }, '차팅을 저장하지 못했습니다.');
  };

  const handleAddNote = async (content: string, type: 'progress' | 'reminder') => {
    if (!selectedPatient) return;
    await runWrite(async () => {
      const noteId = await addNote({
        patientId: selectedPatient.id,
        content,
        type,
        alertDate: type === 'reminder' ? todayKey() : undefined,
      });
      applyOptimisticNote(setBriefingData, selectedPatient, noteId, content, type);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, '메모를 저장하지 못했습니다.');
  };

  /**
   * 선택된 환자와 무관하게 특정 환자에게 경과기록을 저장한다.
   * (간호사 대화 정리처럼 한 번에 여러 환자에게 쓰는 경우)
   */
  const handleAddNoteForPatient = async (patientId: string, content: string) => {
    await runWrite(async () => {
      await addNote({ patientId, content, type: 'progress' });
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, '메모를 저장하지 못했습니다.');
  };

  const handleRemoveNote = async (noteId: string) => {
    await runWrite(async () => {
      await deleteNote(noteId);
      applyOptimisticRemoveNote(setBriefingData, noteId);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, '메모를 삭제하지 못했습니다.');
  };

  const handleAddAntibiotic = async (draft: AntibioticDraft) => {
    if (!selectedPatient) return;
    await runWrite(async () => {
      const startDate = parseDateInput(draft.startDate);
      if (!startDate || !isValidClinicalDateInput(draft.startDate)) {
        throw new Error('시작일은 1900년부터 오늘 사이로 입력해주세요.');
      }
      const drugName = draft.drugName.trim();
      const dosage = draft.dosage.trim();
      const frequency = draft.frequency.trim();
      const medicationId = await addMedication({
        patientId: selectedPatient.id,
        category: 'antibiotic',
        drugName,
        drugBaseName: drugName,
        singleDose: 0,
        schedule: frequency,
        dosage,
        frequency,
        startDate,
        isAntibiotic: true,
        isActive: true,
      });
      applyOptimisticAntibiotic(setBriefingData, selectedPatient, medicationId, {
        drugName,
        dosage,
        frequency,
        startDate,
      });
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, '항생제를 저장하지 못했습니다.');
  };

  const handleAddMedication = async (draft: MedicationDraft) => {
    if (!selectedPatient) return;
    await runWrite(async () => {
      const startDate = new Date();
      const drugName = draft.drugName.trim();
      await addMedication({
        patientId: selectedPatient.id,
        category: draft.category,
        drugName,
        drugBaseName: drugName,
        singleDose: Number(draft.singleDose.trim()) || 0,
        schedule: `${draft.frequency} ${draft.schedule.trim()}`.trim(),
        timing: draft.timing.trim() || undefined,
        startDate,
        isAntibiotic: false,
        isActive: true,
        notes: draft.notes.trim() || undefined,
      });
      markLocalBriefingUpdated();
    }, '약제를 저장하지 못했습니다.');
  };

  const handleSaveParsedMedications = async (
    category: 'hospital' | 'personal',
    parsedMedications: ParsedMedication[]
  ) => {
    if (!selectedPatient) return;
    await runWrite(async () => {
      const startDate = new Date();
      for (const medication of parsedMedications) {
        await addMedication({
          patientId: selectedPatient.id,
          category,
          drugName: medication.drugName,
          drugBaseName: medication.drugBaseName,
          singleDose: medication.singleDose,
          schedule: formatParsedMedicationSchedule(medication.schedule),
          timing: medication.timing,
          daysRemaining: medication.daysRemaining,
          startDate,
          isAntibiotic: false,
          isActive: true,
        });
      }
      await fetchMedicationsByPatient(selectedPatient.id);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, '파싱한 약제를 저장하지 못했습니다.');
  };

  const handleRemoveAntibiotic = async (medicationId: string) => {
    await runWrite(async () => {
      await deleteMedication(medicationId);
      applyOptimisticRemoveAntibiotic(setBriefingData, medicationId);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, '항생제를 삭제하지 못했습니다.');
  };

  const handleRemoveMedication = async (medicationId: string) => {
    if (!selectedPatient) return;
    await runWrite(async () => {
      await deleteMedication(medicationId);
      await fetchMedicationsByPatient(selectedPatient.id);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, '약제를 삭제하지 못했습니다.');
  };

  const handleAddLab = async (draft: ManualLabDraft) => {
    if (!selectedPatient) return;
    await runWrite(async () => {
      const testDate = parseDateInput(draft.dateKey);
      if (!testDate || !isValidClinicalDateInput(draft.dateKey)) {
        throw new Error('Lab 날짜는 1900년부터 오늘 사이로 입력해주세요.');
      }
      const itemName = draft.itemName.trim();
      const valueText = draft.value.trim();
      const unit = draft.unit.trim();
      const numericValue = Number(valueText);
      const isNumeric = valueText !== '' && Number.isFinite(numericValue);
      const item: LabItem = {
        name: itemName,
        value: isNumeric ? numericValue : valueText,
        unit,
        isAbnormal: Boolean(draft.flag),
        hlFlag: draft.flag || undefined,
      };
      const labId = await addLabResult(selectedPatient.id, 'Other', [item], testDate, 'manual');
      applyOptimisticLab(setBriefingData, selectedPatient, labId, {
        itemName,
        flag: draft.flag || undefined,
        testDate,
      });
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, 'Lab을 저장하지 못했습니다.');
  };

  const handleSaveParsedLabs = async (items: ParsedLabItem[], testDate: Date, source: 'parsed') => {
    if (!selectedPatient) return;
    await runWrite(async () => {
      const grouped = new Map<string, ParsedLabItem[]>();
      for (const item of items) {
        const category = item.category || 'Other';
        const current = grouped.get(category) ?? [];
        current.push(item);
        grouped.set(category, current);
      }

      for (const [category, categoryItems] of grouped.entries()) {
        const labItems: LabItem[] = categoryItems.map((item) => ({
          code: item.code || undefined,
          name: item.name,
          value: item.value,
          unit: item.unit,
          referenceMin: item.referenceMin,
          referenceMax: item.referenceMax,
          isAbnormal: item.flag !== '',
          hlFlag: item.flag || undefined,
        }));
        await addLabResult(selectedPatient.id, category, labItems, testDate, source);
      }

      await fetchLabsByPatient(selectedPatient.id);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, 'Lab 파싱 결과를 저장하지 못했습니다.');
  };

  const handleUpdateLabValue = async (input: LabValueUpdateInput) => {
    if (!selectedPatient) return;
    await runWrite(async () => {
      if (!isValidClinicalDateInput(input.dateKey)) {
        throw new Error('Lab 날짜는 1900년부터 오늘 사이로 입력해주세요.');
      }
      await updateLabItemValue(
        selectedPatient.id,
        input.dateKey,
        input.itemName,
        input.value,
        input.metadata
      );
      await fetchLabsByPatient(selectedPatient.id);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, 'Lab 값을 저장하지 못했습니다.');
  };

  const handleDeleteLabDate = async (dateKey: string) => {
    if (!selectedPatient) return;
    await runWrite(async () => {
      const targets = labs.filter(
        (lab) =>
          lab.patientId === selectedPatient.id &&
          lab.category !== 'Culture' &&
          formatDateInput(lab.testDate) === dateKey
      );
      for (const lab of targets) {
        await deleteLabResult(lab.id);
      }
      await fetchLabsByPatient(selectedPatient.id);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, 'Lab 날짜 결과를 삭제하지 못했습니다.');
  };

  const handleRemoveLab = async (lab: { id?: string }) => {
    if (!lab.id) return;
    const labId = lab.id;
    await runWrite(async () => {
      await deleteLabResult(labId);
      applyOptimisticRemoveLab(setBriefingData, selectedPatient?.id, labId);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, 'Lab을 삭제하지 못했습니다.');
  };

  const handleAddTodaySchedule = async (schedule: TodayScheduleDraft) => {
    if (!selectedPatient) return;
    await runWrite(async () => {
      const title = schedule.title.trim();
      const category = schedule.category.trim() || '일정';
      if (!title) return;
      const scheduleId = await addSchedule({
        patientId: selectedPatient.id,
        title,
        category,
        scheduledDate: new Date(),
        scheduledTime: schedule.scheduledTime,
        isCompleted: false,
      });
      applyOptimisticSchedule(setBriefingData, selectedPatient, scheduleId, {
        ...schedule,
        title,
        category,
      });
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, '일정을 저장하지 못했습니다.');
  };

  const handleRemoveTodaySchedule = async (scheduleId: string) => {
    await runWrite(async () => {
      await deleteSchedule(scheduleId);
      applyOptimisticRemoveSchedule(setBriefingData, scheduleId);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, '일정을 삭제하지 못했습니다.');
  };

  return useMemo(
    () => ({
      handleChartingSave,
      handleAddNote,
      handleAddNoteForPatient,
      handleRemoveNote,
      handleAddAntibiotic,
      handleAddMedication,
      handleSaveParsedMedications,
      handleRemoveAntibiotic,
      handleRemoveMedication,
      handleAddLab,
      handleSaveParsedLabs,
      handleUpdateLabValue,
      handleDeleteLabDate,
      handleRemoveLab,
      handleAddTodaySchedule,
      handleRemoveTodaySchedule,
      fetchLabsByPatient,
      fetchMedicationsByPatient,
    }),
    // 핸들러는 매 렌더 새로 만들어지지만, PatientWorkspace가 의존하는 값은 아래 목록으로 충분하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPatient, labs, fetchLabsByPatient, fetchMedicationsByPatient]
  );
}

function todayKey() {
  return formatDateInput(new Date());
}
