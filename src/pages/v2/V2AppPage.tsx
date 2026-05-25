import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppShellV2,
  PatientWorkspace,
  TodayDashboard,
  formatClockTime,
  formatDateInput,
  formatDetailedAge,
  isDateInRange,
  parseDateInput,
  type ChartingDraft,
  type PatientRailIndicators,
  type WorkspaceTabId,
} from '@/components/v2';
import type { LabItem, Patient } from '@/db/database';
import { fetchBriefingData, type BriefingData } from '@/services/briefingService';
import { formatUserFacingError } from '@/lib/errorMessages';
import {
  formatPatientArchiveConfirm,
  patientArchiveButtonLabel,
  patientArchiveHelpText,
} from '@/lib/patientDeletionPolicy';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLabStore } from '@/stores/useLabStore';
import { useMedicationStore } from '@/stores/useMedicationStore';
import { useNoteStore } from '@/stores/useNoteStore';
import { usePatientStore } from '@/stores/usePatientStore';
import { useScheduleStore } from '@/stores/useScheduleStore';

type AddPatientDraft = {
  roomBed: string;
  name: string;
  registrationNumber: string;
  birthDate: string;
  sex: 'M' | 'F';
  patientType: 'admitted' | 'consult';
  attendingPhysician: string;
  tagsText: string;
};

type PatientSearchRow = {
  patient: Patient;
  text: string;
};

type PatientListIndexes = {
  summary: BriefingData['patientSummary'];
  patientsById: Map<string, Patient>;
  registrationNumbers: Map<string, string>;
  occupiedRoomBeds: Map<string, string>;
  searchRows: PatientSearchRow[];
};

const emptyBriefingData: BriefingData = {
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

const defaultAddPatientDraft: AddPatientDraft = {
  roomBed: '',
  name: '',
  registrationNumber: '',
  birthDate: '',
  sex: 'F',
  patientType: 'admitted',
  attendingPhysician: '',
  tagsText: '',
};

export default function V2AppPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const {
    patients,
    isLoading: patientsLoading,
    error: patientsError,
    fetchPatients,
    addPatient,
    updatePatient,
    deletePatient,
    dischargePatient,
  } = usePatientStore();
  const { addNote, deleteNote } = useNoteStore();
  const { addSchedule, deleteSchedule } = useScheduleStore();
  const { addMedication, deleteMedication } = useMedicationStore();
  const { addLabResult, deleteLabResult } = useLabStore();
  const [briefingData, setBriefingData] = useState<BriefingData>(emptyBriefingData);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [lastBriefingUpdatedAt, setLastBriefingUpdatedAt] = useState<Date | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<WorkspaceTabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editPatientId, setEditPatientId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [savingPatient, setSavingPatient] = useState(false);
  const [workspaceUnsaved, setWorkspaceUnsaved] = useState(false);
  const [attentionPending, setAttentionPending] = useState(false);
  const [archivePending, setArchivePending] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const briefingRequestSeq = useRef(0);
  const briefingRefreshPromiseRef = useRef<Promise<void> | null>(null);
  const briefingRefreshQueuedRef = useRef(false);
  const briefingRefreshUserKeyRef = useRef<string | null>(null);
  const lastFullRefreshAtRef = useRef(0);
  const fullRefreshPromiseRef = useRef<Promise<void> | null>(null);
  const fullRefreshUserKeyRef = useRef<string | null>(null);

  const runBriefingFetch = useCallback(async () => {
    if (!currentUser) {
      setBriefingData(emptyBriefingData);
      return;
    }

    const requestId = briefingRequestSeq.current + 1;
    briefingRequestSeq.current = requestId;
    setBriefingLoading(true);
    setBriefingError(null);

    try {
      const nextBriefingData = await fetchBriefingData(currentUser.id, currentUser.role);
      if (briefingRequestSeq.current === requestId) {
        setBriefingData(nextBriefingData);
        setLastBriefingUpdatedAt(new Date());
      }
    } catch (error) {
      if (briefingRequestSeq.current === requestId) {
        setBriefingError(formatUserFacingError(error, 'Today 데이터를 불러오지 못했습니다.'));
      }
    } finally {
      if (briefingRequestSeq.current === requestId) {
        setBriefingLoading(false);
      }
    }
  }, [currentUser]);

  const loadBriefingData = useCallback(async () => {
    const refreshUserKey = currentUser?.id ?? 'anonymous';
    if (briefingRefreshPromiseRef.current && briefingRefreshUserKeyRef.current === refreshUserKey) {
      briefingRefreshQueuedRef.current = true;
      return briefingRefreshPromiseRef.current;
    }
    if (briefingRefreshUserKeyRef.current !== refreshUserKey) {
      briefingRefreshQueuedRef.current = false;
    }

    const refreshPromise = (async () => {
      await runBriefingFetch();
      while (briefingRefreshQueuedRef.current) {
        briefingRefreshQueuedRef.current = false;
        await runBriefingFetch();
      }
    })();

    briefingRefreshPromiseRef.current = refreshPromise;
    briefingRefreshUserKeyRef.current = refreshUserKey;
    try {
      await refreshPromise;
    } finally {
      if (briefingRefreshPromiseRef.current === refreshPromise) {
        briefingRefreshPromiseRef.current = null;
        briefingRefreshUserKeyRef.current = null;
        briefingRefreshQueuedRef.current = false;
      }
    }
  }, [currentUser, runBriefingFetch]);

  const loadData = useCallback(async () => {
    const refreshUserKey = currentUser?.id ?? 'anonymous';
    if (fullRefreshPromiseRef.current && fullRefreshUserKeyRef.current === refreshUserKey) {
      return fullRefreshPromiseRef.current;
    }

    const refreshPromise = (async () => {
      if (!currentUser) {
        await fetchPatients();
        setBriefingData(emptyBriefingData);
        lastFullRefreshAtRef.current = Date.now();
        return;
      }

      const [briefingResult] = await Promise.allSettled([loadBriefingData(), fetchPatients()]);
      lastFullRefreshAtRef.current = Date.now();
      if (briefingResult.status === 'rejected') {
        setBriefingError(
          formatUserFacingError(briefingResult.reason, 'Today 데이터를 불러오지 못했습니다.')
        );
      }
    })();

    fullRefreshPromiseRef.current = refreshPromise;
    fullRefreshUserKeyRef.current = refreshUserKey;
    try {
      await refreshPromise;
    } finally {
      if (fullRefreshPromiseRef.current === refreshPromise) {
        fullRefreshPromiseRef.current = null;
        fullRefreshUserKeyRef.current = null;
      }
    }
  }, [currentUser, fetchPatients, loadBriefingData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const refreshIfStale = () => {
      if (document.visibilityState === 'hidden') return;
      if (workspaceUnsaved) return;
      if (Date.now() - lastFullRefreshAtRef.current < 60_000) return;
      void loadData();
    };

    window.addEventListener('focus', refreshIfStale);
    document.addEventListener('visibilitychange', refreshIfStale);
    return () => {
      window.removeEventListener('focus', refreshIfStale);
      document.removeEventListener('visibilitychange', refreshIfStale);
    };
  }, [loadData, workspaceUnsaved]);

  const patientListIndexes = useMemo(() => buildPatientListIndexes(patients), [patients]);
  useEffect(() => {
    if (selectedPatientId && !patientListIndexes.patientsById.has(selectedPatientId)) {
      setSelectedPatientId(null);
      setSelectedTab('overview');
    }
  }, [patientListIndexes.patientsById, selectedPatientId]);

  const selectedPatient = selectedPatientId
    ? patientListIndexes.patientsById.get(selectedPatientId)
    : undefined;
  const editingPatient = editPatientId
    ? patientListIndexes.patientsById.get(editPatientId)
    : undefined;
  const searchResults = useMemo(
    () => filterPatients(patientListIndexes.searchRows, deferredSearchQuery),
    [patientListIndexes.searchRows, deferredSearchQuery]
  );
  const displayedBriefingData = useMemo(
    () => ({
      ...briefingData,
      patientSummary: patientListIndexes.summary,
    }),
    [briefingData, patientListIndexes.summary]
  );
  const patientIndicators = useMemo(
    () => buildPatientIndicators(patientListIndexes.patientsById, displayedBriefingData),
    [patientListIndexes.patientsById, displayedBriefingData]
  );

  const confirmWorkspaceNavigation = useCallback(
    () => !workspaceUnsaved || window.confirm('저장하지 않은 변경이 있습니다. 이동할까요?'),
    [workspaceUnsaved]
  );

  const openPatient = useCallback(
    (patientId: string, tab: string = 'overview') => {
      if (patientId !== selectedPatientId && !confirmWorkspaceNavigation()) return false;
      setSelectedPatientId(patientId);
      setSelectedTab(isWorkspaceTabId(tab) ? tab : 'overview');
      setWorkspaceUnsaved(false);
      return true;
    },
    [confirmWorkspaceNavigation, selectedPatientId]
  );

  const queueBriefingRefresh = useCallback(() => {
    void loadBriefingData();
  }, [loadBriefingData]);

  const refreshAfterPatientWrite = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const markLocalBriefingUpdated = useCallback(() => {
    setLastBriefingUpdatedAt(new Date());
    setBriefingError(null);
  }, []);

  const runWrite = useCallback(async (action: () => Promise<void>, fallbackMessage: string) => {
    setWriteError(null);
    try {
      await action();
    } catch (error) {
      setWriteError(formatUserFacingError(error, fallbackMessage));
      throw error;
    }
  }, []);

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

    setSavingPatient(true);
    setAddError(null);
    try {
      const now = new Date();
      const patientId = await addPatient({
        registrationNumber: draft.registrationNumber.trim(),
        name: draft.name.trim(),
        birthDate,
        sex: draft.sex,
        roomBed: draft.patientType === 'consult' ? '협진' : draft.roomBed.trim(),
        admissionDate: now,
        attendingPhysician: draft.attendingPhysician.trim(),
        patientType: draft.patientType,
        status: 'active',
        createdBy: currentUser?.id ?? '',
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

    setSavingPatient(true);
    setAddError(null);
    try {
      await updatePatient(editingPatient.id, {
        registrationNumber: draft.registrationNumber.trim(),
        name: draft.name.trim(),
        birthDate,
        sex: draft.sex,
        roomBed: draft.patientType === 'consult' ? '협진' : draft.roomBed.trim(),
        attendingPhysician: draft.attendingPhysician.trim(),
        patientType: draft.patientType,
        tags: parseTags(draft.tagsText),
      });
      setEditPatientId(null);
      setSelectedPatientId(editingPatient.id);
      applyOptimisticPatientIdentity(setBriefingData, editingPatient, {
        name: draft.name.trim(),
        roomBed: draft.patientType === 'consult' ? '협진' : draft.roomBed.trim(),
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
      setAddError(formatUserFacingError(error, '환자를 삭제하지 못했습니다.'));
    } finally {
      setSavingPatient(false);
    }
  };

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

  const handleRemoveNote = async (noteId: string) => {
    await runWrite(async () => {
      await deleteNote(noteId);
      applyOptimisticRemoveNote(setBriefingData, noteId);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, '메모를 삭제하지 못했습니다.');
  };

  const handleAddAntibiotic = async (draft: {
    drugName: string;
    dosage: string;
    frequency: string;
    startDate: string;
  }) => {
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

  const handleRemoveAntibiotic = async (medicationId: string) => {
    await runWrite(async () => {
      await deleteMedication(medicationId);
      applyOptimisticRemoveAntibiotic(setBriefingData, medicationId);
      markLocalBriefingUpdated();
      queueBriefingRefresh();
    }, '항생제를 삭제하지 못했습니다.');
  };

  const handleAddLab = async (draft: {
    itemName: string;
    value: string;
    unit: string;
    flag: '' | 'H' | 'L';
    dateKey: string;
  }) => {
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

  const handleAddTodaySchedule = async (schedule: {
    title: string;
    category: string;
    scheduledTime?: string;
  }) => {
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
    const actionLabel = selectedPatient.status === 'discharged' ? '퇴원 취소' : '퇴원 처리';
    if (!window.confirm(`${selectedPatient.name} 환자를 ${actionLabel}할까요?`)) return;
    setArchivePending(true);
    try {
      await runWrite(async () => {
        if (selectedPatient.status === 'discharged') {
          await updatePatient(selectedPatient.id, { status: 'active', dischargeDate: undefined });
        } else {
          await dischargePatient(selectedPatient.id, new Date());
          applyOptimisticRemovePatientItems(setBriefingData, selectedPatient.id);
        }
        markLocalBriefingUpdated();
        await refreshAfterPatientWrite();
      }, '환자 상태를 변경하지 못했습니다.');
    } finally {
      setArchivePending(false);
    }
  };

  const handleLogout = useCallback(() => {
    if (!confirmWorkspaceNavigation()) return;
    logout();
    navigate('/login');
  }, [confirmWorkspaceNavigation, logout, navigate]);

  const handleOpenAddPatient = useCallback(() => {
    if (!confirmWorkspaceNavigation()) return false;
    setAddError(null);
    setAddOpen(true);
    return true;
  }, [confirmWorkspaceNavigation]);

  const handleOpenSettings = useCallback(() => {
    if (!confirmWorkspaceNavigation()) return;
    navigate('/settings');
  }, [confirmWorkspaceNavigation, navigate]);

  const handleOpenToday = useCallback(() => {
    if (!confirmWorkspaceNavigation()) return false;
    setSelectedPatientId(null);
    setSelectedTab('overview');
    setWorkspaceUnsaved(false);
    return true;
  }, [confirmWorkspaceNavigation]);

  const handleEditPatient = useCallback(() => {
    if (!selectedPatient || !confirmWorkspaceNavigation()) return;
    setAddError(null);
    setEditPatientId(selectedPatient.id);
  }, [confirmWorkspaceNavigation, selectedPatient]);

  const statusText = useMemo(
    () =>
      [
        patientsLoading && '환자 불러오는 중',
        briefingLoading && 'Today 갱신 중',
        !patientsLoading &&
          !briefingLoading &&
          lastBriefingUpdatedAt &&
          `갱신 ${formatClockTime(lastBriefingUpdatedAt)}`,
        patientsError,
        briefingError,
      ]
        .filter(Boolean)
        .join(' / '),
    [briefingError, briefingLoading, lastBriefingUpdatedAt, patientsError, patientsLoading]
  );

  return (
    <AppShellV2
      patients={patients}
      userName={currentUser?.name}
      selectedPatientId={selectedPatientId ?? undefined}
      patientIndicators={patientIndicators}
      searchValue={searchQuery}
      activeMobileAction={selectedPatientId ? 'patients' : 'today'}
      onSearchChange={setSearchQuery}
      onPatientSelect={openPatient}
      onToday={handleOpenToday}
      onAddPatient={handleOpenAddPatient}
      onSettings={handleOpenSettings}
      onLogout={handleLogout}
    >
      {writeError && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          <span>{writeError}</span>
          <button
            type="button"
            onClick={() => setWriteError(null)}
            className="rounded px-1.5 py-0.5 font-medium hover:bg-red-100"
          >
            닫기
          </button>
        </div>
      )}
      {selectedPatient ? (
        <PatientWorkspace
          patient={selectedPatient}
          data={displayedBriefingData}
          initialTab={selectedTab}
          onBack={handleOpenToday}
          onTabChange={setSelectedTab}
          onToggleAttention={handleToggleAttention}
          onEditPatient={handleEditPatient}
          onChartingDraftChange={handleChartingSave}
          onAddNote={handleAddNote}
          onRemoveNote={handleRemoveNote}
          onAddAntibiotic={handleAddAntibiotic}
          onRemoveAntibiotic={handleRemoveAntibiotic}
          onAddLab={handleAddLab}
          onRemoveLab={handleRemoveLab}
          onAddTodaySchedule={handleAddTodaySchedule}
          onRemoveTodaySchedule={handleRemoveTodaySchedule}
          onArchive={handleArchive}
          onUnsavedChange={setWorkspaceUnsaved}
          attentionPending={attentionPending}
          archivePending={archivePending}
        />
      ) : (
        <TodayDashboard
          data={displayedBriefingData}
          isLoading={patientsLoading || briefingLoading}
          subtitle={statusText || undefined}
          searchQuery={searchQuery}
          searchResults={searchResults}
          onOpenPatient={openPatient}
        />
      )}

      {addOpen && (
        <AddPatientPanel
          title="환자 추가"
          submitLabel="추가"
          error={addError}
          isSaving={savingPatient}
          onClose={() => setAddOpen(false)}
          onSubmit={handleCreatePatient}
        />
      )}
      {editingPatient && (
        <AddPatientPanel
          title="환자 정보 수정"
          submitLabel="저장"
          initialDraft={draftFromPatient(editingPatient)}
          error={addError}
          isSaving={savingPatient}
          onClose={() => setEditPatientId(null)}
          onSubmit={handleUpdatePatientInfo}
          onDelete={handleDeleteEditingPatient}
        />
      )}
    </AppShellV2>
  );
}

function AddPatientPanel({
  title,
  submitLabel,
  initialDraft = defaultAddPatientDraft,
  error,
  isSaving,
  onClose,
  onSubmit,
  onDelete,
}: {
  title: string;
  submitLabel: string;
  initialDraft?: AddPatientDraft;
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (draft: AddPatientDraft) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<AddPatientDraft>(initialDraft);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const birthDate = useMemo(() => parseDateInput(draft.birthDate), [draft.birthDate]);
  const hasValidBirthDate = useMemo(
    () => isValidBirthDateInput(draft.birthDate),
    [draft.birthDate]
  );
  const isDirty = useMemo(
    () => !areAddPatientDraftsEqual(draft, initialDraft),
    [draft, initialDraft]
  );
  const validationMessages = useMemo(() => buildAddPatientPanelValidationMessages(draft), [draft]);
  const canSubmit = useMemo(
    () =>
      Boolean(draft.registrationNumber.trim()) &&
      Boolean(draft.name.trim()) &&
      hasValidBirthDate &&
      (draft.patientType === 'consult' || Boolean(draft.roomBed.trim())),
    [draft.name, draft.patientType, draft.registrationNumber, draft.roomBed, hasValidBirthDate]
  );
  const showValidationSummary = submitAttempted && !canSubmit && validationMessages.length > 0;

  useEffect(() => {
    setDraft(initialDraft);
    setSubmitAttempted(false);
  }, [initialDraft]);

  const close = useCallback(() => {
    if (isSaving) return;
    if (isDirty && !window.confirm('입력 중인 환자 정보가 있습니다. 닫을까요?')) return;
    onClose();
  }, [isDirty, isSaving, onClose]);

  useEffect(() => {
    window.setTimeout(() => firstInputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  const update = useCallback(
    <Key extends keyof AddPatientDraft>(key: Key, value: AddPatientDraft[Key]) => {
      setDraft((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const submit = useCallback(() => {
    setSubmitAttempted(true);
    if (isSaving || !canSubmit) return;
    onSubmit({
      ...draft,
      roomBed: draft.roomBed.trim(),
      registrationNumber: draft.registrationNumber.trim(),
      name: draft.name.trim(),
      attendingPhysician: draft.attendingPhysician.trim(),
      tagsText: draft.tagsText.trim(),
    });
  }, [canSubmit, draft, isSaving, onSubmit]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-zinc-950/30 p-3 sm:items-center sm:justify-center">
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full rounded-lg border border-zinc-200 bg-white shadow-xl sm:max-w-xl"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        onKeyDown={(event) => {
          if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter' || isSaving) return;
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-[14px] font-medium text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={close}
            disabled={isSaving}
            className="rounded-md px-2 py-1 text-[12px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            닫기
          </button>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="병실">
            <Input
              inputRef={firstInputRef}
              value={draft.roomBed}
              disabled={draft.patientType === 'consult'}
              onChange={(value) => update('roomBed', value)}
              placeholder="301-1"
            />
          </Field>
          <Field label="등록번호">
            <Input
              value={draft.registrationNumber}
              inputMode="numeric"
              onChange={(value) =>
                update('registrationNumber', value.replace(/\D/g, '').slice(0, 12))
              }
            />
          </Field>
          <Field label="이름">
            <Input value={draft.name} onChange={(value) => update('name', value)} />
          </Field>
          <Field label="생년월일">
            <Input
              value={draft.birthDate}
              type="date"
              min="1900-01-01"
              max={formatDateInput(new Date())}
              onChange={(value) => update('birthDate', value)}
            />
            {birthDate && hasValidBirthDate && (
              <span className="font-mono text-[10.5px] text-zinc-400">
                {formatDetailedAge(birthDate)}
              </span>
            )}
            {draft.birthDate && !hasValidBirthDate && (
              <span className="text-[10.5px] text-red-600">1900년부터 오늘 사이로 입력</span>
            )}
          </Field>
          <Field label="성별">
            <select
              value={draft.sex}
              onChange={(event) => update('sex', event.target.value as 'M' | 'F')}
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
            >
              <option value="F">F</option>
              <option value="M">M</option>
            </select>
          </Field>
          <Field label="구분">
            <select
              value={draft.patientType}
              onChange={(event) => {
                const patientType = event.target.value as 'admitted' | 'consult';
                setDraft((current) => ({
                  ...current,
                  patientType,
                  roomBed: patientType === 'consult' ? '' : current.roomBed,
                }));
              }}
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
            >
              <option value="admitted">입원</option>
              <option value="consult">협진</option>
            </select>
          </Field>
          <Field label="주치의">
            <Input
              value={draft.attendingPhysician}
              onChange={(value) => update('attendingPhysician', value)}
            />
          </Field>
          <Field label="태그">
            <Input
              value={draft.tagsText}
              onChange={(value) => update('tagsText', value)}
              placeholder="#DM, #aspiration"
            />
          </Field>
        </div>
        {showValidationSummary && (
          <div className="mx-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            {validationMessages[0]}
          </div>
        )}
        {error && (
          <div className="mx-4 rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div>
            {onDelete && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isSaving}
                  title={patientArchiveHelpText}
                  className="h-8 rounded-md border border-red-200 px-3 text-[12px] font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {patientArchiveButtonLabel}
                </button>
                <p className="max-w-[220px] text-[11px] leading-relaxed text-zinc-500">
                  영구 삭제하지 않고 목록에서 숨깁니다.
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              disabled={isSaving}
              className="h-8 rounded-md border border-zinc-200 px-3 text-[12px] font-medium text-zinc-600 hover:bg-zinc-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving || !canSubmit}
              title={canSubmit ? undefined : validationMessages[0]}
              className="h-8 rounded-md bg-zinc-900 px-3 text-[12px] font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isSaving ? '저장 중' : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function Input({
  inputRef,
  value,
  type = 'text',
  placeholder,
  inputMode,
  disabled = false,
  min,
  max,
  onChange,
}: {
  inputRef?: React.Ref<HTMLInputElement>;
  value: string;
  type?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  disabled?: boolean;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      ref={inputRef}
      type={type}
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      disabled={disabled}
      min={min}
      max={max}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:bg-zinc-100 disabled:text-zinc-400"
    />
  );
}

function filterPatients(searchRows: PatientSearchRow[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return searchRows.filter((row) => row.text.includes(normalized)).map((row) => row.patient);
}

function buildPatientListIndexes(patients: Patient[]): PatientListIndexes {
  let total = 0;
  let admitted = 0;
  let consult = 0;
  const registrationNumbers = new Map<string, string>();
  const occupiedRoomBeds = new Map<string, string>();
  const patientsById = new Map<string, Patient>();
  const searchRows: PatientSearchRow[] = [];

  for (const patient of patients) {
    patientsById.set(patient.id, patient);
    const registrationNumber = normalizePatientKey(patient.registrationNumber);
    if (registrationNumber) registrationNumbers.set(registrationNumber, patient.id);

    if (patient.status === 'active') {
      total++;
      if (patient.patientType === 'admitted') admitted++;
      if (patient.patientType === 'consult') consult++;

      if (patient.patientType === 'admitted') {
        const roomBed = normalizePatientKey(patient.roomBed);
        if (roomBed) occupiedRoomBeds.set(roomBed, patient.id);
      }
    }

    searchRows.push({
      patient,
      text: [
        patient.roomBed,
        patient.name,
        patient.registrationNumber,
        patient.chiefComplaint,
        patient.attendingPhysician,
        ...(patient.tags ?? []),
      ]
        .join(' ')
        .toLowerCase(),
    });
  }

  return {
    summary: { total, admitted, consult },
    patientsById,
    registrationNumbers,
    occupiedRoomBeds,
    searchRows,
  };
}

function buildPatientIndicators(
  patientsById: Map<string, Patient>,
  data: BriefingData
): Record<string, PatientRailIndicators> {
  const indicators: Record<string, PatientRailIndicators> = {};

  for (const item of data.reminders) {
    if (!patientsById.has(item.patientId)) continue;
    (indicators[item.patientId] ??= {}).reminder = true;
  }
  for (const item of data.antibiotics) {
    if (!patientsById.has(item.patientId)) continue;
    (indicators[item.patientId] ??= {}).antibiotic = true;
  }
  for (const item of data.todaySchedules) {
    if (!patientsById.has(item.patientId)) continue;
    (indicators[item.patientId] ??= {}).schedule = true;
  }
  for (const item of data.recentLabs) {
    if (!patientsById.has(item.patientId)) continue;
    if (item.abnormalCount === 0) continue;
    (indicators[item.patientId] ??= {}).lab = true;
  }

  return indicators;
}

function applyOptimisticPatientIdentity(
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

function applyOptimisticRemovePatientItems(
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

function applyOptimisticNote(
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

function applyOptimisticRemoveNote(
  setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  noteId: string
) {
  setBriefingData((current) => ({
    ...current,
    reminders: removeBriefingItemByKey(current.reminders, 'noteId', noteId),
    progressNotes: removeBriefingItemByKey(current.progressNotes, 'noteId', noteId),
  }));
}

function applyOptimisticAntibiotic(
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

function applyOptimisticRemoveAntibiotic(
  setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  medicationId: string
) {
  setBriefingData((current) => ({
    ...current,
    antibiotics: removeBriefingItemByKey(current.antibiotics, 'medicationId', medicationId),
  }));
}

function applyOptimisticLab(
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

function applyOptimisticRemoveLab(
  _setBriefingData: Dispatch<SetStateAction<BriefingData>>,
  _patientId: string | undefined,
  _labId: string
) {
  // Lab summaries do not carry individual result IDs, so the precise removal is confirmed by refresh.
}

function applyOptimisticSchedule(
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

function applyOptimisticRemoveSchedule(
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

function daysBetweenCalendarDates(startDate: Date, endDate: Date) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function validatePatientDraft(
  draft: AddPatientDraft,
  indexes: PatientListIndexes,
  excludePatientId?: string
) {
  if (draft.patientType === 'admitted' && !draft.roomBed.trim()) return '병실을 입력해주세요.';
  if (!draft.registrationNumber.trim()) return '등록번호를 입력해주세요.';
  if (!draft.name.trim()) return '이름을 입력해주세요.';
  if (!isValidBirthDateInput(draft.birthDate)) return '생년월일을 확인해주세요.';

  const registrationNumberOwner = indexes.registrationNumbers.get(
    normalizePatientKey(draft.registrationNumber)
  );
  if (registrationNumberOwner && registrationNumberOwner !== excludePatientId) {
    return '이미 같은 등록번호의 환자가 있습니다.';
  }

  const roomBedOwner = indexes.occupiedRoomBeds.get(normalizePatientKey(draft.roomBed));
  if (draft.patientType === 'admitted' && roomBedOwner && roomBedOwner !== excludePatientId) {
    return '이미 사용 중인 병실입니다.';
  }

  return null;
}

function normalizePatientKey(value: string) {
  return value.trim().toLowerCase();
}

function areAddPatientDraftsEqual(left: AddPatientDraft, right: AddPatientDraft) {
  return (
    left.roomBed === right.roomBed &&
    left.name === right.name &&
    left.registrationNumber === right.registrationNumber &&
    left.birthDate === right.birthDate &&
    left.sex === right.sex &&
    left.patientType === right.patientType &&
    left.attendingPhysician === right.attendingPhysician &&
    left.tagsText === right.tagsText
  );
}

function buildAddPatientPanelValidationMessages(draft: AddPatientDraft) {
  const messages: string[] = [];
  if (!draft.name.trim()) messages.push('이름을 입력해주세요.');
  if (!draft.registrationNumber.trim()) messages.push('등록번호를 입력해주세요.');
  if (draft.patientType === 'admitted' && !draft.roomBed.trim())
    messages.push('병실을 입력해주세요.');
  if (!isValidBirthDateInput(draft.birthDate))
    messages.push('생년월일은 1900년부터 오늘 사이로 입력해주세요.');
  return messages;
}

function isValidBirthDateInput(value: string) {
  const date = parseDateInput(value);
  if (!date) return false;
  return isDateInRange(date, new Date(1900, 0, 1), new Date());
}

function isValidClinicalDateInput(value: string) {
  const date = parseDateInput(value);
  if (!date) return false;
  return isDateInRange(date, new Date(1900, 0, 1), new Date());
}

function draftFromPatient(patient: Patient): AddPatientDraft {
  return {
    roomBed: patient.patientType === 'consult' ? '' : patient.roomBed,
    name: patient.name,
    registrationNumber: patient.registrationNumber,
    birthDate: formatDateInput(patient.birthDate),
    sex: patient.sex,
    patientType: patient.patientType,
    attendingPhysician: patient.attendingPhysician,
    tagsText: patient.tags?.join(', ') ?? '',
  };
}

function parseTags(value: string) {
  return value
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
}

function isWorkspaceTabId(value: string): value is WorkspaceTabId {
  return ['overview', 'charting', 'lab', 'medications', 'notes', 'schedule'].includes(value);
}

function todayKey() {
  return formatDateInput(new Date());
}
