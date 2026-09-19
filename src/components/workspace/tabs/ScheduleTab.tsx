import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClinicalRow } from '@/components/clinical/ClinicalRow';
import { DataSection } from '@/components/clinical/DataSection';
import { Input, RemoveButton, SaveButton } from '../controls';
import type { PatientWorkspaceProps, WorkspaceTabBaseProps } from '../types';
import { isComposingKeyboardEvent, normalizeClockTime } from '../workspaceInput';

interface ScheduleTabProps extends WorkspaceTabBaseProps {
  onAddTodaySchedule?: PatientWorkspaceProps['onAddTodaySchedule'];
  onRemoveTodaySchedule?: PatientWorkspaceProps['onRemoveTodaySchedule'];
}

const emptyDraft = () => ({ title: '', category: '검사', scheduledTime: '' });

export function ScheduleTab({
  patient,
  data,
  onAddTodaySchedule,
  onRemoveTodaySchedule,
  onDirtyChange,
}: ScheduleTabProps) {
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const schedules = useMemo(
    () => data.todaySchedules.filter((item) => item.patientId === patient.id),
    [data.todaySchedules, patient.id]
  );
  const hasValidTime =
    !draft.scheduledTime.trim() || Boolean(normalizeClockTime(draft.scheduledTime));
  const hasDraft = Boolean(draft.title.trim());

  useEffect(() => {
    setDraft(emptyDraft());
    setSaving(false);
  }, [patient.id]);
  useEffect(() => onDirtyChange?.(hasDraft), [hasDraft, onDirtyChange]);
  // 미저장 플래그는 "현재 마운트된 탭"의 것이다. 탭을 벗어나면 반드시 내려놓아야
  // 다른 탭(예: 요약)이 이전 탭의 입력 상태를 물려받지 않는다.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const save = useCallback(async () => {
    if (!hasDraft || !hasValidTime || saving) return;
    setSaving(true);
    try {
      await onAddTodaySchedule?.({
        ...draft,
        scheduledTime: normalizeClockTime(draft.scheduledTime),
      });
      setDraft(emptyDraft());
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
