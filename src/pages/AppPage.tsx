import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PatientWorkspace } from '@/components/workspace/PatientWorkspace';
import { type WorkspaceTabId } from '@/components/workspace/WorkspaceTabs';
import { TodayDashboard } from '@/components/today/TodayDashboard';
import { RoundingBoard } from '@/components/rounding/RoundingBoard';
import { formatClockTime } from '@/components/clinical/dateLabels';
import { AddPatientPanel } from '@/components/patient/AddPatientPanel';
import { PatientStatusDialog } from '@/components/patient/PatientStatusDialog';
import { LabImportDialog } from '@/components/lab/LabImportDialog';
import { VoiceQueryButton } from '@/components/voice/VoiceQueryButton';
import { ConversationNoteDialog } from '@/components/conversation/ConversationNoteDialog';
import { useAIStore } from '@/stores/useAIStore';
import { formatUserFacingError } from '@/lib/errorMessages';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLabStore } from '@/stores/useLabStore';
import { useMedicationStore } from '@/stores/useMedicationStore';
import { usePatientStore } from '@/stores/usePatientStore';
import { useAlertEvaluation } from '@/hooks/useAlertEvaluation';
import { useAlertStore } from '@/stores/useAlertStore';
import { useBriefingData } from '@/hooks/useBriefingData';
import { useClinicalWriters } from '@/hooks/useClinicalWriters';
import { usePatientWriters } from '@/hooks/usePatientWriters';
import type { BulkImportResult } from '@/services/bulkLabImport';
import {
  buildPatientIndexes as buildPatientListIndexes,
  buildPatientIndicators,
  filterPatients,
} from '@/features/app/patientIndexes';
import { createDefaultAddPatientDraft, draftFromPatient } from '@/features/app/patientDraft';

export default function AppPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const {
    patients,
    isLoading: patientsLoading,
    error: patientsError,
    fetchPatients,
  } = usePatientStore();
  const { medications, fetchMedicationsByPatient } = useMedicationStore();
  const aiConfigured = useAIStore((store) => store.isConfigured());
  const { labs, fetchLabsByPatient } = useLabStore();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<WorkspaceTabId>('overview');
  // 환자를 열지 않았을 때 가운데에 무엇을 띄울지. 회진 모드는 Today와 나란한 화면이다.
  const [mainView, setMainView] = useState<'today' | 'rounding'>('today');
  // 회진 중 보던 병동 — 환자를 열었다 돌아와도 같은 병동으로 돌아오게 한다.
  const [roundingWard, setRoundingWard] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editPatientId, setEditPatientId] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [labImportOpen, setLabImportOpen] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [workspaceUnsaved, setWorkspaceUnsaved] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const {
    briefingData,
    setBriefingData,
    briefingLoading,
    briefingError,
    lastBriefingUpdatedAt,
    loadBriefingData,
    loadData,
    markLocalBriefingUpdated,
  } = useBriefingData({
    currentUser,
    fetchPatients,
    hasUnsavedWork: workspaceUnsaved,
  });

  // 알림 규칙을 불러오고 활성 환자 데이터에 대해 평가한다 (규칙이 없으면 아무 쿼리도 하지 않는다).
  // 브리핑이 갱신될 때마다 다시 평가해, Lab을 새로 넣으면 회진 뱃지도 따라 바뀌게 한다.
  useAlertEvaluation({
    ownerId: currentUser?.id,
    patients,
    enabled: Boolean(currentUser),
    refreshKey: lastBriefingUpdatedAt?.getTime(),
  });
  const openLabBreaches = useAlertStore((store) => store.openLabBreaches);

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

  const runWrite = useCallback(async (action: () => Promise<void>, fallbackMessage: string) => {
    setWriteError(null);
    try {
      await action();
    } catch (error) {
      setWriteError(formatUserFacingError(error, fallbackMessage));
      throw error;
    }
  }, []);

  const {
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
  } = usePatientWriters({
    currentUserId: currentUser?.id,
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
  });

  const {
    handleChartingSave,
    handleSaveStandingOrders,
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
  } = useClinicalWriters({
    selectedPatient,
    labs,
    setBriefingData,
    markLocalBriefingUpdated,
    queueBriefingRefresh,
    runWrite,
  });


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
  }, [confirmWorkspaceNavigation, setAddError]);

  const handleOpenSettings = useCallback(() => {
    if (!confirmWorkspaceNavigation()) return;
    navigate('/settings');
  }, [confirmWorkspaceNavigation, navigate]);

  const handleOpenToday = useCallback(() => {
    if (!confirmWorkspaceNavigation()) return false;
    setSelectedPatientId(null);
    setSelectedTab('overview');
    setMainView('today');
    setWorkspaceUnsaved(false);
    return true;
  }, [confirmWorkspaceNavigation]);

  const handleOpenRounding = useCallback(() => {
    if (!confirmWorkspaceNavigation()) return false;
    setSelectedPatientId(null);
    setSelectedTab('overview');
    setMainView('rounding');
    setWorkspaceUnsaved(false);
    return true;
  }, [confirmWorkspaceNavigation]);

  /** 워크스페이스에서 뒤로 — 열기 전에 보던 화면(Today 또는 회진)으로 돌아간다. */
  const handleBackFromPatient = useCallback(() => {
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
  }, [confirmWorkspaceNavigation, selectedPatient, setAddError]);

  const handleOpenLabImport = useCallback(() => {
    setLabImportOpen(true);
  }, []);

  const handleOpenConversationNotes = useCallback(() => {
    setConversationOpen(true);
  }, []);

  // 대화 정리에서 저장하는 경로는 기존 메모 저장 핸들러를 그대로 쓴다.
  const addConversationNote = useCallback(
    async (patientId: string, content: string) => {
      await handleAddNoteForPatient(patientId, content);
    },
    [handleAddNoteForPatient]
  );

  const handleLabImportComplete = useCallback(
    (_result: BulkImportResult) => {
      markLocalBriefingUpdated();
      queueBriefingRefresh();
      if (selectedPatientId) {
        void fetchLabsByPatient(selectedPatientId);
      }
    },
    [fetchLabsByPatient, markLocalBriefingUpdated, queueBriefingRefresh, selectedPatientId]
  );

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
    <AppShell
      patients={patients}
      userName={currentUser?.name}
      selectedPatientId={selectedPatientId ?? undefined}
      patientIndicators={patientIndicators}
      searchValue={searchQuery}
      activeMobileAction={
        selectedPatientId ? 'patients' : mainView === 'rounding' ? 'rounding' : 'today'
      }
      onSearchChange={setSearchQuery}
      onPatientSelect={openPatient}
      onToday={handleOpenToday}
      onOpenRounding={handleOpenRounding}
      onAddPatient={handleOpenAddPatient}
      onOpenLabImport={handleOpenLabImport}
      onOpenConversationNotes={aiConfigured ? handleOpenConversationNotes : undefined}
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
          labResults={labs}
          medications={medications}
          initialTab={selectedTab}
          onBack={handleBackFromPatient}
          onTabChange={setSelectedTab}
          onToggleAttention={handleToggleAttention}
          onEditPatient={handleEditPatient}
          onChartingDraftChange={handleChartingSave}
          onSaveStandingOrders={handleSaveStandingOrders}
          onAddNote={handleAddNote}
          onRemoveNote={handleRemoveNote}
          onAddAntibiotic={handleAddAntibiotic}
          onAddMedication={handleAddMedication}
          onSaveParsedMedications={handleSaveParsedMedications}
          onRemoveAntibiotic={handleRemoveAntibiotic}
          onRemoveMedication={handleRemoveMedication}
          onAddLab={handleAddLab}
          onRemoveLab={handleRemoveLab}
          onUpdateLabValue={handleUpdateLabValue}
          onDeleteLabDate={handleDeleteLabDate}
          onSaveParsedLabs={handleSaveParsedLabs}
          onLoadLabs={fetchLabsByPatient}
          onLoadMedications={fetchMedicationsByPatient}
          onAddTodaySchedule={handleAddTodaySchedule}
          onRemoveTodaySchedule={handleRemoveTodaySchedule}
          onArchive={handleArchive}
          onUnsavedChange={setWorkspaceUnsaved}
          attentionPending={attentionPending}
          archivePending={archivePending}
        />
      ) : mainView === 'rounding' ? (
        <RoundingBoard
          patients={patients}
          briefing={displayedBriefingData}
          breaches={openLabBreaches}
          activeWard={roundingWard}
          isLoading={patientsLoading || briefingLoading}
          subtitle={statusText || undefined}
          onWardChange={setRoundingWard}
          onOpenPatient={openPatient}
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
          initialDraft={createDefaultAddPatientDraft()}
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
      {selectedPatient && archiveDialog && (
        <PatientStatusDialog
          patientName={selectedPatient.name}
          mode={archiveDialog.mode}
          initialDateKey={archiveDialog.dateKey}
          isSaving={archivePending}
          onClose={() => {
            if (!archivePending) setArchiveDialog(null);
          }}
          onConfirm={handleConfirmArchiveDialog}
        />
      )}
      {labImportOpen && (
        <LabImportDialog
          onClose={() => setLabImportOpen(false)}
          onComplete={handleLabImportComplete}
        />
      )}

      {conversationOpen && (
        <ConversationNoteDialog
          onClose={() => setConversationOpen(false)}
          onAddNote={addConversationNote}
        />
      )}

      {/* 회진 중 어디서든 쓸 수 있도록 Today/워크스페이스 양쪽에서 떠 있는 버튼 (position: fixed) */}
      <VoiceQueryButton onOpenPatient={openPatient} />
    </AppShell>
  );
}


function isWorkspaceTabId(value: string): value is WorkspaceTabId {
  return ['overview', 'charting', 'lab', 'medications', 'notes', 'schedule'].includes(value);
}
