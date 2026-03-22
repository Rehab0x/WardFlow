import { describe, it, expect } from 'vitest';
import { parseOCSMedication, formatParsedMedication, validateParsedMedication } from './medParser';

describe('medParser', () => {
  describe('parseOCSMedication', () => {
    it('잔여일수 포함 기본 포맷을 파싱한다', () => {
      const text = '(12) 암로스크정(6.42mg/1정)\t1.0000\t아침 식후30분';
      const result = parseOCSMedication(text);

      expect(result).toHaveLength(1);
      expect(result[0]!.drugName).toBe('암로스크정(6.42mg/1정)');
      expect(result[0]!.drugBaseName).toBe('암로스크정');
      expect(result[0]!.singleDose).toBe(1);
      expect(result[0]!.daysRemaining).toBe(12);
      expect(result[0]!.timing).toContain('식후');
    });

    it('후행 0을 제거한다 (1.0000 → 1, 0.5000 → 0.5)', () => {
      const text = '(5) 테스트약\t0.5000\t아침';
      const result = parseOCSMedication(text);

      expect(result[0]!.singleDose).toBe(0.5);
    });

    it('잔여일수 없는 형태도 파싱한다', () => {
      const text = '메트포르민정500mg\t2.0000\t아침,저녁 식후 30분';
      const result = parseOCSMedication(text);

      expect(result).toHaveLength(1);
      expect(result[0]!.drugName).toBe('메트포르민정500mg');
      expect(result[0]!.drugBaseName).toBe('메트포르민정');
      expect(result[0]!.singleDose).toBe(2);
      expect(result[0]!.daysRemaining).toBeUndefined();
    });

    it('여러 줄을 파싱한다', () => {
      const text = [
        '(12) 암로스크정(6.42mg/1정)\t1.0000\t아침 식후30분',
        '(7) 리피토정20mg\t1.0000\t저녁 식후 30분',
        '(14) 란소프라졸캡슐30mg\t1.0000\t아침 식전30분',
      ].join('\n');

      const result = parseOCSMedication(text);
      expect(result).toHaveLength(3);
      expect(result[0]!.drugBaseName).toBe('암로스크정');
      expect(result[1]!.drugBaseName).toBe('리피토정');
      expect(result[2]!.drugBaseName).toBe('란소프라졸캡슐');
    });

    it('빈 줄과 잘못된 줄은 무시한다', () => {
      const text = [
        '',
        '(12) 암로스크정(6.42mg/1정)\t1.0000\t아침 식후30분',
        '이것은 잘못된 형식입니다',
        '',
      ].join('\n');

      const result = parseOCSMedication(text);
      expect(result).toHaveLength(1);
    });

    it('빈 텍스트에 대해 빈 배열을 반환한다', () => {
      expect(parseOCSMedication('')).toHaveLength(0);
      expect(parseOCSMedication('   ')).toHaveLength(0);
    });
  });

  describe('약물명 기본명 추출', () => {
    it('괄호 안의 성분명을 제거한다', () => {
      const text = '(5) 페로스핀정10mg(메틸페니데이트염산염)\t1.0000\t아침';
      const result = parseOCSMedication(text);
      expect(result[0]!.drugBaseName).toBe('페로스핀정');
    });

    it('용량 정보를 제거한다', () => {
      const text = '(5) 메트포르민정500mg\t1.0000\t아침';
      const result = parseOCSMedication(text);
      expect(result[0]!.drugBaseName).toBe('메트포르민정');
    });

    it('괄호 + 용량 모두 제거한다', () => {
      const text = '(5) 암로스크정(6.42mg/1정)\t1.0000\t아침';
      const result = parseOCSMedication(text);
      expect(result[0]!.drugBaseName).toBe('암로스크정');
    });
  });

  describe('schedule/timing 분리', () => {
    it('식후 30분을 분리한다', () => {
      const text = '(5) 테스트약\t1.0000\t아침,저녁 식후 30분';
      const result = parseOCSMedication(text);
      expect(result[0]!.schedule).toBe('아침,저녁');
      expect(result[0]!.timing).toContain('식후');
      expect(result[0]!.timing).toContain('30분');
    });

    it('식전 30분을 분리한다', () => {
      const text = '(5) 테스트약\t1.0000\t아침 식전30분';
      const result = parseOCSMedication(text);
      expect(result[0]!.schedule).toBe('아침');
      expect(result[0]!.timing).toContain('식전');
    });

    it('timing 없으면 undefined', () => {
      const text = '(5) 테스트약\t1.0000\t아침,점심,저녁';
      const result = parseOCSMedication(text);
      expect(result[0]!.schedule).toBe('아침,점심,저녁');
      expect(result[0]!.timing).toBeUndefined();
    });
  });

  describe('formatParsedMedication', () => {
    it('약물 정보를 포맷한다', () => {
      const formatted = formatParsedMedication({
        drugName: '암로스크정(6.42mg/1정)',
        drugBaseName: '암로스크정',
        singleDose: 1,
        schedule: '아침',
        timing: '식후 30분',
        daysRemaining: 12,
      });
      expect(formatted).toContain('암로스크정(6.42mg/1정)');
      expect(formatted).toContain('1T');
      expect(formatted).toContain('12일 남음');
    });
  });

  describe('validateParsedMedication', () => {
    it('유효한 파싱 결과에 에러 없음', () => {
      const errors = validateParsedMedication({
        drugName: '테스트약',
        drugBaseName: '테스트약',
        singleDose: 1,
        schedule: '아침',
      });
      expect(errors).toHaveLength(0);
    });

    it('투약량 0 이하면 에러', () => {
      const errors = validateParsedMedication({
        drugName: '테스트약',
        drugBaseName: '테스트약',
        singleDose: 0,
        schedule: '아침',
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('약물명 빈값이면 에러', () => {
      const errors = validateParsedMedication({
        drugName: '',
        drugBaseName: '',
        singleDose: 1,
        schedule: '아침',
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
