import { describe, it, expect } from 'vitest';
import { formatChartingForCopy, formatSingleField, getChartingPreview } from './chartingFormatter';
import type { ChartingFormData } from '@/types/charting';
import { DEFAULT_COPY_FORMAT } from '@/types/charting';

const makeFormData = (overrides: Partial<ChartingFormData> = {}): ChartingFormData => ({
  chiefComplaint: '',
  onset: '',
  presentIllness: '',
  pastHistory: '',
  reviewOfSystem: '',
  physicalExam: '',
  problemList: [],
  plan: '',
  guardianExplanation: '',
  etc: '',
  ...overrides,
});

describe('chartingFormatter', () => {
  describe('formatChartingForCopy', () => {
    it('C/C와 Onset은 같은 줄(필드명 포함)', () => {
      const data = makeFormData({
        chiefComplaint: 'Fever',
        onset: '2026-03-15',
      });
      const result = formatChartingForCopy(data);
      expect(result).toContain('C/C) Fever');
      expect(result).toContain('Onset) 2026-03-15');
    });

    it('빈 섹션은 제외된다 (excludeEmptySections=true)', () => {
      const data = makeFormData({
        chiefComplaint: 'Fever',
        presentIllness: '',
      });
      const result = formatChartingForCopy(data);
      expect(result).toContain('C/C) Fever');
      expect(result).not.toContain('PI)');
    });

    it('Problem List를 #. 형식으로 포맷한다 (numbered_simple)', () => {
      const data = makeFormData({
        problemList: ['Pneumonia', 'HTN', 'DM'],
      });
      const result = formatChartingForCopy(data);
      expect(result).toContain('#. Pneumonia');
      expect(result).toContain('#. HTN');
      expect(result).toContain('#. DM');
    });

    it('Problem List를 #1. 형식으로 포맷한다 (numbered)', () => {
      const data = makeFormData({
        problemList: ['Pneumonia', 'HTN'],
      });
      const format = { ...DEFAULT_COPY_FORMAT, problemListStyle: 'numbered' as const };
      const result = formatChartingForCopy(data, format);
      expect(result).toContain('#1. Pneumonia');
      expect(result).toContain('#2. HTN');
    });

    it('Problem List를 bullet 형식으로 포맷한다', () => {
      const data = makeFormData({
        problemList: ['Pneumonia'],
      });
      const format = { ...DEFAULT_COPY_FORMAT, problemListStyle: 'bulleted' as const };
      const result = formatChartingForCopy(data, format);
      expect(result).toContain('• Pneumonia');
    });

    it('problemListText가 있으면 그것을 사용한다', () => {
      const data = makeFormData({
        problemList: ['ignored'],
        problemListText: 'Custom text mode problem list',
      });
      const result = formatChartingForCopy(data);
      expect(result).toContain('Custom text mode problem list');
      expect(result).not.toContain('ignored');
    });

    it('보호자 설명 필드를 포함한다', () => {
      const data = makeFormData({
        guardianExplanation: '환자 상태 설명',
      });
      const result = formatChartingForCopy(data);
      expect(result).toContain('보호자 설명');
      expect(result).toContain('환자 상태 설명');
    });

    it('모든 필드가 비면 빈 문자열', () => {
      const data = makeFormData();
      const result = formatChartingForCopy(data);
      expect(result).toBe('');
    });
  });

  describe('formatSingleField', () => {
    it('일반 필드를 포맷한다 (줄바꿈)', () => {
      const result = formatSingleField('PI', '3일 전부터 발열');
      expect(result).toBe('PI)\n3일 전부터 발열');
    });

    it('같은 줄 모드', () => {
      const result = formatSingleField('C/C', 'Fever', true);
      expect(result).toBe('C/C) Fever');
    });

    it('Problem List 배열을 포맷한다', () => {
      const result = formatSingleField('Problem List', ['Pneumonia', 'HTN']);
      expect(result).toContain('Problem List)');
      expect(result).toContain('#. Pneumonia');
      expect(result).toContain('#. HTN');
    });
  });

  describe('getChartingPreview', () => {
    it('짧은 텍스트는 그대로 반환', () => {
      const data = makeFormData({ chiefComplaint: 'Fever' });
      const result = getChartingPreview(data);
      expect(result).not.toContain('...');
    });

    it('긴 텍스트는 잘리고 ... 추가', () => {
      const data = makeFormData({
        chiefComplaint: 'A'.repeat(100),
        presentIllness: 'B'.repeat(100),
        plan: 'C'.repeat(100),
      });
      const result = getChartingPreview(data, DEFAULT_COPY_FORMAT, 50);
      expect(result.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(result).toContain('...');
    });
  });
});
