import { describe, expect, it } from 'vitest';
import {
  formatPatientArchiveConfirm,
  patientArchiveButtonLabel,
  patientArchiveFailureMessage,
  patientArchiveHelpText,
} from './patientDeletionPolicy';

describe('patientDeletionPolicy', () => {
  it('describes patient deletion as a permanent delete action', () => {
    expect(patientArchiveButtonLabel).toBe('환자 삭제');
    expect(patientArchiveHelpText).toContain('임상 기록을 함께 삭제');
    expect(patientArchiveFailureMessage).toBe('환자를 삭제하지 못했습니다.');
  });

  it('formats the patient archive confirmation message', () => {
    expect(formatPatientArchiveConfirm('김테스트')).toContain('김테스트');
    expect(formatPatientArchiveConfirm('김테스트')).toContain('삭제할까요');
    expect(formatPatientArchiveConfirm('김테스트')).toContain('함께 삭제');
  });
});
