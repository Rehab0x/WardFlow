import { describe, expect, it } from 'vitest';
import {
  maskErrorMessage,
  maskFileName,
  maskId,
  maskName,
  maskRegistrationNumber,
} from './logMasking';

describe('log masking', () => {
  it('keeps only the first character of a patient name', () => {
    expect(maskName('김환자')).toBe('김**');
    expect(maskName('이')).toBe('이*');
    expect(maskName('')).toBe('(없음)');
    expect(maskName(undefined)).toBe('(없음)');
  });

  it('keeps only the last three digits of a registration number', () => {
    expect(maskRegistrationNumber('0000004532')).toBe('*******532');
    expect(maskRegistrationNumber('12')).toBe('**');
    expect(maskRegistrationNumber(null)).toBe('(없음)');
  });

  it('truncates identifiers', () => {
    expect(maskId('3f1a2b4c-dead-beef-0000-111122223333')).toBe('3f1a2b4c…');
    expect(maskId('short')).toBe('short');
  });

  it('drops the file name but keeps the extension', () => {
    const masked = maskFileName('김환자_0000004532_2026-09-19.xls');
    expect(masked).not.toContain('김환자');
    expect(masked).not.toContain('4532');
    expect(masked).toMatch(/\.xls$/);
  });

  it('masks long digit runs inside error messages', () => {
    const masked = maskErrorMessage(new Error('Patient lookup failed for 0000004532'));
    expect(masked).not.toContain('0000004532');
    expect(masked).toContain('Patient lookup failed for');
  });

  it('accepts non-Error values', () => {
    expect(maskErrorMessage('boom 123456')).toBe('boom ******');
    expect(maskErrorMessage(undefined)).toBe('');
  });
});
