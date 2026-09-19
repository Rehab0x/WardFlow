import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClinicalRow } from '@/components/clinical/ClinicalRow';
import { DataSection } from '@/components/clinical/DataSection';
import { AiActionPanel } from '@/components/ai/AiActionPanel';
import { generateSOAP } from '@/services/aiService';
import { Input, RemoveButton, SaveButton } from '../controls';
import type { PatientWorkspaceProps, WorkspaceTabBaseProps } from '../types';
import { buildSoapContext } from '../workspaceData';
import { isComposingKeyboardEvent } from '../workspaceInput';

interface NotesTabProps extends WorkspaceTabBaseProps {
  onAddNote?: PatientWorkspaceProps['onAddNote'];
  onRemoveNote?: PatientWorkspaceProps['onRemoveNote'];
}

export function NotesTab({ patient, data, onAddNote, onRemoveNote, onDirtyChange }: NotesTabProps) {
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

  const runSoap = useCallback(() => generateSOAP(soapContext), [soapContext]);
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
          className="grid gap-2 p-2 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
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

      <AiActionPanel
        title="AI SOAP 생성"
        actionLabel="SOAP 생성"
        resultTitle="SOAP 초안"
        resetKey={patient.id}
        ready={Boolean(soapContext.progressNote.trim())}
        readyHint="입력 중인 메모와 최근 정보를 바탕으로 초안을 만듭니다."
        notReadyHint="메모를 입력하거나 최근 경과 메모가 필요합니다."
        run={runSoap}
        onSaveResult={saveSoapAsNote}
        saveLabel="메모로 저장"
      />

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
