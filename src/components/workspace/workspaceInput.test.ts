import { describe, expect, it } from 'vitest';
import {
  areDraftsEqual,
  isClinicalDateInput,
  normalizeChartingText,
  normalizeClockTime,
} from './workspaceInput';
import type { ChartingDraft } from './types';

const emptyDraft: ChartingDraft = {
  chiefComplaint: '',
  onset: '',
  presentIllness: '',
  pastHistory: '',
  reviewOfSystem: '',
  physicalExam: '',
  problemListText: '',
  plan: '',
  guardianExplanation: '',
  etc: '',
};

describe('normalizeClockTime', () => {
  it('normalizes compact and colon-separated input', () => {
    expect(normalizeClockTime('1400')).toBe('14:00');
    expect(normalizeClockTime('14:00')).toBe('14:00');
    expect(normalizeClockTime('9')).toBe('09:00');
    expect(normalizeClockTime(' 930 ')).toBe('09:30');
  });

  it('rejects out-of-range and malformed input', () => {
    expect(normalizeClockTime('2500')).toBeUndefined();
    expect(normalizeClockTime('1density')).toBeUndefined();
    expect(normalizeClockTime('12:75')).toBeUndefined();
    expect(normalizeClockTime('')).toBeUndefined();
    expect(normalizeClockTime(undefined)).toBeUndefined();
  });
});

describe('isClinicalDateInput', () => {
  it('accepts dates between 1900-01-01 and today', () => {
    expect(isClinicalDateInput('2000-05-01')).toBe(true);
  });

  it('rejects future dates, pre-1900 dates and malformed values', () => {
    const nextYear = new Date().getFullYear() + 1;
    expect(isClinicalDateInput(`${nextYear}-01-01`)).toBe(false);
    expect(isClinicalDateInput('1899-12-31')).toBe(false);
    expect(isClinicalDateInput('not-a-date')).toBe(false);
    expect(isClinicalDateInput('')).toBe(false);
  });
});

describe('normalizeChartingText', () => {
  it('normalizes line endings and trims trailing whitespace', () => {
    expect(normalizeChartingText('a\r\nb\r\n  ')).toBe('a\nb');
    expect(normalizeChartingText('a\rb')).toBe('a\nb');
  });
});

describe('areDraftsEqual', () => {
  it('ignores line-ending and trailing-whitespace differences', () => {
    const left = { ...emptyDraft, plan: 'keep NPO\r\n' };
    const right = { ...emptyDraft, plan: 'keep NPO' };
    expect(areDraftsEqual(left, right)).toBe(true);
  });

  it('detects real content changes', () => {
    expect(areDraftsEqual(emptyDraft, { ...emptyDraft, plan: 'keep NPO' })).toBe(false);
  });
});
