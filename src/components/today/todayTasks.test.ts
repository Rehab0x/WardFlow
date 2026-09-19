import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BriefingData } from '@/services/briefingService';
import {
  buildTaskFilterOptions,
  buildTaskRows,
  getSchedulePriority,
  getTaskEmptyText,
  sortTaskRows,
  summarizeTaskRows,
} from './todayTasks';

function makeBriefingData(overrides: Partial<BriefingData> = {}): BriefingData {
  return {
    reminders: [],
    progressNotes: [],
    antibiotics: [],
    recentLabs: [],
    todaySchedules: [],
    patientSummary: { total: 0, admitted: 0, consult: 0 },
    ...overrides,
  };
}

const reminder = {
  patientId: 'p1',
  patientName: '김환자',
  roomBed: '302',
  noteId: 'n1',
  content: '가족 면담',
};

const completedSchedule = {
  patientId: 'p2',
  patientName: '이환자',
  roomBed: '101',
  scheduleId: 's1',
  title: 'CT',
  category: '검사',
  scheduledTime: '09:00',
  isCompleted: true,
};

const openSchedule = { ...completedSchedule, scheduleId: 's2', title: 'MRI', isCompleted: false };

describe('buildTaskRows', () => {
  it('skips completed schedules and normal labs', () => {
    const rows = buildTaskRows(
      makeBriefingData({
        reminders: [reminder],
        todaySchedules: [completedSchedule, openSchedule],
        recentLabs: [
          {
            patientId: 'p1',
            patientName: '김환자',
            roomBed: '302',
            dateKey: '2026-09-18',
            abnormalCount: 0,
            abnormalItems: [],
            totalItems: 12,
          },
        ],
      })
    );

    expect(rows.map((row) => row.id)).toEqual(['reminder-n1', 'schedule-s2']);
  });
});

describe('sortTaskRows', () => {
  it('puts reminders before ordinary schedules and sorts by room when asked', () => {
    const rows = buildTaskRows(
      makeBriefingData({ reminders: [reminder], todaySchedules: [openSchedule] })
    );

    // 알림은 priority 10으로 일정(12/45)보다 항상 앞선다.
    expect(sortTaskRows(rows, 'priority').map((row) => row.id)[0]).toBe('reminder-n1');
    expect(sortTaskRows(rows, 'room').map((row) => row.roomBed)).toEqual(['101', '302']);
  });
});

describe('getSchedulePriority', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 19, 10, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('ranks overdue schedules first, then imminent ones, then the rest', () => {
    expect(getSchedulePriority('09:00')).toBe(12);
    expect(getSchedulePriority('10:30')).toBe(15);
    expect(getSchedulePriority('16:00')).toBe(45);
  });

  it('falls back to the lowest priority for missing or malformed times', () => {
    expect(getSchedulePriority()).toBe(45);
    expect(getSchedulePriority('nope')).toBe(45);
  });
});

describe('buildTaskFilterOptions / summarizeTaskRows', () => {
  it('counts rows per kind and flags urgent rows', () => {
    const rows = buildTaskRows(
      makeBriefingData({
        reminders: [reminder],
        antibiotics: [
          {
            patientId: 'p3',
            patientName: '박환자',
            roomBed: '505',
            medicationId: 'm1',
            drugName: 'Meropenem',
            dosage: '1g',
            frequency: '#3',
            dDay: 20,
            isLongTerm: true,
            startDate: new Date(2026, 7, 30),
          },
        ],
      })
    );

    const options = buildTaskFilterOptions(rows);
    expect(options.find((option) => option.value === 'all')?.count).toBe(2);
    expect(options.find((option) => option.value === 'antibiotic')?.count).toBe(1);
    expect(summarizeTaskRows(rows).urgent).toBe(1);
  });
});

describe('getTaskEmptyText', () => {
  it('returns a filter-specific empty message', () => {
    expect(getTaskEmptyText('reminder')).toBe('오늘 알림 없음');
    expect(getTaskEmptyText('lab')).toBe('확인할 비정상 Lab 없음');
    expect(getTaskEmptyText('all')).toBe('오늘 확인할 항목 없음');
  });
});
