import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePatientStore } from '@/stores/usePatientStore';
import { listProgressNotesByPatientIdsCreatedBetween } from '@/data/notes.repository';
import type { BriefingData, ProgressItem } from '@/services/briefingService';
import { TodayNotesSection, buildAllNotesText, groupNotesByPatient } from './TodayNotesSection';

vi.mock('@/data/notes.repository', () => ({
  listProgressNotesByPatientIdsCreatedBetween: vi.fn(),
}));

const note = (noteId: string, patientId: string, patientName: string, roomBed: string, content: string): ProgressItem => ({
  noteId,
  patientId,
  patientName,
  roomBed,
  content,
});

const notes = [
  note('n1', 'p2', '이몽룡', '302-1', 'O) 열 없음\nP) 경과 관찰'),
  note('n2', 'p1', '홍길동', '201-2', 'O) Fever\nA) #. R/O UTI\nP) Tazocin'),
  note('n3', 'p1', '홍길동', '201-2', '오후 추가: 해열됨'),
];

const data = (progressNotes: ProgressItem[]) =>
  ({ progressNotes, reminders: [], antibiotics: [], recentLabs: [], todaySchedules: [] }) as unknown as BriefingData;

afterEach(() => vi.restoreAllMocks());

describe('groupNotesByPatient', () => {
  it('환자별로 묶고 병실순으로 정렬한다', () => {
    const groups = groupNotesByPatient(notes);
    expect(groups.map((g) => g.patientName)).toEqual(['홍길동', '이몽룡']);
    expect(groups[0]!.notes).toHaveLength(2);
  });

  it('전체 복사 텍스트는 병실·이름 머리글 + 메모 (같은 환자 메모는 빈 줄로 구분)', () => {
    expect(buildAllNotesText(groupNotesByPatient(notes))).toBe(
      '[201-2 홍길동]\nO) Fever\nA) #. R/O UTI\nP) Tazocin\n\n오후 추가: 해열됨\n\n[302-1 이몽룡]\nO) 열 없음\nP) 경과 관찰'
    );
  });
});

describe('TodayNotesSection', () => {
  it('오늘 메모가 없어도 날짜를 바꿀 수 있도록 섹션은 남는다', () => {
    render(<TodayNotesSection data={data([])} />);
    expect(screen.getByText('오늘 쓴 메모가 없습니다')).toBeInTheDocument();
    expect(screen.getByLabelText('메모 날짜')).toBeInTheDocument();
  });

  it('메모를 줄바꿈 그대로 보여 준다', () => {
    render(<TodayNotesSection data={data(notes)} />);
    expect(screen.getByText(/R\/O UTI/).textContent).toBe('O) Fever\nA) #. R/O UTI\nP) Tazocin');
  });

  it('환자별 복사 버튼은 그 환자 메모만 복사한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<TodayNotesSection data={data(notes)} />);

    fireEvent.click(screen.getByRole('button', { name: '홍길동 메모 복사' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('O) Fever\nA) #. R/O UTI\nP) Tazocin\n\n오후 추가: 해열됨')
    );
  });

  it('환자 이름을 누르면 그 환자의 메모 탭을 연다', () => {
    const onOpenPatient = vi.fn();
    render(<TodayNotesSection data={data(notes)} onOpenPatient={onOpenPatient} />);
    fireEvent.click(screen.getByRole('button', { name: '이몽룡' }));
    expect(onOpenPatient).toHaveBeenCalledWith('p2', 'notes');
  });
});

describe('TodayNotesSection — 지난 날짜', () => {
  const fetchNotes = vi.mocked(listProgressNotesByPatientIdsCreatedBetween);

  beforeEach(() => {
    fetchNotes.mockReset();
    usePatientStore.setState({
      patients: [
        { id: 'p1', name: '홍길동', roomBed: '201-2' },
        { id: 'p3', name: '성춘향', roomBed: '105-1' },
      ] as never,
    });
  });

  it('전날로 가면 그 날 쓴 메모를 환자 정보와 함께 불러와 보여 준다', async () => {
    fetchNotes.mockResolvedValue([
      { id: 'o1', patientId: 'p3', content: 'O) 어제 소견\nP) 유지', type: 'progress' },
      { id: 'o2', patientId: 'gone', content: '명단에 없는 환자', type: 'progress' },
    ] as never);
    render(<TodayNotesSection data={data(notes)} />);

    fireEvent.click(screen.getByRole('button', { name: '전날' }));

    expect(await screen.findByText(/어제 소견/)).toBeInTheDocument();
    expect(screen.getByText('성춘향')).toBeInTheDocument();
    expect(screen.queryByText('명단에 없는 환자')).not.toBeInTheDocument();
    // 오늘 메모는 더 이상 보이지 않는다
    expect(screen.queryByText(/R\/O UTI/)).not.toBeInTheDocument();

    const [ids, start, end] = fetchNotes.mock.calls[0]!;
    expect(ids).toEqual(['p1', 'p3']);
    expect(end.getTime() - start.getTime()).toBeGreaterThan(23 * 3600_000);
  });

  it('그 날 메모가 없으면 안내 문구, "오늘"을 누르면 다시 오늘 메모', async () => {
    fetchNotes.mockResolvedValue([]);
    render(<TodayNotesSection data={data(notes)} />);

    fireEvent.click(screen.getByRole('button', { name: '전날' }));
    expect(await screen.findByText('이 날 쓴 메모가 없습니다')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '오늘' }));
    expect(screen.getByText(/R\/O UTI/)).toBeInTheDocument();
  });

  it('오늘보다 뒤로는 갈 수 없다', () => {
    render(<TodayNotesSection data={data(notes)} />);
    expect(screen.getByRole('button', { name: '다음날' })).toBeDisabled();
  });

  it('불러오기에 실패하면 오류를 보여 준다', async () => {
    fetchNotes.mockRejectedValue(new Error('network'));
    render(<TodayNotesSection data={data(notes)} />);
    fireEvent.click(screen.getByRole('button', { name: '전날' }));
    await waitFor(() => expect(screen.queryByText('불러오는 중')).not.toBeInTheDocument());
    expect(screen.queryByText('이 날 쓴 메모가 없습니다')).not.toBeInTheDocument();
  });
});
