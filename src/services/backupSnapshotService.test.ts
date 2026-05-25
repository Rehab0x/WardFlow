import { describe, expect, it } from 'vitest';
import {
  BackupSnapshotError,
  formatBackupSnapshotError,
  validateSnapshotRestore,
  type SnapshotRecordCounts,
} from './backupSnapshotService';

const emptyCounts: SnapshotRecordCounts = {
  patients: 0,
  notes: 0,
  schedules: 0,
  medications: 0,
  labResults: 0,
  labItems: 0,
  templates: 0,
  labCategories: 0,
  userSettings: 0,
};

describe('validateSnapshotRestore', () => {
  it('blocks a zero-patient snapshot over a non-empty server', () => {
    const result = validateSnapshotRestore(emptyCounts, {
      ...emptyCounts,
      patients: 3,
      notes: 10,
    });

    expect(result.blocked).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('환자'))).toBe(true);
    expect(result.summary).toBeTruthy();
    expect(result.impacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'patients',
          currentCount: 3,
          delta: -3,
          level: 'danger',
          snapshotCount: 0,
        }),
      ])
    );
  });

  it('allows a non-empty snapshot to be reviewed', () => {
    const result = validateSnapshotRestore(
      {
        ...emptyCounts,
        patients: 2,
        notes: 4,
        schedules: 1,
      },
      {
        ...emptyCounts,
        patients: 2,
        notes: 5,
      }
    );

    expect(result.blocked).toBe(false);
    expect(result.impacts.find((impact) => impact.key === 'notes')).toEqual(
      expect.objectContaining({
        currentCount: 5,
        delta: -1,
        level: 'warning',
        snapshotCount: 4,
      })
    );
  });

  it('warns when a snapshot is missing Lab results that exist on the server', () => {
    const result = validateSnapshotRestore(
      {
        ...emptyCounts,
        patients: 2,
        notes: 1,
      },
      {
        ...emptyCounts,
        patients: 2,
        labResults: 4,
      }
    );

    expect(result.blocked).toBe(false);
    expect(result.warnings.some((warning) => warning.includes('Lab'))).toBe(true);
    expect(result.impacts.find((impact) => impact.key === 'labResults')).toEqual(
      expect.objectContaining({
        currentCount: 4,
        delta: -4,
        level: 'warning',
        snapshotCount: 0,
      })
    );
  });

  it('warns when a snapshot has no memo, schedule, or medication data', () => {
    const result = validateSnapshotRestore(
      {
        ...emptyCounts,
        patients: 1,
        labResults: 1,
      },
      emptyCounts
    );

    expect(result.blocked).toBe(false);
    expect(result.warnings.some((warning) => warning.includes('메모'))).toBe(true);
  });

  it('summarizes a clean count comparison', () => {
    const result = validateSnapshotRestore(
      {
        ...emptyCounts,
        patients: 1,
        notes: 2,
        schedules: 1,
      },
      {
        ...emptyCounts,
        patients: 1,
        notes: 2,
        schedules: 1,
      }
    );

    expect(result.blocked).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(result.summary).toBeTruthy();
    expect(result.impacts.every((impact) => impact.level === 'neutral')).toBe(true);
  });
});

describe('formatBackupSnapshotError', () => {
  it('keeps intentional backup snapshot errors', () => {
    expect(
      formatBackupSnapshotError(new BackupSnapshotError('스냅샷 비밀번호를 입력해주세요.'))
    ).toBe('스냅샷 비밀번호를 입력해주세요.');
  });

  it('localizes password or damaged-data errors', () => {
    expect(
      formatBackupSnapshotError(
        new Error('The password is incorrect or the backup data is damaged.')
      )
    ).toBe('비밀번호가 올바르지 않거나 스냅샷 데이터가 손상되었습니다.');
  });

  it('localizes RLS and permission errors', () => {
    expect(formatBackupSnapshotError(new Error('new row violates row-level security policy'))).toBe(
      '현재 계정에 이 스냅샷 작업 권한이 없습니다.'
    );
  });

  it('uses a fallback when the error has no readable message', () => {
    expect(formatBackupSnapshotError(null, '작업 실패')).toBe('작업 실패');
  });
});
