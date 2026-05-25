import { describe, expect, it } from 'vitest';
import { formatRestoreDelta, formatSnapshotCounts, formatSnapshotOption } from './BackupSettings';
import type { BackupSnapshotSummary } from '@/data/backupSnapshots.repository';

describe('BackupSettings helpers', () => {
  it('formats snapshot labels with creation time and kind', () => {
    const snapshot: BackupSnapshotSummary = {
      id: 'snapshot-1',
      kind: 'manual',
      createdAt: new Date('2026-05-25T03:00:00+09:00'),
      recordCounts: {},
    };

    expect(formatSnapshotOption(snapshot)).toContain('manual');
    expect(formatSnapshotOption(snapshot)).toContain('2026');
  });

  it('formats available data counts and defaults malformed values', () => {
    expect(
      formatSnapshotCounts({
        patients: 3,
        notes: 4,
        schedules: 2,
        labResults: 5,
      })
    ).toBe('환자 3, 메모 4, 일정 2, Lab 5');

    expect(formatSnapshotCounts({ patients: 'bad', notes: null })).toBe(
      '환자 0, 메모 0, 일정 0, Lab 0'
    );
    expect(formatSnapshotCounts(null)).toBe('데이터 개수 없음');
  });

  it('formats restore count deltas', () => {
    expect(formatRestoreDelta(0)).toBe('동일');
    expect(formatRestoreDelta(3)).toBe('+3');
    expect(formatRestoreDelta(-2)).toBe('-2');
  });
});
