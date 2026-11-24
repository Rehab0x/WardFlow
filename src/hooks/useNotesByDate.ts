import { useEffect, useState } from 'react';
import { listProgressNotesByPatientIdsCreatedBetween } from '@/data/notes.repository';
import { formatUserFacingError } from '@/lib/errorMessages';
import type { ProgressItem } from '@/services/briefingService';
import { usePatientStore } from '@/stores/usePatientStore';

interface NotesByDate {
  notes: ProgressItem[];
  isLoading: boolean;
  error: string | null;
}

/**
 * 지난 날짜(오늘이 아닌 날)에 쓴 경과 메모를 환자별로 쓸 수 있는 형태로 불러온다.
 * `enabled`가 false(오늘)면 아무것도 읽지 않는다 — 오늘 것은 Today 브리핑이 이미 들고 있다.
 */
export function useNotesByDate(date: Date, enabled: boolean): NotesByDate {
  const patients = usePatientStore((store) => store.patients);
  const [state, setState] = useState<NotesByDate>({ notes: [], isLoading: false, error: null });
  const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  useEffect(() => {
    if (!enabled) {
      setState({ notes: [], isLoading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ notes: [], isLoading: true, error: null });

    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    const byId = new Map(patients.map((patient) => [patient.id, patient]));

    listProgressNotesByPatientIdsCreatedBetween([...byId.keys()], start, end)
      .then((rows) => {
        if (cancelled) return;
        const notes = rows.flatMap((note): ProgressItem[] => {
          const patient = byId.get(note.patientId);
          return patient
            ? [{ patientId: patient.id, patientName: patient.name, roomBed: patient.roomBed, noteId: note.id, content: note.content }]
            : [];
        });
        setState({ notes, isLoading: false, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ notes: [], isLoading: false, error: formatUserFacingError(error, '메모를 불러오지 못했습니다.') });
      });

    return () => {
      cancelled = true;
    };
    // date 객체 대신 날짜 키로 비교한다 (렌더마다 새 Date가 만들어져도 다시 읽지 않도록)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, enabled, patients]);

  return state;
}
