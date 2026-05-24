import { describe, expect, it } from 'vitest';
import {
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
  });
});
