import { useCallback, useEffect, useMemo, useState } from 'react';
import { ContextPanel } from './ContextPanel';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceTabs, type WorkspaceTabId } from './WorkspaceTabs';
import { ChartingTab } from './tabs/ChartingTab';
import { LabTab } from './tabs/LabTab';
import { MedicationTab } from './tabs/MedicationTab';
import { NotesTab } from './tabs/NotesTab';
import { OverviewTab } from './tabs/OverviewTab';
import { ScheduleTab } from './tabs/ScheduleTab';
import type { PatientWorkspaceProps } from './types';
import { buildTabBadges, createChartingDraft } from './workspaceData';

export type {
  ChartingDraft,
  PatientWorkspaceInteractionState,
  PatientWorkspaceManualLab,
  PatientWorkspaceProps,
} from './types';

export function PatientWorkspace({
  patient,
  data,
  manualLabs = [],
  labResults = [],
  medications = [],
  initialTab = 'overview',
  initialChartingDraft,
  onBack,
  onTabChange,
  onToggleAttention,
  onEditPatient,
  onChartingDraftChange,
  onSaveStandingOrders,
  onAddNote,
  onRemoveNote,
  onAddAntibiotic,
  onAddMedication,
  onSaveParsedMedications,
  onRemoveAntibiotic,
  onRemoveMedication,
  onUpdateLabValue,
  onDeleteLabDate,
  onRemoveLab,
  onSaveParsedLabs,
  onLoadLabs,
  onAddTodaySchedule,
  onRemoveTodaySchedule,
  onLoadMedications,
  onUnsavedChange,
  onArchive,
  attentionPending,
  archivePending,
}: PatientWorkspaceProps) {
  const [tab, setTab] = useState<WorkspaceTabId>(initialTab);
  const [dirty, setDirty] = useState(false);
  // 차팅 초안은 환자 객체 참조가 아니라 실제 차팅 필드가 바뀔 때만 다시 만든다.
  // (백그라운드 갱신으로 patient 참조만 바뀌어도 입력 중인 초안이 리셋되지 않도록.)
  const chartingDraft = useMemo(
    () => initialChartingDraft ?? createChartingDraft(patient),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      initialChartingDraft,
      patient.chiefComplaint,
      patient.onset,
      patient.presentIllness,
      patient.pastHistory,
      patient.reviewOfSystem,
      patient.physicalExam,
      patient.problemList,
      patient.plan,
      patient.guardianExplanation,
      patient.etc,
    ]
  );
  const tabBadges = useMemo(() => buildTabBadges(patient.id, data), [patient.id, data]);

  // 딥링크 등 외부에서 탭이 바뀌는 경로는 handleTabChange를 거치지 않으므로
  // 여기서도 이전 탭의 미저장 상태를 함께 정리한다.
  useEffect(() => {
    setTab(initialTab);
    setDirty(false);
  }, [initialTab]);
  // 환자가 바뀌면 이전 환자의 미저장 상태를 이어받지 않는다.
  useEffect(() => setDirty(false), [patient.id]);
  useEffect(() => onUnsavedChange?.(dirty), [dirty, onUnsavedChange]);
  useEffect(() => () => onUnsavedChange?.(false), [onUnsavedChange]);

  const handleTabChange = useCallback(
    (next: WorkspaceTabId) => {
      if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 이동할까요?')) return;
      setDirty(false);
      setTab(next);
      onTabChange?.(next);
    },
    [dirty, onTabChange]
  );

  return (
    <div className="flex min-h-full bg-white">
      <div className="min-w-0 flex-1">
        <WorkspaceHeader
          patient={patient}
          onBack={onBack}
          onToggleAttention={onToggleAttention}
          onEdit={onEditPatient}
          onArchive={onArchive}
          attentionPending={attentionPending}
          archivePending={archivePending}
        />
        <WorkspaceTabs
          value={tab}
          unsavedTabs={dirty ? [tab] : []}
          tabBadges={tabBadges}
          onChange={handleTabChange}
        />
        <div className="space-y-3 p-3 sm:p-4">
          {tab === 'overview' && (
            <OverviewTab
              patient={patient}
              data={data}
              onOpenTab={handleTabChange}
              onDirtyChange={setDirty}
              onSaveStandingOrders={onSaveStandingOrders}
            />
          )}
          {tab === 'charting' && (
            <ChartingTab
              initialDraft={chartingDraft}
              onDirtyChange={setDirty}
              onSave={async (nextDraft) => {
                await onChartingDraftChange?.(nextDraft);
                setDirty(false);
              }}
            />
          )}
          {tab === 'lab' && (
            <LabTab
              patient={patient}
              data={data}
              manualLabs={manualLabs}
              labResults={labResults}
              onUpdateLabValue={onUpdateLabValue}
              onDeleteLabDate={onDeleteLabDate}
              onRemoveLab={onRemoveLab}
              onSaveParsedLabs={onSaveParsedLabs}
              onLoadLabs={onLoadLabs}
              onDirtyChange={setDirty}
            />
          )}
          {tab === 'medications' && (
            <MedicationTab
              patient={patient}
              data={data}
              medications={medications}
              onAddAntibiotic={onAddAntibiotic}
              onAddMedication={onAddMedication}
              onSaveParsedMedications={onSaveParsedMedications}
              onRemoveAntibiotic={onRemoveAntibiotic}
              onRemoveMedication={onRemoveMedication}
              onLoadMedications={onLoadMedications}
              onDirtyChange={setDirty}
            />
          )}
          {tab === 'notes' && (
            <NotesTab
              patient={patient}
              data={data}
              onAddNote={onAddNote}
              onRemoveNote={onRemoveNote}
              onDirtyChange={setDirty}
            />
          )}
          {tab === 'schedule' && (
            <ScheduleTab
              patient={patient}
              data={data}
              onAddTodaySchedule={onAddTodaySchedule}
              onRemoveTodaySchedule={onRemoveTodaySchedule}
              onDirtyChange={setDirty}
            />
          )}
        </div>
      </div>
      <ContextPanel patientId={patient.id} data={data} onOpenTab={handleTabChange} />
    </div>
  );
}
