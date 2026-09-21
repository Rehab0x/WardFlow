import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClinicalRow } from '@/components/clinical/ClinicalRow';
import { DataSection } from '@/components/clinical/DataSection';
import { AiActionPanel } from '@/components/ai/AiActionPanel';
import { generateSOAP } from '@/services/aiService';
import { Input, RemoveButton, SaveButton } from '../controls';
import type { PatientWorkspaceProps, WorkspaceTabBaseProps } from '../types';
import {
  buildSoapContext,
  groupNotesByDate,
  insertAssessmentProblem,
  limitNoteGroups,
} from '../workspaceData';
import { useNoteStore } from '@/stores/useNoteStore';
import { formatDateInput, formatRelativeDayLabel } from '@/components/clinical/dateLabels';
import { isComposingKeyboardEvent } from '../workspaceInput';

interface NotesTabProps extends WorkspaceTabBaseProps {
  onAddNote?: PatientWorkspaceProps['onAddNote'];
  onRemoveNote?: PatientWorkspaceProps['onRemoveNote'];
}

/** 한 번에 펼쳐 두는 메모 개수 — 이보다 많으면 접고 "더 보기"로 연다. */
const VISIBLE_NOTE_LIMIT = 10;

export function NotesTab({ patient, data, onAddNote, onRemoveNote, onDirtyChange }: NotesTabProps) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'progress' | 'reminder'>('progress');
  const [dateKey, setDateKey] = useState(() => formatDateInput(new Date()));
  const [saving, setSaving] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);

  // 메모는 이 탭에 들어올 때 환자 전체 기간을 불러온다.
  // Today 브리핑에는 오늘 것만 들어 있어, 그대로 쓰면 지난 메모가 보이지 않는다.
  const allNotes = useNoteStore((store) => store.notes);
  const notesLoading = useNoteStore((store) => store.isLoading);
  const fetchNotesByPatient = useNoteStore((store) => store.fetchNotesByPatient);

  useEffect(() => {
    void fetchNotesByPatient(patient.id);
  }, [fetchNotesByPatient, patient.id]);

  const notes = useMemo(
    () => allNotes.filter((item) => item.patientId === patient.id),
    [allNotes, patient.id]
  );
  const noteGroups = useMemo(() => groupNotesByDate(notes), [notes]);
  const visible = useMemo(
    () => limitNoteGroups(noteGroups, showAllNotes ? Number.MAX_SAFE_INTEGER : VISIBLE_NOTE_LIMIT),
    [noteGroups, showAllNotes]
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

  useEffect(() => {
    setContent('');
    setType('progress');
    setDateKey(formatDateInput(new Date()));
    setSaving(false);
    setShowAllNotes(false);
  }, [patient.id]);
  useEffect(() => onDirtyChange?.(hasDraft), [hasDraft, onDirtyChange]);
  // 미저장 플래그는 "현재 마운트된 탭"의 것이다. 탭을 벗어나면 반드시 내려놓아야
  // 다른 탭(예: 요약)이 이전 탭의 입력 상태를 물려받지 않는다.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const save = useCallback(async () => {
    const text = content.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await onAddNote?.(text, type, dateKey);
      setContent('');
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [content, dateKey, onAddNote, saving, type]);

  const runSoap = useCallback(() => generateSOAP(soapContext), [soapContext]);

  // 차트 Problem List에서 골라 A) 섹션에 바로 끼워 넣는다.
  const problems = useMemo(
    () => patient.problemList.map((item) => item.trim()).filter(Boolean),
    [patient.problemList]
  );
  const renderSoapTools = useCallback(
    ({ result, setResult }: { result: string; setResult: (next: string) => void }) => {
      if (problems.length === 0) return null;
      return (
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] text-zinc-400">A)에 추가</span>
          {problems.map((problem) => (
            <button
              key={problem}
              type="button"
              onClick={() => setResult(insertAssessmentProblem(result, problem))}
              title={`A) 섹션에 "#. ${problem}" 추가`}
              className="inline-flex h-7 items-center rounded-md border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              #. {problem}
            </button>
          ))}
        </div>
      );
    },
    [problems]
  );
  const saveSoapAsNote = useCallback(
    async (text: string) => {
      await onAddNote?.(text, 'progress');
    },
    [onAddNote]
  );

  return (
    <div className="space-y-3">
      <DataSection title="메모 추가">
        <div
          className="grid gap-2 p-2 sm:grid-cols-[110px_130px_minmax(0,1fr)_auto]"
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || isComposingKeyboardEvent(event)) return;
            event.preventDefault();
            save();
          }}
        >
          <select
            aria-label="메모 유형"
            value={type}
            onChange={(event) => setType(event.target.value as 'progress' | 'reminder')}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
          >
            <option value="progress">경과</option>
            <option value="reminder">알림</option>
          </select>
          <input
            type="date"
            aria-label="메모 날짜"
            value={dateKey}
            onChange={(event) => setDateKey(event.target.value)}
            className="h-8 w-full min-w-0 rounded-md border border-zinc-200 bg-white px-2 font-mono text-[12px] tabular-nums text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          <Input
            value={content}
            placeholder={type === 'reminder' ? '그날 띄울 알림' : '빠른 메모 입력'}
            onChange={setContent}
          />
          <SaveButton disabled={!hasDraft} pending={saving} onClick={save}>
            저장
          </SaveButton>
        </div>
      </DataSection>

      <AiActionPanel
        title="AI SOAP 생성"
        actionLabel="SOAP 생성"
        resultTitle="SOAP 초안"
        resetKey={patient.id}
        ready={Boolean(soapContext.progressNote.trim())}
        readyHint="입력 중인 메모와 최근 정보를 바탕으로 초안을 만듭니다."
        notReadyHint="메모를 입력하거나 최근 경과 메모가 필요합니다."
        run={runSoap}
        renderResultTools={renderSoapTools}
        onSaveResult={saveSoapAsNote}
        saveLabel="메모로 저장"
      />

      <DataSection title="메모" count={notes.length}>
        {notes.length === 0 ? (
          <ClinicalRow
            prefix="-"
            title="0"
            detail={notesLoading ? '불러오는 중' : '메모 없음'}
          />
        ) : (
          visible.groups.map((group) => (
            <div key={group.dateKey}>
              <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-3 py-1">
                <span className="font-mono text-[11px] font-medium tabular-nums text-zinc-600">
                  {group.dateKey}
                </span>
                <span className="text-[10.5px] text-zinc-400">
                  {formatRelativeDayLabel(group.dateKey)}
                </span>
                <span className="ml-auto font-mono text-[10.5px] text-zinc-400">
                  {group.notes.length}
                </span>
              </div>
              {group.notes.map((item) => (
                <ClinicalRow
                  key={item.id}
                  prefix={item.type === 'reminder' ? '알림' : '경과'}
                  title={item.content}
                  tone={item.type === 'reminder' ? 'warning' : 'default'}
                  action={
                    onRemoveNote ? (
                      <RemoveButton onClick={() => onRemoveNote(item.id, item.type)} />
                    ) : undefined
                  }
                />
              ))}
            </div>
          ))
        )}
        {visible.hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllNotes(true)}
            className="w-full border-t border-zinc-100 px-3 py-1.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
          >
            지난 메모 {visible.hiddenCount}개 더 보기
          </button>
        )}
        {showAllNotes && noteGroups.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAllNotes(false)}
            className="w-full border-t border-zinc-100 px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
          >
            접기
          </button>
        )}
      </DataSection>
    </div>
  );
}
