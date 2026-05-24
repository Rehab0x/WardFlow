import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { Patient } from '@/db/database';
import type { BriefingData } from '@/services/briefingService';
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
  onAddLab?: (draft: {
    itemName: string;
    value: string;
    unit: string;
    flag: '' | 'H' | 'L';
    dateKey: string;
  }) => void | Promise<void>;
  onRemoveLab?: (lab: PatientWorkspaceManualLab) => void | Promise<void>;
  onAddTodaySchedule?: (schedule: { title: string; category: string; scheduledTime?: string }) => void | Promise<void>;
  onRemoveTodaySchedule?: (scheduleId: string) => void | Promise<void>;
  onRemoveAntibiotic?: (medicationId: string) => void | Promise<void>;
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
  onRemoveAntibiotic,
  onAddLab,
  onRemoveLab,
  onAddTodaySchedule,
  onRemoveTodaySchedule,
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

  const handleTabChange = useCallback((next: WorkspaceTabId) => {
    if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 이동할까요?')) return;
    setDirty(false);
    setTab(next);
    onTabChange?.(next);
  }, [dirty, onTabChange]);

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
        <WorkspaceTabs value={tab} unsavedTabs={dirty ? [tab] : []} tabBadges={tabBadges} onChange={handleTabChange} />
        <div className="space-y-3 p-3 sm:p-4">
          {tab === 'overview' && <OverviewTab patient={patient} data={data} onOpenTab={handleTabChange} />}
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
              onAddLab={onAddLab}
              onRemoveLab={onRemoveLab}
              onDirtyChange={setDirty}
            />
          )}
          {tab === 'medications' && (
            <MedicationTab
              patient={patient}
              data={data}
              onAddAntibiotic={onAddAntibiotic}
              onRemoveAntibiotic={onRemoveAntibiotic}
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
      <CopyBar title="인계 요약 복사" text={handoffLines.join('\n')} emptyText="복사할 인계 내용 없음" />
      <div className="grid gap-3 lg:grid-cols-2">
        <DataSection title="차팅 요약">
          <ClinicalRow
            prefix="C/C"
            title={patient.chiefComplaint || '-'}
            detail={formatOnsetElapsedText(patient.onset) ?? undefined}
            onClick={() => onOpenTab('charting')}
          />
          <ClinicalRow prefix="PI" title={patient.presentIllness || '-'} onClick={() => onOpenTab('charting')} />
          <ClinicalRow prefix="Plan" title={patient.plan || '-'} onClick={() => onOpenTab('charting')} />
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
      <DataSection
        title="차팅"
        action={
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className={isDirty ? 'text-amber-600' : 'text-zinc-400'}>{isDirty ? '미저장' : '저장됨'}</span>
            {savedAt && <span className="font-mono tabular-nums">저장 {formatClockTime(savedAt)}</span>}
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
          <ChartField label="C/C" value={draft.chiefComplaint} rows={2} onChange={(value) => update('chiefComplaint', value)} />
          <ChartField label="Onset" value={draft.onset} rows={1} onChange={(value) => update('onset', value)} placeholder="YYYY-MM-DD 또는 자유 입력" />
          <ChartField label="PI" value={draft.presentIllness} rows={4} onChange={(value) => update('presentIllness', value)} />
          <ChartField label="P/H" value={draft.pastHistory} rows={3} onChange={(value) => update('pastHistory', value)} />
          <ChartField label="ROS" value={draft.reviewOfSystem} rows={3} onChange={(value) => update('reviewOfSystem', value)} />
          <ChartField label="P/Ex" value={draft.physicalExam} rows={3} onChange={(value) => update('physicalExam', value)} />
          <ChartField label="Problem" value={draft.problemListText} rows={4} onChange={(value) => update('problemListText', value)} placeholder="한 줄에 하나씩 입력" />
          <ChartField label="Plan" value={draft.plan} rows={4} onChange={(value) => update('plan', value)} />
          <ChartField label="설명" value={draft.guardianExplanation} rows={3} onChange={(value) => update('guardianExplanation', value)} />
          <ChartField label="Etc" value={draft.etc} rows={3} onChange={(value) => update('etc', value)} />
        </div>
      </DataSection>
    </div>
  );
}

function LabTab({
  patient,
  data,
  manualLabs,
  onAddLab,
  onRemoveLab,
  onDirtyChange,
}: {
  patient: Patient;
  data: BriefingData;
  manualLabs: PatientWorkspaceManualLab[];
  onAddLab?: PatientWorkspaceProps['onAddLab'];
  onRemoveLab?: PatientWorkspaceProps['onRemoveLab'];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState({ itemName: '', value: '', unit: '', flag: '' as '' | 'H' | 'L', dateKey: formatDateInput(new Date()) });
  const [saving, setSaving] = useState(false);
  const labs = useMemo(
    () => data.recentLabs.filter((item) => item.patientId === patient.id),
    [data.recentLabs, patient.id]
  );
  const visibleManualLabs = useMemo(
    () => manualLabs.filter((item) => item.patientId === patient.id),
    [manualLabs, patient.id]
  );
  const hasValidDate = isClinicalDateInput(draft.dateKey);
  const hasDraft = Boolean(draft.itemName.trim() && draft.value.trim());

  useEffect(() => {
    setDraft({ itemName: '', value: '', unit: '', flag: '', dateKey: formatDateInput(new Date()) });
    setSaving(false);
  }, [patient.id]);
  useEffect(() => onDirtyChange?.(hasDraft), [hasDraft, onDirtyChange]);

  const save = useCallback(async () => {
    if (!hasDraft || !hasValidDate || saving) return;
    setSaving(true);
    try {
      await onAddLab?.(draft);
      setDraft({ itemName: '', value: '', unit: '', flag: '', dateKey: formatDateInput(new Date()) });
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [draft, hasDraft, hasValidDate, onAddLab, saving]);

  return (
    <div className="space-y-3">
      <QuickLabForm draft={draft} setDraft={setDraft} saving={saving} onSave={save} hasValidDate={hasValidDate} />
      <DataSection title="최근 Lab" count={labs.length + visibleManualLabs.length}>
        {visibleManualLabs.map((item) => (
          <ClinicalRow
            key={item.id ?? `${item.dateKey}-${item.itemName}`}
            prefix={item.dateKey}
            title={item.itemName}
            detail={`${item.value}${item.unit ? ` ${item.unit}` : ''}`}
            tone={item.flag ? 'danger' : 'default'}
            action={item.id && onRemoveLab ? <RemoveButton onClick={() => onRemoveLab(item)} /> : undefined}
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
        {labs.length === 0 && visibleManualLabs.length === 0 && <ClinicalRow prefix="-" title="0" detail="Lab 없음" />}
      </DataSection>
    </div>
  );
}

function MedicationTab({
  patient,
  data,
  onAddAntibiotic,
  onRemoveAntibiotic,
  onDirtyChange,
}: {
  patient: Patient;
  data: BriefingData;
  onAddAntibiotic?: PatientWorkspaceProps['onAddAntibiotic'];
  onRemoveAntibiotic?: PatientWorkspaceProps['onRemoveAntibiotic'];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState({ drugName: '', dosage: '', frequency: '', startDate: formatDateInput(new Date()) });
  const [saving, setSaving] = useState(false);
  const antibiotics = useMemo(
    () => data.antibiotics.filter((item) => item.patientId === patient.id),
    [data.antibiotics, patient.id]
  );
  const hasValidStartDate = isClinicalDateInput(draft.startDate);
  const hasDraft = Boolean(draft.drugName.trim());

  useEffect(() => {
    setDraft({ drugName: '', dosage: '', frequency: '', startDate: formatDateInput(new Date()) });
    setSaving(false);
  }, [patient.id]);
  useEffect(() => onDirtyChange?.(hasDraft), [hasDraft, onDirtyChange]);

  const save = useCallback(async () => {
    if (!hasDraft || !hasValidStartDate || saving) return;
    setSaving(true);
    try {
      await onAddAntibiotic?.(draft);
      setDraft({ drugName: '', dosage: '', frequency: '', startDate: formatDateInput(new Date()) });
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [draft, hasDraft, hasValidStartDate, onAddAntibiotic, saving]);

  return (
    <div className="space-y-3">
      <DataSection title="항생제 추가">
        <div
          className="grid gap-2 p-2 sm:grid-cols-[minmax(0,1.4fr)_120px_100px_140px_auto]"
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || isComposingKeyboardEvent(event)) return;
            event.preventDefault();
            save();
          }}
        >
          <Input value={draft.drugName} placeholder="약제명" onChange={(value) => setDraft((current) => ({ ...current, drugName: value }))} />
          <Input value={draft.dosage} placeholder="용량" onChange={(value) => setDraft((current) => ({ ...current, dosage: value }))} />
          <Input value={draft.frequency} placeholder="#4" onChange={(value) => setDraft((current) => ({ ...current, frequency: value }))} />
          <Input value={draft.startDate} type="date" min="1900-01-01" max={formatDateInput(new Date())} invalid={!hasValidStartDate} onChange={(value) => setDraft((current) => ({ ...current, startDate: value }))} />
          <SaveButton disabled={!hasDraft || !hasValidStartDate} pending={saving} onClick={save}>저장</SaveButton>
        </div>
        {draft.startDate && !hasValidStartDate && (
          <div className="px-2 pb-2 text-[11px] text-red-600">시작일은 1900년부터 오늘 사이로 입력해주세요.</div>
        )}
      </DataSection>
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
              action={onRemoveAntibiotic ? <RemoveButton onClick={() => onRemoveAntibiotic(item.medicationId)} /> : undefined}
            />
          ))
        )}
      </DataSection>
    </div>
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
  const hasDraft = Boolean(content.trim());

  useEffect(() => {
    setContent('');
    setType('progress');
    setSaving(false);
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
          <select value={type} onChange={(event) => setType(event.target.value as 'progress' | 'reminder')} className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px]">
            <option value="progress">경과</option>
            <option value="reminder">알림</option>
          </select>
          <Input value={content} placeholder={type === 'reminder' ? '오늘 계속 띄울 알림' : '빠른 메모 입력'} onChange={setContent} />
          <SaveButton disabled={!hasDraft} pending={saving} onClick={save}>저장</SaveButton>
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
              action={onRemoveNote ? <RemoveButton onClick={() => onRemoveNote(item.noteId, item.type)} /> : undefined}
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
  const hasValidTime = !draft.scheduledTime.trim() || Boolean(normalizeClockTime(draft.scheduledTime));
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
      await onAddTodaySchedule?.({ ...draft, scheduledTime: normalizeClockTime(draft.scheduledTime) });
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
          <Input value={draft.scheduledTime} placeholder="14:00" invalid={!hasValidTime} onChange={(value) => setDraft((current) => ({ ...current, scheduledTime: value }))} />
          <Input value={draft.category} placeholder="분류" onChange={(value) => setDraft((current) => ({ ...current, category: value }))} />
          <Input value={draft.title} placeholder="일정 내용" onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
          <SaveButton disabled={!hasDraft || !hasValidTime} pending={saving} onClick={save}>저장</SaveButton>
        </div>
        {!hasValidTime && (
          <div className="px-2 pb-2 text-[11px] text-red-600">시간은 14:00 또는 1400 형식으로 입력해주세요.</div>
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
              action={onRemoveTodaySchedule ? <RemoveButton onClick={() => onRemoveTodaySchedule(item.scheduleId)} /> : undefined}
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
}: {
  label: string;
  value: string;
  rows: number;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="font-mono text-[10.5px] text-zinc-400">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-8 resize-y rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[12px] leading-5 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      />
    </label>
  );
}

function QuickLabForm({
  draft,
  setDraft,
  saving,
  hasValidDate,
  onSave,
}: {
  draft: { itemName: string; value: string; unit: string; flag: '' | 'H' | 'L'; dateKey: string };
  setDraft: Dispatch<SetStateAction<{ itemName: string; value: string; unit: string; flag: '' | 'H' | 'L'; dateKey: string }>>;
  saving: boolean;
  hasValidDate: boolean;
  onSave: () => void | Promise<void>;
}) {
  return (
    <DataSection title="Lab 추가">
      <div
        className="grid gap-2 p-2 sm:grid-cols-[140px_minmax(0,1fr)_100px_80px_90px_auto]"
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || isComposingKeyboardEvent(event)) return;
          event.preventDefault();
          onSave();
        }}
      >
        <Input value={draft.dateKey} type="date" min="1900-01-01" max={formatDateInput(new Date())} invalid={!hasValidDate} onChange={(value) => setDraft((current) => ({ ...current, dateKey: value }))} />
        <Input value={draft.itemName} placeholder="항목" onChange={(value) => setDraft((current) => ({ ...current, itemName: value }))} />
        <Input value={draft.value} placeholder="값" onChange={(value) => setDraft((current) => ({ ...current, value }))} />
        <Input value={draft.unit} placeholder="단위" onChange={(value) => setDraft((current) => ({ ...current, unit: value }))} />
        <select value={draft.flag} onChange={(event) => setDraft((current) => ({ ...current, flag: event.target.value as '' | 'H' | 'L' }))} className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px]">
          <option value="">정상</option>
          <option value="H">H</option>
          <option value="L">L</option>
        </select>
        <SaveButton disabled={!draft.itemName.trim() || !draft.value.trim() || !hasValidDate} pending={saving} onClick={onSave}>저장</SaveButton>
      </div>
      {draft.dateKey && !hasValidDate && (
        <div className="px-2 pb-2 text-[11px] text-red-600">Lab 날짜는 1900년부터 오늘 사이로 입력해주세요.</div>
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
  onChange,
}: {
  value: string;
  type?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  invalid?: boolean;
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
      }`}
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

function buildTabBadges(patientId: string, data: BriefingData): Partial<Record<WorkspaceTabId, number>> {
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
      ...reminders.map((item) => ({ key: item.noteId, prefix: '알림', title: item.content, detail: item.roomBed, tab: 'notes' as WorkspaceTabId, tone: 'warning' as const })),
      ...schedules.map((item) => ({ key: item.scheduleId, prefix: item.scheduledTime ?? '일정', title: item.title, detail: item.category, tab: 'schedule' as WorkspaceTabId, tone: 'default' as const })),
      ...antibiotics.map((item) => ({ key: item.medicationId, prefix: `D+${item.dDay}`, title: item.drugName, detail: `${item.dosage ?? ''} ${item.frequency ?? ''}`.trim(), tab: 'medications' as WorkspaceTabId, tone: item.isLongTerm ? 'danger' as const : 'warning' as const })),
      ...labs.map((item) => ({ key: `${item.patientId}-${item.dateKey}`, prefix: 'Lab', title: item.abnormalItems.join(', '), detail: item.dateKey, tab: 'lab' as WorkspaceTabId, tone: 'danger' as const })),
    ],
  };
}

function buildHandoffLines(patient: Patient, rows: ReturnType<typeof getPatientRows>) {
  return [
    `${patient.roomBed} ${patient.name} ${patient.sex}`,
    patient.chiefComplaint && `C/C: ${patient.chiefComplaint}${formatOnsetElapsedText(patient.onset) ? ` (${formatOnsetElapsedText(patient.onset)})` : ''}`,
    patient.problemList.length > 0 && `Problems: ${patient.problemList.join(', ')}`,
    patient.presentIllness && `PI: ${patient.presentIllness}`,
    patient.plan && `Plan: ${patient.plan}`,
    rows.reminders.length > 0 && `알림: ${rows.reminders.map((item) => item.content).join(' / ')}`,
    rows.schedules.length > 0 && `일정: ${rows.schedules.map((item) => `${item.scheduledTime ? `${item.scheduledTime} ` : ''}${item.title}`).join(' / ')}`,
    rows.antibiotics.length > 0 && `항생제: ${rows.antibiotics.map((item) => `${item.drugName} D+${item.dDay}`).join(' / ')}`,
    rows.labs.length > 0 && `Lab: ${rows.labs.map((item) => item.abnormalItems.join(', ')).join(' / ')}`,
  ].filter(Boolean) as string[];
}

function buildChartingCopy(draft: ChartingDraft) {
  const problemLines = draft.problemListText
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => `#${index + 1}. ${item}`)
    .join('\n');

  return [
    draft.chiefComplaint && `C/C: ${draft.chiefComplaint}`,
    draft.onset && `Onset: ${draft.onset}`,
    draft.presentIllness && `PI: ${draft.presentIllness}`,
    draft.pastHistory && `P/Hx: ${draft.pastHistory}`,
    draft.reviewOfSystem && `ROS: ${draft.reviewOfSystem}`,
    draft.physicalExam && `P/Ex: ${draft.physicalExam}`,
    problemLines && `Problem List:\n${problemLines}`,
    draft.plan && `Plan: ${draft.plan}`,
    draft.guardianExplanation && `설명: ${draft.guardianExplanation}`,
    draft.etc && `Etc: ${draft.etc}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function areDraftsEqual(left: ChartingDraft, right: ChartingDraft) {
  return JSON.stringify(left) === JSON.stringify(right);
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
