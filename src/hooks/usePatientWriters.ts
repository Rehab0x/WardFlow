import { useState, type Dispatch, type SetStateAction } from 'react';
import { formatDateInput, parseDateInput } from '@/components/clinical/dateLabels';
import type { BriefingData } from '@/services/briefingService';
import type { Patient } from '@/types/patient';
import { formatUserFacingError } from '@/lib/errorMessages';
import {
  formatPatientArchiveConfirm,
  patientArchiveFailureMessage,
} from '@/lib/patientDeletionPolicy';
import { usePatientStore } from '@/stores/usePatientStore';
import type { PatientListIndexes } from '@/features/app/patientIndexes';
import {
  isValidBirthDateInput,
  isValidClinicalDateInput,
  parseTags,
  validatePatientDraft,
  type AddPatientDraft,
} from '@/features/app/patientDraft';
import {
  applyOptimisticPatientIdentity,
  applyOptimisticRemovePatientItems,
} from '@/features/app/optimisticBriefing';

export type ArchiveDialogState =
  | { mode: 'discharge'; dateKey: string }
  | { mode: 'readmit'; dateKey: string }
  | null;

interface UsePatientWritersInput {
  currentUserId: string | undefined;
  selectedPatient: Patient | undefined;
  selectedPatientId: string | null;
  editingPatient: Patient | undefined;
  patientListIndexes: PatientListIndexes;
  setBriefingData: Dispatch<SetStateAction<BriefingData>>;
  setSelectedPatientId: Dispatch<SetStateAction<string | null>>;
  setSelectedTab: (tab: 'overview') => void;
  setEditPatientId: Dispatch<SetStateAction<string | null>>;
  setAddOpen: Dispatch<SetStateAction<boolean>>;
  setWriteError: Dispatch<SetStateAction<string | null>>;
  openPatient: (patientId: string, tab?: string) => boolean;
  confirmWorkspaceNavigation: () => boolean;
  markLocalBriefingUpdated: () => void;
  queueBriefingRefresh: () => void;
  refreshAfterPatientWrite: () => Promise<void>;
  runWrite: (action: () => Promise<void>, fallbackMessage: string) => Promise<void>;
}

/**
 * 환자 레코드 자체를 바꾸는 쓰기 핸들러 모음 (추가/수정/삭제/주의표시/퇴원·재입원).
 * 임상 데이터 쓰기는 `useClinicalWriters`가 담당한다.
 */
export function usePatientWriters({
  currentUserId,
  selectedPatient,
  selectedPatientId,
  editingPatient,
  patientListIndexes,
  setBriefingData,
  setSelectedPatientId,
  setSelectedTab,
  setEditPatientId,
  setAddOpen,
  setWriteError,
  openPatient,
  confirmWorkspaceNavigation,
  markLocalBriefingUpdated,
  queueBriefingRefresh,
  refreshAfterPatientWrite,
  runWrite,
}: UsePatientWritersInput) {
  const { addPatient, updatePatient, deletePatient, dischargePatient } = usePatientStore();
  const [addError, setAddError] = useState<string | null>(null);
  const [savingPatient, setSavingPatient] = useState(false);
  const [attentionPending, setAttentionPending] = useState(false);
  const [archivePending, setArchivePending] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState<ArchiveDialogState>(null);

  const handleCreatePatient = async (draft: AddPatientDraft) => {
    const validation = validatePatientDraft(draft, patientListIndexes);
    if (validation) {
      setAddError(validation);
      return;
    }

    const birthDate = parseDateInput(draft.birthDate);
    if (!birthDate || !isValidBirthDateInput(draft.birthDate)) {
      setAddError('생년월일을 확인해주세요.');
      return;
    }
    const admissionDate = parseDateInput(draft.admissionDate);
    if (!admissionDate || !isValidClinicalDateInput(draft.admissionDate)) {
      setAddError('입원일을 확인해주세요.');
      return;
    }

    setSavingPatient(true);
    setAddError(null);
    try {
      const patientId = await addPatient({
        registrationNumber: draft.registrationNumber.trim(),
        name: draft.name.trim(),
        birthDate,
        sex: draft.sex,
        roomBed: draft.roomBed.trim(),
        admissionDate,
        attendingPhysician: draft.attendingPhysician.trim(),
        patientType: draft.patientType,
        status: 'active',
        createdBy: currentUserId ?? '',
        sharedWith: [],
        tags: parseTags(draft.tagsText),
        attention: false,
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
      });
      setAddOpen(false);
      markLocalBriefingUpdated();
      openPatient(patientId, 'charting');
      queueBriefingRefresh();
    } catch (error) {
      setAddError(formatUserFacingError(error, '환자를 추가하지 못했습니다.'));
    } finally {
      setSavingPatient(false);
    }
  };

  const handleUpdatePatientInfo = async (draft: AddPatientDraft) => {
    if (!editingPatient) return;

    const validation = validatePatientDraft(draft, patientListIndexes, editingPatient.id);
    if (validation) {
      setAddError(validation);
      return;
    }

    const birthDate = parseDateInput(draft.birthDate);
    if (!birthDate || !isValidBirthDateInput(draft.birthDate)) {
      setAddError('생년월일을 확인해주세요.');
      return;
    }
    const admissionDate = parseDateInput(draft.admissionDate);
    if (!admissionDate || !isValidClinicalDateInput(draft.admissionDate)) {
      setAddError('입원일을 확인해주세요.');
      return;
    }

    setSavingPatient(true);
    setAddError(null);
    try {
      await updatePatient(editingPatient.id, {
        registrationNumber: draft.registrationNumber.trim(),
        name: draft.name.trim(),
        birthDate,
        sex: draft.sex,
        roomBed: draft.roomBed.trim(),
        admissionDate,
        attendingPhysician: draft.attendingPhysician.trim(),
        patientType: draft.patientType,
        tags: parseTags(draft.tagsText),
      });
      setEditPatientId(null);
      setSelectedPatientId(editingPatient.id);
      applyOptimisticPatientIdentity(setBriefingData, editingPatient, {
        name: draft.name.trim(),
        roomBed: draft.roomBed.trim(),
      });
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    } catch (error) {
      setAddError(formatUserFacingError(error, '환자 정보를 저장하지 못했습니다.'));
    } finally {
      setSavingPatient(false);
    }
  };

  const handleDeleteEditingPatient = async () => {
    if (!editingPatient || savingPatient) return;
    if (!window.confirm(formatPatientArchiveConfirm(editingPatient.name))) return;

    setSavingPatient(true);
    setAddError(null);
    try {
      await deletePatient(editingPatient.id);
      applyOptimisticRemovePatientItems(setBriefingData, editingPatient.id);
      if (selectedPatientId === editingPatient.id) {
        setSelectedPatientId(null);
        setSelectedTab('overview');
      }
      setEditPatientId(null);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    } catch (error) {
      setAddError(formatUserFacingError(error, patientArchiveFailureMessage));
    } finally {
      setSavingPatient(false);
    }
  };

  const handleToggleAttention = async () => {
    if (!selectedPatient || attentionPending) return;
    setAttentionPending(true);
    try {
      await runWrite(async () => {
        await updatePatient(selectedPatient.id, { attention: !selectedPatient.attention });
      }, '주의 표시를 변경하지 못했습니다.');
    } finally {
      setAttentionPending(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedPatient || archivePending) return;
    if (!confirmWorkspaceNavigation()) return;
    setArchiveDialog({
      mode: selectedPatient.status === 'discharged' ? 'readmit' : 'discharge',
      dateKey:
        selectedPatient.status === 'discharged'
          ? formatDateInput(new Date())
          : formatDateInput(selectedPatient.dischargeDate ?? new Date()),
    });
  };

  const handleConfirmArchiveDialog = async (dateKey: string) => {
    if (!selectedPatient || archivePending || !archiveDialog) return;
    const statusDate = parseDateInput(dateKey);
    if (!statusDate || !isValidClinicalDateInput(dateKey)) {
      setWriteError('날짜는 1900년부터 오늘 사이로 입력해주세요.');
      return;
    }
    setArchivePending(true);
    try {
      await runWrite(async () => {
        if (archiveDialog.mode === 'readmit') {
          await updatePatient(selectedPatient.id, {
            status: 'active',
            dischargeDate: undefined,
            admissionDate: statusDate,
          });
        } else {
          await dischargePatient(selectedPatient.id, statusDate);
          applyOptimisticRemovePatientItems(setBriefingData, selectedPatient.id);
        }
        setArchiveDialog(null);
        markLocalBriefingUpdated();
        await refreshAfterPatientWrite();
      }, '환자 상태를 변경하지 못했습니다.');
    } finally {
      setArchivePending(false);
    }
  };

  return {
    addError,
    setAddError,
    savingPatient,
    attentionPending,
    archivePending,
    archiveDialog,
    setArchiveDialog,
    handleCreatePatient,
    handleUpdatePatientInfo,
    handleDeleteEditingPatient,
    handleToggleAttention,
    handleArchive,
    handleConfirmArchiveDialog,
  };
}
