import {
  useCallback,
  useEffect,
  Fragment,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { Bot, Check, Copy, Loader2, X } from 'lucide-react';
import type { Patient } from '@/db/database';
import type { BriefingData } from '@/services/briefingService';
import { LabParseInput } from '@/components/lab/LabParseInput';
import { TemplatePopup } from '@/components/charting/TemplatePopup';
import { generateSOAP } from '@/services/aiService';
import type { ParsedLabItem } from '@/services/parser/labParser';
import { parseOCSMedication, type ParsedMedication } from '@/services/parser/medParser';
import type { TemplateField } from '@/services/templateService';
import { DEFAULT_LAB_CATEGORIES, labCategoryService } from '@/services/labCategoryService';
import { useAIStore } from '@/stores/useAIStore';
import { getLabReferenceByName } from '@/utils/labReference';
import type { LabResult } from '@/types/lab';
import type { Medication } from '@/types/medication';
import { ClinicalRow } from '../clinical/ClinicalRow';
import { CopyBar } from '../clinical/CopyBar';
import { DataSection } from '../clinical/DataSection';
import {
  formatClockTime,
  formatDateInput,
  formatOnsetElapsedText,
  isDateInRange,
  parseDateInput,
} from '../clinical/dateLabels';
import { ContextPanel } from './ContextPanel';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceTabs, type WorkspaceTabId } from './WorkspaceTabs';

interface PatientWorkspaceProps {
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
  onAddAntibiotic?: (draft: {
    drugName: string;
    dosage: string;
    frequency: string;
    startDate: string;
  }) => void | Promise<void>;
  onAddMedication?: (draft: {
    category: 'hospital' | 'personal';
    drugName: string;
    singleDose: string;
    frequency: '#1' | '#2' | '#3' | '#4';
    schedule: string;
    timing: string;
    notes: string;
  }) => void | Promise<void>;
  onSaveParsedMedications?: (
    category: 'hospital' | 'personal',
    medications: ParsedMedication[]
  ) => void | Promise<void>;
  onSaveParsedLabs?: (
    items: ParsedLabItem[],
    testDate: Date,
    source: 'parsed'
  ) => void | Promise<void>;
  onAddLab?: (draft: {
    itemName: string;
    value: string;
    unit: string;
    flag: '' | 'H' | 'L';
    dateKey: string;
  }) => void | Promise<void>;
  onUpdateLabValue?: (input: {
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
  }) => void | Promise<void>;
  onDeleteLabDate?: (dateKey: string) => void | Promise<void>;
  onRemoveLab?: (lab: PatientWorkspaceManualLab) => void | Promise<void>;
  onLoadLabs?: (patientId: string) => void | Promise<void>;
  onLoadMedications?: (patientId: string) => void | Promise<void>;
  onAddTodaySchedule?: (schedule: {
    title: string;
    category: string;
    scheduledTime?: string;
  }) => void | Promise<void>;
  onRemoveTodaySchedule?: (scheduleId: string) => void | Promise<void>;
  onRemoveAntibiotic?: (medicationId: string) => void | Promise<void>;
  onRemoveMedication?: (medicationId: string) => void | Promise<void>;
  onUnsavedChange?: (hasUnsavedChanges: boolean) => void;
  onArchive?: () => void;
  attentionPending?: boolean;
  archivePending?: boolean;
}

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
  onAddNote,
  onRemoveNote,
  onAddAntibiotic,
  onAddMedication,
  onSaveParsedMedications,
  onRemoveAntibiotic,
  onRemoveMedication,
  onAddLab,
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
  const chartingDraft = useMemo(
    () => initialChartingDraft ?? createChartingDraft(patient),
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

  useEffect(() => setTab(initialTab), [initialTab]);
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
            <OverviewTab patient={patient} data={data} onOpenTab={handleTabChange} />
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
              onAddLab={onAddLab}
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

function OverviewTab({
  patient,
  data,
  onOpenTab,
}: {
  patient: Patient;
  data: BriefingData;
  onOpenTab: (tab: WorkspaceTabId) => void;
}) {
  const rows = useMemo(() => getPatientRows(patient.id, data), [patient.id, data]);
  const handoffLines = useMemo(() => buildHandoffLines(patient, rows), [patient, rows]);

  return (
    <div className="space-y-3">
      <CopyBar
        title="인계 요약 복사"
        text={handoffLines.join('\n')}
        emptyText="복사할 인계 내용 없음"
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <DataSection title="차팅 요약">
          <ClinicalRow
            prefix="C/C"
            title={patient.chiefComplaint || '-'}
            detail={formatOnsetElapsedText(patient.onset) ?? undefined}
            onClick={() => onOpenTab('charting')}
          />
          <ClinicalRow
            prefix="PI"
            title={patient.presentIllness || '-'}
            onClick={() => onOpenTab('charting')}
          />
          <ClinicalRow
            prefix="Plan"
            title={patient.plan || '-'}
            onClick={() => onOpenTab('charting')}
          />
        </DataSection>
        <DataSection title="오늘 큐" count={rows.queue.length}>
          {rows.queue.length === 0 ? (
            <ClinicalRow prefix="-" title="0" detail="오늘 표시할 큐 없음" />
          ) : (
            rows.queue.map((item) => (
              <ClinicalRow
                key={item.key}
                prefix={item.prefix}
                title={item.title}
                detail={item.detail}
                tone={item.tone}
                onClick={() => onOpenTab(item.tab)}
              />
            ))
          )}
        </DataSection>
      </div>
    </div>
  );
}

function ChartingTab({
  initialDraft,
  onSave,
  onDirtyChange,
}: {
  initialDraft: ChartingDraft;
  onSave?: (draft: ChartingDraft) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [templatePopup, setTemplatePopup] = useState<{
    field: TemplateField;
    label: string;
    key: keyof ChartingDraft;
  } | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const isDirty = !areDraftsEqual(draft, initialDraft);
  const copyText = buildChartingCopy(draft);

  useEffect(() => setDraft(initialDraft), [initialDraft]);
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  const update = (field: keyof ChartingDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await onSave?.(draft);
      setSavedAt(new Date());
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <CopyBar title="OCS 복사" text={copyText} emptyText="복사할 차팅 내용 없음" />
      {templatePopup && (
        <TemplatePopup
          open
          field={templatePopup.field}
          fieldLabel={templatePopup.label}
          currentContent={String(draft[templatePopup.key] ?? '')}
          onClose={() => setTemplatePopup(null)}
          onApply={(content) => update(templatePopup.key, content)}
        />
      )}
      <DataSection
        title="차팅"
        action={
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className={isDirty ? 'text-amber-600' : 'text-zinc-400'}>
              {isDirty ? '미저장' : '저장됨'}
            </span>
            {savedAt && (
              <span className="font-mono tabular-nums">저장 {formatClockTime(savedAt)}</span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!isDirty || saving}
              className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white disabled:bg-zinc-300"
            >
              {saving ? '저장 중' : '저장'}
            </button>
          </div>
        }
      >
        <div
          className="grid gap-2 p-2 lg:grid-cols-2"
          onKeyDown={(event) => {
            if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
            event.preventDefault();
            save();
          }}
        >
          <ChartField
            label="C/C"
            value={draft.chiefComplaint}
            rows={2}
            onChange={(value) => update('chiefComplaint', value)}
            onTemplate={() =>
              setTemplatePopup({ field: 'chiefComplaint', label: 'C/C', key: 'chiefComplaint' })
            }
          />
          <ChartField
            label="Onset"
            value={draft.onset}
            rows={1}
            onChange={(value) => update('onset', value)}
            placeholder="YYYY-MM-DD 또는 자유 입력"
            onTemplate={() => setTemplatePopup({ field: 'onset', label: 'Onset', key: 'onset' })}
          />
          <ChartField
            label="P/I"
            value={draft.presentIllness}
            rows={4}
            onChange={(value) => update('presentIllness', value)}
            onTemplate={() =>
              setTemplatePopup({ field: 'presentIllness', label: 'P/I', key: 'presentIllness' })
            }
          />
          <ChartField
            label="P/H"
            value={draft.pastHistory}
            rows={3}
            onChange={(value) => update('pastHistory', value)}
            onTemplate={() =>
              setTemplatePopup({ field: 'pastHistory', label: 'P/H', key: 'pastHistory' })
            }
          />
          <ChartField
            label="ROS"
            value={draft.reviewOfSystem}
            rows={3}
            onChange={(value) => update('reviewOfSystem', value)}
            onTemplate={() =>
              setTemplatePopup({ field: 'reviewOfSystem', label: 'ROS', key: 'reviewOfSystem' })
            }
          />
          <ChartField
            label="P/Ex"
            value={draft.physicalExam}
            rows={3}
            onChange={(value) => update('physicalExam', value)}
            onTemplate={() =>
              setTemplatePopup({ field: 'physicalExam', label: 'P/Ex', key: 'physicalExam' })
            }
          />
          <ChartField
            label="Problem"
            value={draft.problemListText}
            rows={4}
            onChange={(value) => update('problemListText', value)}
            placeholder="한 줄에 하나씩 입력"
          />
          <ChartField
            label="Plan"
            value={draft.plan}
            rows={4}
            onChange={(value) => update('plan', value)}
            onTemplate={() => setTemplatePopup({ field: 'plan', label: 'Plan', key: 'plan' })}
          />
          <ChartField
            label="보호자설명"
            value={draft.guardianExplanation}
            rows={3}
            onChange={(value) => update('guardianExplanation', value)}
            onTemplate={() =>
              setTemplatePopup({
                field: 'guardianExplanation',
                label: '보호자설명',
                key: 'guardianExplanation',
              })
            }
          />
          <ChartField
            label="Etc"
            value={draft.etc}
            rows={3}
            onChange={(value) => update('etc', value)}
            onTemplate={() => setTemplatePopup({ field: 'etc', label: 'Etc', key: 'etc' })}
          />
        </div>
      </DataSection>
    </div>
  );
}

function LabTab({
  patient,
  data,
  manualLabs,
  labResults,
  onAddLab: _onAddLab,
  onUpdateLabValue,
  onDeleteLabDate,
  onRemoveLab,
  onSaveParsedLabs,
  onLoadLabs,
  onDirtyChange,
}: {
  patient: Patient;
  data: BriefingData;
  manualLabs: PatientWorkspaceManualLab[];
  labResults: LabResult[];
  onAddLab?: PatientWorkspaceProps['onAddLab'];
  onUpdateLabValue?: PatientWorkspaceProps['onUpdateLabValue'];
  onDeleteLabDate?: PatientWorkspaceProps['onDeleteLabDate'];
  onRemoveLab?: PatientWorkspaceProps['onRemoveLab'];
  onSaveParsedLabs?: PatientWorkspaceProps['onSaveParsedLabs'];
  onLoadLabs?: PatientWorkspaceProps['onLoadLabs'];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const standardLabItems = useMemo(() => buildStandardLabItemOptions(), []);
  const standardLabCategories = useMemo(
    () => Array.from(new Set(standardLabItems.map((item) => item.category))),
    [standardLabItems]
  );
  const [newItemDraft, setNewItemDraft] = useState({
    category: standardLabCategories[0] ?? 'CBC',
    itemName: standardLabItems[0]?.name ?? '',
    value: '',
    dateKey: formatDateInput(new Date()),
  });
  const [editingCell, setEditingCell] = useState<{
    dateKey: string;
    itemName: string;
    value: string;
  } | null>(null);
  const [addingDateKey, setAddingDateKey] = useState('');
  const [parseOpen, setParseOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const labs = useMemo(
    () => data.recentLabs.filter((item) => item.patientId === patient.id),
    [data.recentLabs, patient.id]
  );
  const visibleManualLabs = useMemo(
    () => manualLabs.filter((item) => item.patientId === patient.id),
    [manualLabs, patient.id]
  );
  const hasValidDate = isClinicalDateInput(newItemDraft.dateKey);
  const hasDraft = Boolean(newItemDraft.itemName.trim() && newItemDraft.value.trim());

  useEffect(() => {
    setNewItemDraft({
      category: standardLabCategories[0] ?? 'CBC',
      itemName: standardLabItems[0]?.name ?? '',
      value: '',
      dateKey: formatDateInput(new Date()),
    });
    setEditingCell(null);
    setAddingDateKey('');
    setParseOpen(false);
    setSaving(false);
  }, [patient.id, standardLabCategories, standardLabItems]);
  useEffect(() => {
    void onLoadLabs?.(patient.id);
  }, [onLoadLabs, patient.id]);
  useEffect(() => onDirtyChange?.(hasDraft), [hasDraft, onDirtyChange]);
  const table = useMemo(
    () =>
      buildLabValueTable(
        labResults.filter((lab) => lab.patientId === patient.id && lab.category !== 'Culture'),
        isClinicalDateInput(addingDateKey) ? addingDateKey : undefined
      ),
    [addingDateKey, labResults, patient.id]
  );
  const cultureResults = useMemo(
    () =>
      labResults
        .filter((lab) => lab.patientId === patient.id && lab.category === 'Culture')
        .sort((a, b) => b.testDate.getTime() - a.testDate.getTime()),
    [labResults, patient.id]
  );

  const saveStandardLabItem = useCallback(async () => {
    if (!hasDraft || !hasValidDate || saving) return;
    setSaving(true);
    try {
      const option = standardLabItems.find((item) => item.name === newItemDraft.itemName);
      await onUpdateLabValue?.({
        dateKey: newItemDraft.dateKey,
        itemName: newItemDraft.itemName,
        value: newItemDraft.value,
        metadata: option
          ? {
              code: option.code,
              category: option.category,
              unit: option.unit,
              referenceMin: option.referenceMin,
              referenceMax: option.referenceMax,
            }
          : undefined,
      });
      setNewItemDraft((current) => ({
        ...current,
        value: '',
        dateKey: formatDateInput(new Date()),
      }));
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [hasDraft, hasValidDate, newItemDraft, onUpdateLabValue, saving, standardLabItems]);

  const saveEditedCell = useCallback(async () => {
    if (!editingCell || saving) return;
    setSaving(true);
    try {
      const option = standardLabItems.find((item) => item.name === editingCell.itemName);
      await onUpdateLabValue?.({
        dateKey: editingCell.dateKey,
        itemName: editingCell.itemName,
        value: editingCell.value,
        metadata: option
          ? {
              code: option.code,
              category: option.category,
              unit: option.unit,
              referenceMin: option.referenceMin,
              referenceMax: option.referenceMax,
            }
          : undefined,
      });
      setEditingCell(null);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [editingCell, onUpdateLabValue, saving, standardLabItems]);

  const deleteLabDate = useCallback(
    async (dateKey: string) => {
      if (!onDeleteLabDate || saving) return;
      if (!window.confirm(`${dateKey} Lab 결과를 삭제할까요?`)) return;
      setSaving(true);
      try {
        await onDeleteLabDate(dateKey);
      } finally {
        setSaving(false);
      }
    },
    [onDeleteLabDate, saving]
  );

  const saveParsedLabs = useCallback(
    async (items: ParsedLabItem[], testDate: Date) => {
      await onSaveParsedLabs?.(items, testDate, 'parsed');
      setParseOpen(false);
      await onLoadLabs?.(patient.id);
    },
    [onLoadLabs, onSaveParsedLabs, patient.id]
  );

  return (
    <div className="space-y-3">
      <DataSection title="Lab 수치 표" count={table.itemRows.length}>
        {table.itemRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
            <Input
              value={addingDateKey}
              type="date"
              min="1900-01-01"
              max={formatDateInput(new Date())}
              invalid={Boolean(addingDateKey) && !isClinicalDateInput(addingDateKey)}
              onChange={setAddingDateKey}
            />
            {addingDateKey && isClinicalDateInput(addingDateKey) && (
              <span className="text-[11px] text-zinc-500">
                빈 칸의 + 버튼으로 {addingDateKey} 값을 추가
              </span>
            )}
            {addingDateKey && (
              <button
                type="button"
                onClick={() => setAddingDateKey('')}
                className="h-8 rounded-md border border-zinc-200 px-2 text-[11px] text-zinc-500 hover:bg-zinc-50"
              >
                취소
              </button>
            )}
          </div>
        )}
        {table.itemRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-[11px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border-b border-zinc-200 bg-white px-2 py-1.5 text-left font-medium text-zinc-500">
                    항목
                  </th>
                  {table.dates.map((date) => (
                    <th
                      key={date}
                      className="border-b border-zinc-200 px-2 py-1.5 text-right font-mono font-medium text-zinc-500"
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        <span>{date}</span>
                        {table.dateLabIds.get(date)?.length ? (
                          <button
                            type="button"
                            onClick={() => void deleteLabDate(date)}
                            disabled={saving}
                            className="inline-flex h-4 w-4 items-center justify-center rounded text-[10px] text-zinc-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed"
                            aria-label={`${date} Lab 삭제`}
                          >
                            ×
                          </button>
                        ) : null}
                      </span>
                    </th>
                  ))}
                  <th className="border-b border-zinc-200 px-2 py-1.5 text-left font-medium text-zinc-500">
                    참고치
                  </th>
                  <th className="border-b border-zinc-200 px-2 py-1.5 text-left font-medium text-zinc-500">
                    단위
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.itemRows.map((row, index) => {
                  const previous = table.itemRows[index - 1];
                  const showCategory = !previous || previous.category !== row.category;
                  return (
                    <Fragment key={row.name}>
                      {showCategory && (
                        <tr>
                          <td
                            colSpan={table.dates.length + 3}
                            className="border-b border-zinc-200 bg-zinc-100 px-2 py-1.5 text-left text-[10.5px] font-semibold uppercase text-zinc-600"
                          >
                            {row.category}
                          </td>
                        </tr>
                      )}
                      <tr className="odd:bg-zinc-50/60">
                        <td className="sticky left-0 z-10 max-w-[140px] border-b border-zinc-100 bg-inherit px-2 py-1.5 font-medium text-zinc-700">
                          {row.name}
                        </td>
                        {table.dates.map((date) => {
                          const value = row.values.get(date);
                          const isEditing =
                            editingCell?.dateKey === date && editingCell.itemName === row.name;
                          return (
                            <td
                              key={date}
                              className="border-b border-zinc-100 px-2 py-1.5 text-right font-mono tabular-nums"
                            >
                              {isEditing ? (
                                <input
                                  autoFocus
                                  value={editingCell.value}
                                  onChange={(event) =>
                                    setEditingCell((current) =>
                                      current ? { ...current, value: event.target.value } : current
                                    )
                                  }
                                  onBlur={() => void saveEditedCell()}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' && !isComposingKeyboardEvent(event)) {
                                      event.preventDefault();
                                      void saveEditedCell();
                                    }
                                    if (event.key === 'Escape') {
                                      setEditingCell(null);
                                    }
                                  }}
                                  className="h-7 w-20 rounded border border-zinc-300 px-1.5 text-right text-[11px] outline-none focus:ring-1 focus:ring-zinc-400"
                                />
                              ) : value ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingCell({
                                      dateKey: date,
                                      itemName: row.name,
                                      value: String(value.value),
                                    })
                                  }
                                  className={
                                    value.flag
                                      ? 'font-semibold text-red-600 hover:underline'
                                      : 'text-zinc-700 hover:underline'
                                  }
                                >
                                  {value.value}
                                  {value.flag && (
                                    <span className="ml-1 text-[10px]">{value.flag}</span>
                                  )}
                                </button>
                              ) : (
                                date === addingDateKey ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingCell({
                                        dateKey: date,
                                        itemName: row.name,
                                        value: '',
                                      })
                                    }
                                    className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-dashed border-zinc-300 px-1.5 text-[11px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-700"
                                  >
                                    +
                                  </button>
                                ) : (
                                  <span className="text-zinc-300">-</span>
                                )
                              )}
                            </td>
                          );
                        })}
                        <td className="border-b border-zinc-100 px-2 py-1.5 text-zinc-400">
                          {row.referenceText}
                        </td>
                        <td className="border-b border-zinc-100 px-2 py-1.5 text-zinc-400">
                          {row.unit}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <ClinicalRow prefix="-" title="0" detail="저장된 Lab 수치 없음" />
        )}
      </DataSection>
      <DataSection title="Culture / Sensitivity" count={cultureResults.length}>
        {cultureResults.length > 0 ? (
          <div className="space-y-2 p-2">
            {cultureResults.map((result) => (
              <div
                key={result.id}
                className="rounded-md border border-zinc-200 bg-white p-2 text-[12px]"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-zinc-500">
                    {formatDateInput(result.testDate)}
                  </span>
                  <span className="text-[11px] text-zinc-400">{result.source}</span>
                </div>
                <div className="grid gap-1 sm:grid-cols-2">
                  {result.items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex min-w-0 items-baseline justify-between gap-2 border-b border-zinc-100 py-1 last:border-b-0"
                    >
                      <span className="truncate text-zinc-600">{item.name}</span>
                      <span
                        className={
                          item.hlFlag ? 'font-semibold text-red-600' : 'font-mono text-zinc-800'
                        }
                      >
                        {item.value}
                        {item.unit && <span className="ml-1 text-zinc-400">{item.unit}</span>}
                        {item.hlFlag && <span className="ml-1 text-[10px]">{item.hlFlag}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ClinicalRow prefix="-" title="0" detail="Culture 결과 없음" />
        )}
      </DataSection>
      <DataSection title="최근 Lab" count={labs.length + visibleManualLabs.length}>
        {visibleManualLabs.map((item) => (
          <ClinicalRow
            key={item.id ?? `${item.dateKey}-${item.itemName}`}
            prefix={item.dateKey}
            title={item.itemName}
            detail={`${item.value}${item.unit ? ` ${item.unit}` : ''}`}
            tone={item.flag ? 'danger' : 'default'}
            action={
              item.id && onRemoveLab ? (
                <RemoveButton onClick={() => onRemoveLab(item)} />
              ) : undefined
            }
          />
        ))}
        {labs.map((item) => (
          <ClinicalRow
            key={`${item.patientId}-${item.dateKey}`}
            prefix={item.dateKey}
            title={item.abnormalCount > 0 ? item.abnormalItems.join(', ') : '정상'}
            detail={`${item.totalItems} items`}
            tone={item.abnormalCount > 0 ? 'danger' : 'muted'}
            pill={item.abnormalCount > 0 ? `${item.abnormalCount}` : undefined}
          />
        ))}
        {labs.length === 0 && visibleManualLabs.length === 0 && (
          <ClinicalRow prefix="-" title="0" detail="Lab 없음" />
        )}
      </DataSection>
      <CollapsiblePanel title="표준 항목 추가">
        <StandardLabItemForm
          draft={newItemDraft}
          categories={standardLabCategories}
          items={standardLabItems}
          setDraft={setNewItemDraft}
          saving={saving}
          onSave={saveStandardLabItem}
          hasValidDate={hasValidDate}
        />
      </CollapsiblePanel>
      <CollapsiblePanel title="Lab 파싱">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setParseOpen(true)}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-[12px] font-medium hover:bg-zinc-50"
            >
              OCS 붙여넣기
            </button>
          </div>
          {parseOpen && (
            <LabParseInput
              mode="paste"
              patientId={patient.id}
              registrationNumber={patient.registrationNumber}
              onSave={saveParsedLabs}
              onClose={() => setParseOpen(false)}
            />
          )}
        </div>
      </CollapsiblePanel>
    </div>
  );
}

const medicationScheduleOptions = {
  '#1': ['아침', '점심', '저녁', '취침전'],
  '#2': ['아침,점심', '점심,저녁', '아침,저녁', '아침,취침전', '점심,취침전', '저녁,취침전'],
  '#3': ['아침,점심,저녁'],
  '#4': ['아침,점심,저녁,취침전'],
} as const;

const medicationTimingOptions = ['식후', '식전', '식후 30분', '식전 30분', '상관없음'] as const;

function MedicationTab({
  patient,
  data,
  medications,
  onAddAntibiotic,
  onAddMedication,
  onSaveParsedMedications,
  onRemoveAntibiotic,
  onRemoveMedication,
  onLoadMedications,
  onDirtyChange,
}: {
  patient: Patient;
  data: BriefingData;
  medications: Medication[];
  onAddAntibiotic?: PatientWorkspaceProps['onAddAntibiotic'];
  onAddMedication?: PatientWorkspaceProps['onAddMedication'];
  onSaveParsedMedications?: PatientWorkspaceProps['onSaveParsedMedications'];
  onRemoveAntibiotic?: PatientWorkspaceProps['onRemoveAntibiotic'];
  onRemoveMedication?: PatientWorkspaceProps['onRemoveMedication'];
  onLoadMedications?: PatientWorkspaceProps['onLoadMedications'];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [antibioticDraft, setAntibioticDraft] = useState({
    drugName: '',
    dosage: '',
    frequency: '',
    startDate: formatDateInput(new Date()),
  });
  const [medicationDraft, setMedicationDraft] = useState({
    category: 'hospital' as 'hospital' | 'personal',
    drugName: '',
    singleDose: '',
    frequency: '#1' as '#1' | '#2' | '#3' | '#4',
    schedule: '아침',
    timing: '식후',
    notes: '',
  });
  const [pasteCategory, setPasteCategory] = useState<'hospital' | 'personal'>('hospital');
  const [pasteText, setPasteText] = useState('');
  const [parsedMedications, setParsedMedications] = useState<ParsedMedication[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingMedication, setSavingMedication] = useState(false);
  const [savingParsedMedications, setSavingParsedMedications] = useState(false);
  const antibiotics = useMemo(
    () => data.antibiotics.filter((item) => item.patientId === patient.id),
    [data.antibiotics, patient.id]
  );
  const patientMedications = useMemo(
    () => medications.filter((item) => item.patientId === patient.id && item.isActive),
    [medications, patient.id]
  );
  const hospitalMedications = useMemo(
    () => patientMedications.filter((item) => item.category === 'hospital'),
    [patientMedications]
  );
  const personalMedications = useMemo(
    () => patientMedications.filter((item) => item.category === 'personal'),
    [patientMedications]
  );
  const hasValidStartDate = isClinicalDateInput(antibioticDraft.startDate);
  const hasAntibioticDraft = Boolean(antibioticDraft.drugName.trim());
  const hasMedicationDraft = Boolean(medicationDraft.drugName.trim());
  const hasDraft = hasAntibioticDraft || hasMedicationDraft;

  useEffect(() => {
    setAntibioticDraft({
      drugName: '',
      dosage: '',
      frequency: '',
      startDate: formatDateInput(new Date()),
    });
    setMedicationDraft({
      category: 'hospital',
      drugName: '',
      singleDose: '',
      frequency: '#1',
      schedule: '아침',
      timing: '식후',
      notes: '',
    });
    setPasteCategory('hospital');
    setPasteText('');
    setParsedMedications([]);
    setParseError(null);
    setSaving(false);
    setSavingMedication(false);
    setSavingParsedMedications(false);
  }, [patient.id]);
  useEffect(() => {
    void onLoadMedications?.(patient.id);
  }, [onLoadMedications, patient.id]);
  useEffect(() => onDirtyChange?.(hasDraft), [hasDraft, onDirtyChange]);

  const saveAntibiotic = useCallback(async () => {
    if (!hasAntibioticDraft || !hasValidStartDate || saving) return;
    setSaving(true);
    try {
      await onAddAntibiotic?.(antibioticDraft);
      setAntibioticDraft({
        drugName: '',
        dosage: '',
        frequency: '',
        startDate: formatDateInput(new Date()),
      });
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [antibioticDraft, hasAntibioticDraft, hasValidStartDate, onAddAntibiotic, saving]);

  const saveMedication = useCallback(async () => {
    if (!hasMedicationDraft || savingMedication) return;
    setSavingMedication(true);
    try {
      await onAddMedication?.(medicationDraft);
      setMedicationDraft({
        category: 'hospital',
        drugName: '',
        singleDose: '',
        frequency: '#1',
        schedule: '아침',
        timing: '식후',
        notes: '',
      });
    } catch {
      return;
    } finally {
      setSavingMedication(false);
    }
  }, [hasMedicationDraft, medicationDraft, onAddMedication, savingMedication]);

  const parseMedicationPaste = useCallback(() => {
    const parsed = parseOCSMedication(pasteText);
    if (parsed.length === 0) {
      setParsedMedications([]);
      setParseError('파싱된 약제가 없습니다. OCS 처방 텍스트 형식을 확인해주세요.');
      return;
    }
    setParsedMedications(parsed);
    setParseError(null);
  }, [pasteText]);

  const saveParsedMedications = useCallback(async () => {
    if (parsedMedications.length === 0 || savingParsedMedications) return;
    setSavingParsedMedications(true);
    try {
      await onSaveParsedMedications?.(pasteCategory, parsedMedications);
      setPasteText('');
      setParsedMedications([]);
      setParseError(null);
      await onLoadMedications?.(patient.id);
    } catch {
      return;
    } finally {
      setSavingParsedMedications(false);
    }
  }, [
    onLoadMedications,
    onSaveParsedMedications,
    parsedMedications,
    pasteCategory,
    patient.id,
    savingParsedMedications,
  ]);

  return (
    <div className="space-y-3">
      <DataSection title="항생제" count={antibiotics.length}>
        {antibiotics.length === 0 ? (
          <ClinicalRow prefix="-" title="0" detail="항생제 없음" />
        ) : (
          antibiotics.map((item) => (
            <ClinicalRow
              key={item.medicationId}
              prefix={`D+${item.dDay}`}
              title={item.drugName}
              detail={`${item.dosage ?? ''} ${item.frequency ?? ''}`.trim()}
              tone={item.isLongTerm ? 'danger' : 'warning'}
              pill={item.isLongTerm ? '장기' : undefined}
              action={
                onRemoveAntibiotic ? (
                  <RemoveButton onClick={() => onRemoveAntibiotic(item.medicationId)} />
                ) : undefined
              }
            />
          ))
        )}
      </DataSection>
      <MedicationListSection
        title="본원약"
        items={hospitalMedications}
        onRemove={onRemoveMedication}
      />
      <MedicationListSection
        title="지참약"
        items={personalMedications}
        onRemove={onRemoveMedication}
      />
      <CollapsiblePanel title="약제 추가">
        <div className="space-y-3">
          <DataSection title="항생제 추가">
            <div
              className="grid gap-2 p-2 sm:grid-cols-[minmax(0,1.4fr)_120px_100px_140px_auto]"
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || isComposingKeyboardEvent(event)) return;
                event.preventDefault();
                saveAntibiotic();
              }}
            >
              <Input
                value={antibioticDraft.drugName}
                placeholder="약제명"
                onChange={(value) =>
                  setAntibioticDraft((current) => ({ ...current, drugName: value }))
                }
              />
              <Input
                value={antibioticDraft.dosage}
                placeholder="용량"
                onChange={(value) =>
                  setAntibioticDraft((current) => ({ ...current, dosage: value }))
                }
              />
              <Input
                value={antibioticDraft.frequency}
                placeholder="횟수"
                onChange={(value) =>
                  setAntibioticDraft((current) => ({ ...current, frequency: value }))
                }
              />
              <Input
                value={antibioticDraft.startDate}
                type="date"
                min="1900-01-01"
                max={formatDateInput(new Date())}
                invalid={!hasValidStartDate}
                onChange={(value) =>
                  setAntibioticDraft((current) => ({ ...current, startDate: value }))
                }
              />
              <SaveButton
                disabled={!hasAntibioticDraft || !hasValidStartDate}
                pending={saving}
                onClick={saveAntibiotic}
              >
                저장
              </SaveButton>
            </div>
            {antibioticDraft.startDate && !hasValidStartDate && (
              <div className="px-2 pb-2 text-[11px] text-red-600">
                시작일은 1900년부터 오늘 사이로 입력해주세요.
              </div>
            )}
          </DataSection>
          <DataSection title="본원약 / 지참약 추가">
            <div
              className="space-y-2 p-2"
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || isComposingKeyboardEvent(event)) return;
                event.preventDefault();
                saveMedication();
              }}
            >
              <div className="grid gap-2 sm:grid-cols-[88px_minmax(180px,1.4fr)_minmax(120px,0.7fr)]">
                <CategoryToggle
                  value={medicationDraft.category}
                  onChange={(category) =>
                    setMedicationDraft((current) => ({ ...current, category }))
                  }
                />
                <Input
                  value={medicationDraft.drugName}
                  placeholder="약제명"
                  onChange={(value) =>
                    setMedicationDraft((current) => ({ ...current, drugName: value }))
                  }
                />
                <Input
                  value={medicationDraft.singleDose}
                  placeholder="1회용량"
                  onChange={(value) =>
                    setMedicationDraft((current) => ({ ...current, singleDose: value }))
                  }
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={medicationDraft.frequency}
                  onChange={(event) => {
                    const frequency = event.target.value as '#1' | '#2' | '#3' | '#4';
                    setMedicationDraft((current) => ({
                      ...current,
                      frequency,
                      schedule: medicationScheduleOptions[frequency][0],
                    }));
                  }}
                  className="h-8 w-[72px] rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
                >
                  <option value="#1">#1</option>
                  <option value="#2">#2</option>
                  <option value="#3">#3</option>
                  <option value="#4">#4</option>
                </select>
                <select
                  value={medicationDraft.schedule}
                  onChange={(event) =>
                    setMedicationDraft((current) => ({
                      ...current,
                      schedule: event.target.value,
                    }))
                  }
                  className="h-8 min-w-[150px] flex-1 rounded-md border border-zinc-200 bg-white px-2 text-[12px] sm:flex-none"
                >
                  {medicationScheduleOptions[medicationDraft.frequency].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  value={medicationDraft.timing}
                  onChange={(event) =>
                    setMedicationDraft((current) => ({ ...current, timing: event.target.value }))
                  }
                  className="h-8 w-[120px] rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
                >
                  {medicationTimingOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <Input
                  value={medicationDraft.notes}
                  placeholder="메모"
                  onChange={(value) =>
                    setMedicationDraft((current) => ({ ...current, notes: value }))
                  }
                  className="min-w-[180px] flex-1"
                />
                <SaveButton
                  disabled={!hasMedicationDraft}
                  pending={savingMedication}
                  onClick={saveMedication}
                >
                  저장
                </SaveButton>
              </div>
            </div>
          </DataSection>
          <DataSection title="처방 붙여넣기">
            <div className="space-y-2 p-2">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryToggle value={pasteCategory} onChange={setPasteCategory} />
                <button
                  type="button"
                  onClick={parseMedicationPaste}
                  className="rounded-md border border-zinc-200 px-3 py-1.5 text-[12px] font-medium hover:bg-zinc-50"
                >
                  파싱
                </button>
                <SaveButton
                  disabled={parsedMedications.length === 0}
                  pending={savingParsedMedications}
                  onClick={saveParsedMedications}
                >
                  {parsedMedications.length > 0 ? `${parsedMedications.length}개 저장` : '저장'}
                </SaveButton>
              </div>
              <textarea
                value={pasteText}
                placeholder="OCS 처방을 붙여넣으세요"
                rows={5}
                onChange={(event) => {
                  setPasteText(event.target.value);
                  setParsedMedications([]);
                  setParseError(null);
                }}
                className="w-full resize-y rounded-md border border-zinc-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-zinc-400"
              />
              {parseError && <div className="text-[11px] text-red-600">{parseError}</div>}
              {parsedMedications.length > 0 && (
                <div className="max-h-44 overflow-auto rounded-md border border-zinc-100">
                  {parsedMedications.map((item, index) => (
                    <div
                      key={`${item.drugName}-${index}`}
                      className="grid gap-2 border-b border-zinc-100 px-2 py-1.5 text-[12px] last:border-b-0 sm:grid-cols-[minmax(0,1fr)_80px_minmax(0,0.8fr)_100px]"
                    >
                      <span className="truncate font-medium text-zinc-800">{item.drugName}</span>
                      <span className="text-zinc-500">{item.singleDose}T</span>
                      <span className="truncate text-zinc-500">{item.schedule}</span>
                      <span className="truncate text-zinc-500">{item.timing ?? '-'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DataSection>
        </div>
      </CollapsiblePanel>
    </div>
  );
}

function CategoryToggle({
  value,
  onChange,
}: {
  value: 'hospital' | 'personal';
  onChange: (value: 'hospital' | 'personal') => void;
}) {
  return (
    <div className="grid h-8 grid-cols-2 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-[11px]">
      {[['hospital', '본원'] as const, ['personal', '지참'] as const].map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded px-1 font-medium ${
            value === key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function MedicationListSection({
  title,
  items,
  onRemove,
}: {
  title: string;
  items: Medication[];
  onRemove?: (medicationId: string) => void | Promise<void>;
}) {
  return (
    <DataSection title={title} count={items.length}>
      {items.length === 0 ? (
        <ClinicalRow prefix="-" title="0" detail={`${title} 없음`} />
      ) : (
        items.map((item) => (
          <ClinicalRow
            key={item.id}
            prefix="약"
            title={item.drugName}
            detail={[
              item.singleDose ? `${item.singleDose}T` : '',
              item.schedule,
              item.timing,
              item.notes,
            ]
              .filter(Boolean)
              .join(' · ')}
            tone="default"
            action={onRemove ? <RemoveButton onClick={() => onRemove(item.id)} /> : undefined}
          />
        ))
      )}
    </DataSection>
  );
}

function CollapsiblePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="rounded-md border border-zinc-200 bg-white">
      <summary className="cursor-pointer select-none px-3 py-2 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50">
        {title}
      </summary>
      <div className="border-t border-zinc-100 p-2">{children}</div>
    </details>
  );
}

function NotesTab({
  patient,
  data,
  onAddNote,
  onRemoveNote,
  onDirtyChange,
}: {
  patient: Patient;
  data: BriefingData;
  onAddNote?: PatientWorkspaceProps['onAddNote'];
  onRemoveNote?: PatientWorkspaceProps['onRemoveNote'];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'progress' | 'reminder'>('progress');
  const [saving, setSaving] = useState(false);
  const [soapResult, setSoapResult] = useState('');
  const [soapLoading, setSoapLoading] = useState(false);
  const [soapSaving, setSoapSaving] = useState(false);
  const [soapCopied, setSoapCopied] = useState(false);
  const [soapError, setSoapError] = useState('');
  const aiConfigured = useAIStore((state) => state.isConfigured());
  const notes = useMemo(
    () => [
      ...data.reminders
        .filter((item) => item.patientId === patient.id)
        .map((item) => ({ ...item, type: 'reminder' as const })),
      ...data.progressNotes
        .filter((item) => item.patientId === patient.id)
        .map((item) => ({ ...item, type: 'progress' as const })),
    ],
    [data.progressNotes, data.reminders, patient.id]
  );
  const patientProgressNotes = useMemo(
    () => notes.filter((item) => item.type === 'progress'),
    [notes]
  );
  const soapContext = useMemo(
    () => buildSoapContext(patient, data, content, patientProgressNotes),
    [content, data, patient, patientProgressNotes]
  );
  const hasDraft = Boolean(content.trim());
  const canGenerateSoap = aiConfigured && Boolean(soapContext.progressNote.trim());

  useEffect(() => {
    setContent('');
    setType('progress');
    setSaving(false);
    setSoapResult('');
    setSoapLoading(false);
    setSoapSaving(false);
    setSoapCopied(false);
    setSoapError('');
  }, [patient.id]);
  useEffect(() => onDirtyChange?.(hasDraft), [hasDraft, onDirtyChange]);

  const save = useCallback(async () => {
    const text = content.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await onAddNote?.(text, type);
      setContent('');
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [content, onAddNote, saving, type]);

  const generateSoapNote = useCallback(async () => {
    if (!canGenerateSoap || soapLoading) return;
    setSoapLoading(true);
    setSoapError('');
    setSoapCopied(false);
    try {
      const result = await generateSOAP(soapContext);
      setSoapResult(result.trim());
    } catch (error) {
      setSoapError(error instanceof Error ? error.message : String(error));
    } finally {
      setSoapLoading(false);
    }
  }, [canGenerateSoap, soapContext, soapLoading]);

  const copySoapNote = useCallback(async () => {
    if (!soapResult.trim()) return;
    try {
      await navigator.clipboard.writeText(soapResult);
      setSoapCopied(true);
      window.setTimeout(() => setSoapCopied(false), 1400);
    } catch {
      setSoapError('클립보드 복사에 실패했습니다.');
    }
  }, [soapResult]);

  const saveSoapNote = useCallback(async () => {
    const text = soapResult.trim();
    if (!text || soapSaving) return;
    setSoapSaving(true);
    setSoapError('');
    try {
      await onAddNote?.(text, 'progress');
      setSoapResult('');
    } catch (error) {
      setSoapError(error instanceof Error ? error.message : String(error));
    } finally {
      setSoapSaving(false);
    }
  }, [onAddNote, soapResult, soapSaving]);

  return (
    <div className="space-y-3">
      <DataSection title="메모 추가">
        <div
          className="grid gap-2 p-2 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || isComposingKeyboardEvent(event)) return;
            event.preventDefault();
            save();
          }}
        >
          <select
            value={type}
            onChange={(event) => setType(event.target.value as 'progress' | 'reminder')}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
          >
            <option value="progress">경과</option>
            <option value="reminder">알림</option>
          </select>
          <Input
            value={content}
            placeholder={type === 'reminder' ? '오늘 계속 띄울 알림' : '빠른 메모 입력'}
            onChange={setContent}
          />
          <SaveButton disabled={!hasDraft} pending={saving} onClick={save}>
            저장
          </SaveButton>
        </div>
      </DataSection>
      <DataSection title="AI SOAP 생성">
        <div className="space-y-2 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canGenerateSoap || soapLoading}
              onClick={generateSoapNote}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
            >
              {soapLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
              SOAP 생성
            </button>
            <span className="text-[11px] text-zinc-400">
              {!aiConfigured
                ? '설정 > AI 설정에서 API 키를 먼저 입력하세요.'
                : soapContext.progressNote.trim()
                  ? '입력 중인 메모와 최근 정보를 바탕으로 초안을 만듭니다.'
                  : '메모를 입력하거나 최근 경과 메모가 필요합니다.'}
            </span>
          </div>

          {soapError && (
            <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
              {soapError}
            </div>
          )}

          {soapResult && (
            <div className="rounded-md border border-zinc-200 bg-white">
              <div className="flex items-center justify-between border-b border-zinc-100 px-2 py-1.5">
                <span className="text-[12px] font-medium text-zinc-800">SOAP 초안</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={copySoapNote}
                    className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-[11px] text-zinc-600 hover:bg-zinc-100"
                  >
                    {soapCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    복사
                  </button>
                  <button
                    type="button"
                    onClick={saveSoapNote}
                    disabled={soapSaving}
                    className="inline-flex h-7 items-center justify-center rounded-md bg-zinc-900 px-2 text-[11px] font-medium text-white hover:bg-zinc-700 disabled:bg-zinc-300"
                  >
                    {soapSaving ? '저장 중' : '메모로 저장'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoapResult('')}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    aria-label="SOAP 초안 닫기"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-2 font-mono text-[12px] leading-5 text-zinc-700">
                {soapResult}
              </pre>
            </div>
          )}
        </div>
      </DataSection>
      <DataSection title="메모" count={notes.length}>
        {notes.length === 0 ? (
          <ClinicalRow prefix="-" title="0" detail="메모 없음" />
        ) : (
          notes.map((item) => (
            <ClinicalRow
              key={item.noteId}
              prefix={item.type === 'reminder' ? '알림' : '경과'}
              title={item.content}
              tone={item.type === 'reminder' ? 'warning' : 'default'}
              action={
                onRemoveNote ? (
                  <RemoveButton onClick={() => onRemoveNote(item.noteId, item.type)} />
                ) : undefined
              }
            />
          ))
        )}
      </DataSection>
    </div>
  );
}

function ScheduleTab({
  patient,
  data,
  onAddTodaySchedule,
  onRemoveTodaySchedule,
  onDirtyChange,
}: {
  patient: Patient;
  data: BriefingData;
  onAddTodaySchedule?: PatientWorkspaceProps['onAddTodaySchedule'];
  onRemoveTodaySchedule?: PatientWorkspaceProps['onRemoveTodaySchedule'];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState({ title: '', category: '검사', scheduledTime: '' });
  const [saving, setSaving] = useState(false);
  const schedules = useMemo(
    () => data.todaySchedules.filter((item) => item.patientId === patient.id),
    [data.todaySchedules, patient.id]
  );
  const hasValidTime =
    !draft.scheduledTime.trim() || Boolean(normalizeClockTime(draft.scheduledTime));
  const hasDraft = Boolean(draft.title.trim());

  useEffect(() => {
    setDraft({ title: '', category: '검사', scheduledTime: '' });
    setSaving(false);
  }, [patient.id]);
  useEffect(() => onDirtyChange?.(hasDraft), [hasDraft, onDirtyChange]);

  const save = useCallback(async () => {
    if (!hasDraft || !hasValidTime || saving) return;
    setSaving(true);
    try {
      await onAddTodaySchedule?.({
        ...draft,
        scheduledTime: normalizeClockTime(draft.scheduledTime),
      });
      setDraft({ title: '', category: '검사', scheduledTime: '' });
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [draft, hasDraft, hasValidTime, onAddTodaySchedule, saving]);

  return (
    <div className="space-y-3">
      <DataSection title="오늘 일정 추가">
        <div
          className="grid gap-2 p-2 sm:grid-cols-[100px_120px_minmax(0,1fr)_auto]"
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || isComposingKeyboardEvent(event)) return;
            event.preventDefault();
            save();
          }}
        >
          <Input
            value={draft.scheduledTime}
            placeholder="14:00"
            invalid={!hasValidTime}
            onChange={(value) => setDraft((current) => ({ ...current, scheduledTime: value }))}
          />
          <Input
            value={draft.category}
            placeholder="분류"
            onChange={(value) => setDraft((current) => ({ ...current, category: value }))}
          />
          <Input
            value={draft.title}
            placeholder="일정 내용"
            onChange={(value) => setDraft((current) => ({ ...current, title: value }))}
          />
          <SaveButton disabled={!hasDraft || !hasValidTime} pending={saving} onClick={save}>
            저장
          </SaveButton>
        </div>
        {!hasValidTime && (
          <div className="px-2 pb-2 text-[11px] text-red-600">
            시간은 14:00 또는 1400 형식으로 입력해주세요.
          </div>
        )}
      </DataSection>
      <DataSection title="오늘 일정" count={schedules.length}>
        {schedules.length === 0 ? (
          <ClinicalRow prefix="-" title="0" detail="오늘 일정 없음" />
        ) : (
          schedules.map((item) => (
            <ClinicalRow
              key={item.scheduleId}
              prefix={item.scheduledTime ?? '-'}
              title={item.title}
              detail={item.category}
              meta={item.isCompleted ? '완료' : undefined}
              tone={item.isCompleted ? 'muted' : 'default'}
              action={
                onRemoveTodaySchedule ? (
                  <RemoveButton onClick={() => onRemoveTodaySchedule(item.scheduleId)} />
                ) : undefined
              }
            />
          ))
        )}
      </DataSection>
    </div>
  );
}

function ChartField({
  label,
  value,
  rows,
  placeholder,
  onChange,
  onTemplate,
}: {
  label: string;
  value: string;
  rows: number;
  placeholder?: string;
  onChange: (value: string) => void;
  onTemplate?: () => void;
}) {
  return (
    <div className="grid gap-1">
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] text-zinc-400">{label}</span>
        {onTemplate && (
          <button
            type="button"
            className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10.5px] text-zinc-500 hover:bg-zinc-50"
            onClick={(event) => {
              event.preventDefault();
              onTemplate();
            }}
          >
            템플릿
          </button>
        )}
      </span>
      <textarea
        aria-label={label}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-8 resize-y rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[12px] leading-5 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      />
    </div>
  );
}

type StandardLabItemOption = {
  name: string;
  category: string;
  code?: string;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
};

function StandardLabItemForm({
  draft,
  categories,
  items,
  setDraft,
  saving,
  hasValidDate,
  onSave,
}: {
  draft: { category: string; itemName: string; value: string; dateKey: string };
  categories: string[];
  items: StandardLabItemOption[];
  setDraft: Dispatch<
    SetStateAction<{
      category: string;
      itemName: string;
      value: string;
      dateKey: string;
    }>
  >;
  saving: boolean;
  hasValidDate: boolean;
  onSave: () => void | Promise<void>;
}) {
  const filteredItems = items.filter((item) => item.category === draft.category);

  return (
    <DataSection title="표준 항목 추가">
      <div
        className="grid gap-2 p-2 sm:grid-cols-[140px_130px_minmax(0,1fr)_100px_auto]"
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || isComposingKeyboardEvent(event)) return;
          event.preventDefault();
          onSave();
        }}
      >
        <Input
          value={draft.dateKey}
          type="date"
          min="1900-01-01"
          max={formatDateInput(new Date())}
          invalid={!hasValidDate}
          onChange={(value) => setDraft((current) => ({ ...current, dateKey: value }))}
        />
        <select
          value={draft.category}
          onChange={(event) => {
            const category = event.target.value;
            const firstItem = items.find((item) => item.category === category);
            setDraft((current) => ({
              ...current,
              category,
              itemName: firstItem?.name ?? '',
            }));
          }}
          className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          value={draft.itemName}
          onChange={(event) =>
            setDraft((current) => ({ ...current, itemName: event.target.value }))
          }
          className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
        >
          {filteredItems.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
              {item.unit ? ` (${item.unit})` : ''}
            </option>
          ))}
        </select>
        <Input
          value={draft.value}
          placeholder="값"
          onChange={(value) => setDraft((current) => ({ ...current, value }))}
        />
        <SaveButton
          disabled={!draft.itemName.trim() || !draft.value.trim() || !hasValidDate}
          pending={saving}
          onClick={onSave}
        >
          저장
        </SaveButton>
      </div>
      {draft.dateKey && !hasValidDate && (
        <div className="px-2 pb-2 text-[11px] text-red-600">
          Lab 날짜는 1900년부터 오늘 사이로 입력해주세요.
        </div>
      )}
    </DataSection>
  );
}
function Input({
  value,
  type = 'text',
  placeholder,
  min,
  max,
  invalid = false,
  className = '',
  onChange,
}: {
  value: string;
  type?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  invalid?: boolean;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      min={min}
      max={max}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
      className={`h-8 min-w-0 rounded-md border bg-white px-2 text-[12px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 ${
        invalid ? 'border-red-300 focus:ring-red-300' : 'border-zinc-200 focus:ring-zinc-400'
      } ${className}`}
    />
  );
}

function SaveButton({
  disabled,
  pending = false,
  children,
  onClick,
}: {
  disabled?: boolean;
  pending?: boolean;
  children: ReactNode;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={onClick}
      className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3 text-[12px] font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
    >
      {pending ? '저장 중' : children}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void | Promise<void> }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => {
        event.stopPropagation();
        if (pending) return;
        setPending(true);
        Promise.resolve(onClick())
          .catch(() => undefined)
          .finally(() => setPending(false));
      }}
      className="rounded-md border border-zinc-200 px-1.5 py-0.5 text-[10.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-300"
    >
      {pending ? '삭제 중' : '삭제'}
    </button>
  );
}

function createChartingDraft(patient: Patient): ChartingDraft {
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

function buildTabBadges(
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

function getPatientRows(patientId: string, data: BriefingData) {
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

function buildHandoffLines(patient: Patient, rows: ReturnType<typeof getPatientRows>) {
  return [
    `${patient.roomBed} ${patient.name} ${patient.sex}`,
    patient.chiefComplaint &&
      `C/C: ${patient.chiefComplaint}${formatOnsetElapsedText(patient.onset) ? ` (${formatOnsetElapsedText(patient.onset)})` : ''}`,
    patient.problemList.length > 0 && `Problems: ${patient.problemList.join(', ')}`,
    patient.presentIllness && `PI: ${patient.presentIllness}`,
    patient.plan && `Plan: ${patient.plan}`,
    rows.reminders.length > 0 && `알림: ${rows.reminders.map((item) => item.content).join(' / ')}`,
    rows.schedules.length > 0 &&
      `일정: ${rows.schedules.map((item) => `${item.scheduledTime ? `${item.scheduledTime} ` : ''}${item.title}`).join(' / ')}`,
    rows.antibiotics.length > 0 &&
      `항생제: ${rows.antibiotics.map((item) => `${item.drugName} D+${item.dDay}`).join(' / ')}`,
    rows.labs.length > 0 &&
      `Lab: ${rows.labs.map((item) => item.abnormalItems.join(', ')).join(' / ')}`,
  ].filter(Boolean) as string[];
}

function buildChartingCopy(draft: ChartingDraft) {
  const problemLines = draft.problemListText
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `#. ${item}`)
    .join('\n');

  const headerLines = [
    draft.chiefComplaint && `C/C) ${draft.chiefComplaint}`,
    draft.onset && `Onset) ${draft.onset}`,
  ].filter(Boolean);
  const bodySections = [
    draft.presentIllness && `P/I)\n${draft.presentIllness}`,
    draft.pastHistory && `P/Hx)\n${draft.pastHistory}`,
    draft.reviewOfSystem && `ROS)\n${draft.reviewOfSystem}`,
    draft.physicalExam && `P/Ex)\n${draft.physicalExam}`,
    problemLines && `Problem List)\n${problemLines}`,
    draft.plan && `Plan)\n${draft.plan}`,
    draft.guardianExplanation && `보호자설명)\n${draft.guardianExplanation}`,
    draft.etc && `Etc)\n${draft.etc}`,
  ].filter(Boolean);

  return [headerLines.join('\n'), ...bodySections].filter(Boolean).join('\n\n');
}

function buildSoapContext(
  patient: Patient,
  data: BriefingData,
  draftNote: string,
  progressNotes: Array<{ content: string }>
) {
  const noteLines = [
    draftNote.trim() && `[작성 중]\n${draftNote.trim()}`,
    ...progressNotes.slice(0, 5).map((item) => item.content.trim()).filter(Boolean),
  ].filter(Boolean);
  const medicationLines = data.antibiotics
    .filter((item) => item.patientId === patient.id)
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
  const labLines = data.recentLabs
    .filter((item) => item.patientId === patient.id)
    .slice(0, 5)
    .map((item) =>
      [
        item.dateKey,
        item.abnormalItems.length > 0
          ? item.abnormalItems.join(', ')
          : `abnormal 0/${item.totalItems}`,
      ].join(': ')
    );

  return {
    patientName: patient.name,
    chiefComplaint: patient.chiefComplaint,
    onset: patient.onset,
    progressNote: noteLines.join('\n\n'),
    currentMedications: medicationLines.join('\n'),
    recentLab: labLines.join('\n'),
  };
}

function buildLabValueTable(labs: LabResult[], extraDateKey?: string) {
  const dates = Array.from(
    new Set([
      ...labs.map((lab) => formatDateInput(lab.testDate)),
      ...(extraDateKey ? [extraDateKey] : []),
    ])
  ).sort((a, b) => b.localeCompare(a));
  const dateLabIds = new Map<string, string[]>();
  const rows = new Map<
    string,
    {
      name: string;
      category: string;
      displayOrder: number;
      unit: string;
      referenceText: string;
      values: Map<string, { value: string | number; flag?: 'H' | 'L' }>;
    }
  >();
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
      const row = rows.get(item.name) ?? {
        name: item.name,
        category,
        displayOrder: orderEntry?.order ?? fallbackOrder,
        unit: item.unit,
        referenceText: formatLabReferenceRange(
          item.referenceMin ?? reference?.referenceMin,
          item.referenceMax ?? reference?.referenceMax,
          reference?.referenceText
        ),
        values: new Map(),
      };
      if (!row.unit && item.unit) row.unit = item.unit;
      if (!row.referenceText) {
        row.referenceText = formatLabReferenceRange(
          item.referenceMin ?? reference?.referenceMin,
          item.referenceMax ?? reference?.referenceMax,
          reference?.referenceText
        );
      }
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

function formatLabReferenceRange(min?: number, max?: number, text?: string) {
  if (text) return text;
  if (min !== undefined && max !== undefined) return `${min}-${max}`;
  if (min !== undefined) return `>=${min}`;
  if (max !== undefined) return `<=${max}`;
  return '';
}

function buildStandardLabItemOptions(): StandardLabItemOption[] {
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

function areDraftsEqual(left: ChartingDraft, right: ChartingDraft) {
  return JSON.stringify(normalizeChartingDraft(left)) === JSON.stringify(normalizeChartingDraft(right));
}

function normalizeChartingDraft(draft: ChartingDraft): ChartingDraft {
  return {
    chiefComplaint: normalizeChartingText(draft.chiefComplaint),
    onset: normalizeChartingText(draft.onset),
    presentIllness: normalizeChartingText(draft.presentIllness),
    pastHistory: normalizeChartingText(draft.pastHistory),
    reviewOfSystem: normalizeChartingText(draft.reviewOfSystem),
    physicalExam: normalizeChartingText(draft.physicalExam),
    problemListText: normalizeChartingText(draft.problemListText),
    plan: normalizeChartingText(draft.plan),
    guardianExplanation: normalizeChartingText(draft.guardianExplanation),
    etc: normalizeChartingText(draft.etc),
  };
}

function normalizeChartingText(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
}

function normalizeClockTime(value?: string) {
  if (!value) return undefined;
  const match = value.trim().match(/^(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function isClinicalDateInput(value: string) {
  const date = parseDateInput(value);
  if (!date) return false;
  return isDateInRange(date, new Date(1900, 0, 1), new Date());
}

function isComposingKeyboardEvent(event: React.KeyboardEvent) {
  return event.nativeEvent.isComposing || event.key === 'Process';
}
