import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BriefingData } from '@/services/briefingService';
import type { Note } from '@/types/note';
import type { Patient } from '@/types/patient';
import { useNoteStore } from '@/stores/useNoteStore';
import { NotesTab } from './NotesTab';

const fetchNotesByPatient = vi.fn().mockResolvedValue(undefined);

const patient = { id: 'p1', name: '홍길동', problemList: [] } as unknown as Patient;

const briefing: BriefingData = {
  reminders: [],
  progressNotes: [],
  antibiotics: [],
  recentLabs: [],
  todaySchedules: [],
  patientSummary: { total: 0, admitted: 0, consult: 0 },
};

function note(overrides: Partial<Note> & { id: string; createdAt: Date }): Note {
  return {
    patientId: 'p1',
    content: '내용',
    type: 'progress',
    updatedAt: overrides.createdAt,
    ...overrides,
  } as Note;
}

function day(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(9, 0, 0, 0);
  return date;
}

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${dayOfMonth}`;
}

describe('NotesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNoteStore.setState({ notes: [], isLoading: false, error: null, fetchNotesByPatient });
  });

  it('loads the whole history for the patient on entry', () => {
    render(<NotesTab patient={patient} data={briefing} />);
    expect(fetchNotesByPatient).toHaveBeenCalledWith('p1');
  });

  it('shows notes from earlier days, not just today', () => {
    useNoteStore.setState({
      notes: [
        note({ id: 'n1', createdAt: day(0), content: '오늘 경과' }),
        note({ id: 'n2', createdAt: day(-1), content: '어제 경과' }),
        note({ id: 'n3', createdAt: day(-5), content: '닷새 전 경과' }),
      ],
    });

    render(<NotesTab patient={patient} data={briefing} />);

    expect(screen.getByText('오늘 경과')).toBeInTheDocument();
    expect(screen.getByText('어제 경과')).toBeInTheDocument();
    expect(screen.getByText('닷새 전 경과')).toBeInTheDocument();
  });

  it('groups by date with the newest day first', () => {
    useNoteStore.setState({
      notes: [
        note({ id: 'n1', createdAt: day(-1), content: '어제 경과' }),
        note({ id: 'n2', createdAt: day(0), content: '오늘 경과' }),
      ],
    });

    render(<NotesTab patient={patient} data={briefing} />);

    const headings = screen.getAllByText(/^\d{4}-\d{2}-\d{2}$/).map((node) => node.textContent);
    expect(headings).toEqual([dateKey(day(0)), dateKey(day(-1))]);
    expect(screen.getByText('오늘')).toBeInTheDocument();
    expect(screen.getByText('어제')).toBeInTheDocument();
  });

  it('files a reminder under the day it is meant to show', () => {
    useNoteStore.setState({
      notes: [
        note({
          id: 'n1',
          type: 'reminder',
          createdAt: day(-3),
          alertDate: day(1),
          content: '내일 확인할 것',
        }),
      ],
    });

    render(<NotesTab patient={patient} data={briefing} />);

    expect(screen.getByText(dateKey(day(1)))).toBeInTheDocument();
    expect(screen.queryByText(dateKey(day(-3)))).not.toBeInTheDocument();
  });

  it('leaves out other patients notes', () => {
    useNoteStore.setState({
      notes: [
        note({ id: 'n1', createdAt: day(0), content: '이 환자' }),
        note({ id: 'n2', createdAt: day(0), patientId: 'p2', content: '다른 환자' }),
      ],
    });

    render(<NotesTab patient={patient} data={briefing} />);

    expect(screen.getByText('이 환자')).toBeInTheDocument();
    expect(screen.queryByText('다른 환자')).not.toBeInTheDocument();
  });

  it('says it is loading rather than claiming there are none', () => {
    useNoteStore.setState({ notes: [], isLoading: true });
    render(<NotesTab patient={patient} data={briefing} />);
    expect(screen.getByText('불러오는 중')).toBeInTheDocument();
  });
});
