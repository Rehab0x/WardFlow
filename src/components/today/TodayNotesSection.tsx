import { ClipboardList } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CopyTextButton } from '../clinical/CopyTextButton';
import { DataSection } from '../clinical/DataSection';
import { NoteRow } from '../clinical/NoteRow';
import { formatDateInput, parseDateInput } from '../clinical/dateLabels';
import { useNotesByDate } from '@/hooks/useNotesByDate';
import type { BriefingData, ProgressItem } from '@/services/briefingService';
import { compareRoom } from './todayTasks';

interface PatientNotes {
  patientId: string;
  patientName: string;
  roomBed: string;
  notes: ProgressItem[];
}

/** 환자별로 묶고 병실순으로 정렬한다. */
export function groupNotesByPatient(notes: ProgressItem[]): PatientNotes[] {
  const groups = new Map<string, PatientNotes>();
  for (const note of notes) {
    const group = groups.get(note.patientId) ?? {
      patientId: note.patientId,
      patientName: note.patientName,
      roomBed: note.roomBed,
      notes: [],
    };
    group.notes.push(note);
    groups.set(note.patientId, group);
  }
  return [...groups.values()].sort((a, b) => compareRoom(a.roomBed, b.roomBed));
}

export const joinNotes = (notes: ProgressItem[]) => notes.map((note) => note.content.trim()).join('\n\n');

/** 환자 이름·병실을 머리글로 붙여 전체를 한 번에 복사할 때 쓰는 텍스트 */
export function buildAllNotesText(groups: PatientNotes[]) {
  return groups
    .map((group) => `[${group.roomBed} ${group.patientName}]\n${joinNotes(group.notes)}`)
    .join('\n\n');
}

const shiftDay = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/**
 * Today의 "오늘 메모" — 그날 쓴 경과 메모를 환자별로 한 화면에 펼쳐 놓는다.
 * 차팅할 때 환자를 찾아다니지 않고 여기서 긁거나 복사 버튼으로 바로 붙여넣을 수 있다.
 * 날짜를 바꿔 지난 날의 메모도 같은 방식으로 볼 수 있다 (오늘은 브리핑 데이터를 그대로 쓴다).
 */
export function TodayNotesSection({
  data,
  onOpenPatient,
}: {
  data: BriefingData;
  onOpenPatient?: (patientId: string, tab?: string) => void;
}) {
  const [date, setDate] = useState(() => new Date());
  const today = new Date();
  const isToday = formatDateInput(date) === formatDateInput(today);
  const past = useNotesByDate(date, !isToday);
  const notes = isToday ? data.progressNotes : past.notes;
  const groups = useMemo(() => groupNotesByPatient(notes), [notes]);
  const title = isToday ? '오늘 메모' : `${formatDateInput(date)} 메모`;

  const move = (days: number) => {
    const next = shiftDay(date, days);
    if (next.getTime() <= today.getTime()) setDate(next);
  };

  return (
    <div className="mt-2">
      <DataSection
        icon={ClipboardList}
        title={title}
        count={notes.length}
        action={
          <div className="flex flex-wrap items-center justify-end gap-1">
            <button type="button" onClick={() => move(-1)} aria-label="전날" className={navButton}>‹</button>
            <input
              type="date"
              value={formatDateInput(date)}
              max={formatDateInput(today)}
              onChange={(event) => {
                const next = parseDateInput(event.target.value);
                if (next) setDate(next);
              }}
              aria-label="메모 날짜"
              className="h-6 rounded border border-zinc-200 bg-white px-1 text-[11px] text-zinc-700"
            />
            <button type="button" onClick={() => move(1)} disabled={isToday} aria-label="다음날" className={navButton}>›</button>
            {!isToday && (
              <button type="button" onClick={() => setDate(new Date())} className={navButton}>오늘</button>
            )}
            {groups.length > 0 && (
              <CopyTextButton text={buildAllNotesText(groups)} label="전체 복사" ariaLabel="메모 전체 복사" />
            )}
          </div>
        }
      >
        {!isToday && past.isLoading ? (
          <div className="px-3 py-2 text-[12px] text-zinc-400">불러오는 중</div>
        ) : past.error && !isToday ? (
          <div className="px-3 py-2 text-[12px] text-red-600">{past.error}</div>
        ) : groups.length === 0 ? (
          <div className="px-3 py-2 text-[12px] text-zinc-400">
            {isToday ? '오늘 쓴 메모가 없습니다' : '이 날 쓴 메모가 없습니다'}
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.patientId}>
              <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-2 py-1">
                <span className="font-mono text-[11px] tabular-nums text-zinc-500">{group.roomBed}</span>
                <button
                  type="button"
                  onClick={() => onOpenPatient?.(group.patientId, 'notes')}
                  className="text-[12px] font-medium text-zinc-900 hover:underline"
                >
                  {group.patientName}
                </button>
                {group.notes.length > 1 && (
                  <span className="font-mono text-[10.5px] text-zinc-400">{group.notes.length}</span>
                )}
                <span className="ml-auto">
                  <CopyTextButton
                    text={joinNotes(group.notes)}
                    label="환자 메모 복사"
                    ariaLabel={`${group.patientName} 메모 복사`}
                  />
                </span>
              </div>
              {group.notes.map((note) => (
                <NoteRow key={note.noteId} prefix="경과" content={note.content} />
              ))}
            </div>
          ))
        )}
      </DataSection>
    </div>
  );
}

const navButton =
  'h-6 rounded border border-zinc-200 bg-white px-1.5 text-[11px] text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300';
