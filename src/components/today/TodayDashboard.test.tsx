import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodayDashboard } from './TodayDashboard';
import { emptyBriefingData } from '@/features/app/optimisticBriefing';

const data = {
  ...emptyBriefingData,
  patientSummary: { total: 2, admitted: 1, consult: 1 },
  reminders: [
    { patientId: 'p1', patientName: '김환자', roomBed: '302', noteId: 'n1', content: '가족 면담' },
  ],
  todaySchedules: [
    {
      patientId: 'p2',
      patientName: '이환자',
      roomBed: '101',
      scheduleId: 's1',
      title: 'MRI',
      category: '검사',
      scheduledTime: '09:00',
      isCompleted: false,
    },
  ],
};

describe('TodayDashboard', () => {
  it('renders metrics, the task list and the domain sections without crashing', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TodayDashboard data={data} />);

    const messages = errorSpy.mock.calls.map((call) => String(call[0])).join('\n');
    errorSpy.mockRestore();

    expect(messages).not.toMatch(/getSnapshot should be cached|Maximum update depth/);
    expect(screen.getByRole('heading', { name: '오늘' })).toBeInTheDocument();
    expect(screen.getByText('오늘 할 일')).toBeInTheDocument();
    // 할 일 목록과 하단 도메인 섹션 양쪽에 나타난다
    expect(screen.getAllByText('가족 면담')).toHaveLength(2);
    expect(screen.getAllByText('MRI')).toHaveLength(2);
  });

  it('filters the task list when a metric tile is clicked', async () => {
    const user = userEvent.setup();
    render(<TodayDashboard data={data} />);

    // 지표 타일의 접근 가능 이름은 "<라벨> <값>" 형식이다 (MetricTile).
    const metrics = screen.getByRole('group', { name: '오늘 지표' });
    const reminderTile = within(metrics).getByRole('button', { name: '알림 1' });
    expect(screen.getAllByText('MRI')).toHaveLength(2); // 할 일 + 하단 일정 섹션

    await user.click(reminderTile);

    expect(reminderTile).toHaveAttribute('aria-pressed', 'true');
    // 알림만 남고 일정은 할 일 목록에서 빠진다 (하단 일정 섹션에는 그대로)
    expect(screen.getAllByText('가족 면담')).toHaveLength(2);
    expect(screen.getAllByText('MRI')).toHaveLength(1);
  });

  it('shows search results when a query is active', () => {
    render(<TodayDashboard data={emptyBriefingData} searchQuery="김" searchResults={[]} />);
    expect(screen.getByText('검색 결과')).toBeInTheDocument();
    expect(screen.getByText('일치하는 환자 없음')).toBeInTheDocument();
  });
});
