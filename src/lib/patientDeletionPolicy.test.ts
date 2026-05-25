import { describe, expect, it } from 'vitest';
import {
  formatPatientArchiveConfirm,
  patientArchiveButtonLabel,
  patientArchiveFailureMessage,
  patientArchiveHelpText,
} from './patientDeletionPolicy';

describe('patientDeletionPolicy', () => {
  it('describes patient deletion as a soft archive action', () => {
    expect(patientArchiveButtonLabel).toContain('숨김');
    expect(patientArchiveHelpText).toContain('숨김 처리');
    expect(patientArchiveHelpText).toContain('영구 삭제하지 않고');
    expect(patientArchiveHelpText).toContain('archived');
    expect(patientArchiveFailureMessage).toBe('환자를 숨김 처리하지 못했습니다.');
  });

  it('formats the patient archive confirmation message', () => {
    expect(formatPatientArchiveConfirm('김테스트')).toContain('김테스트');
    expect(formatPatientArchiveConfirm('김테스트')).toContain('목록에서 숨길까요');
    expect(formatPatientArchiveConfirm('김테스트')).toContain('보관');
  });
});
