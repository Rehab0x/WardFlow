import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  daysBetween,
  calculateAge,
  isToday,
  startOfDay,
  endOfDay,
  parseOnsetDate,
  parseLocalDate,
  getLocalToday,
} from './dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('날짜를 YYYY-MM-DD 형식으로 포맷한다', () => {
      const date = new Date(2026, 2, 15); // March 15, 2026
      expect(formatDate(date)).toBe('2026-03-15');
    });

    it('한 자리 월/일에 0을 붙인다', () => {
      const date = new Date(2026, 0, 5); // Jan 5
      expect(formatDate(date)).toBe('2026-01-05');
    });

    it('12월 31일을 올바르게 포맷한다', () => {
      const date = new Date(2026, 11, 31);
      expect(formatDate(date)).toBe('2026-12-31');
    });
  });

  describe('formatDateTime', () => {
    it('날짜+시간을 YYYY-MM-DD HH:MM 형식으로 포맷한다', () => {
      const date = new Date(2026, 2, 15, 14, 30);
      expect(formatDateTime(date)).toBe('2026-03-15 14:30');
    });

    it('자정을 00:00으로 포맷한다', () => {
      const date = new Date(2026, 0, 1, 0, 0);
      expect(formatDateTime(date)).toBe('2026-01-01 00:00');
    });
  });

  describe('daysBetween', () => {
    it('같은 날은 0일', () => {
      const date = new Date(2026, 2, 15);
      expect(daysBetween(date, date)).toBe(0);
    });

    it('1일 차이를 계산한다', () => {
      const start = new Date(2026, 2, 15);
      const end = new Date(2026, 2, 16);
      expect(daysBetween(start, end)).toBe(1);
    });

    it('7일 차이를 계산한다', () => {
      const start = new Date(2026, 2, 1);
      const end = new Date(2026, 2, 8);
      expect(daysBetween(start, end)).toBe(7);
    });

    it('월을 넘기는 경우', () => {
      const start = new Date(2026, 1, 28); // Feb 28
      const end = new Date(2026, 2, 1); // Mar 1
      expect(daysBetween(start, end)).toBe(1);
    });
  });

  describe('calculateAge', () => {
    it('나이를 올바르게 계산한다', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 30;
      const birthDate = new Date(birthYear, 0, 1); // Jan 1, 30 years ago
      expect(calculateAge(birthDate)).toBe(30);
    });

    it('생일이 아직 안 지난 경우 1살 적게', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 30;
      const birthDate = new Date(birthYear, 11, 31); // Dec 31
      // Dec 31이 오늘 이후면 29세, 오늘이면 30세
      const expected = today.getMonth() === 11 && today.getDate() >= 31 ? 30 : 29;
      expect(calculateAge(birthDate)).toBe(expected);
    });
  });

  describe('isToday', () => {
    it('오늘 날짜는 true', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('어제는 false', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('내일은 false', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('startOfDay / endOfDay', () => {
    it('startOfDay는 00:00:00.000', () => {
      const date = new Date(2026, 2, 15, 14, 30, 45);
      const start = startOfDay(date);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    });

    it('endOfDay는 23:59:59.999', () => {
      const date = new Date(2026, 2, 15, 14, 30, 45);
      const end = endOfDay(date);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });

    it('원본 날짜를 변경하지 않는다', () => {
      const date = new Date(2026, 2, 15, 14, 30);
      startOfDay(date);
      endOfDay(date);
      expect(date.getHours()).toBe(14);
    });
  });

  describe('parseOnsetDate', () => {
    it('YYYY-MM-DD 형식 파싱', () => {
      const result = parseOnsetDate('2026-03-15');
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2026);
      expect(result!.getMonth()).toBe(2); // March = 2
      expect(result!.getDate()).toBe(15);
    });

    it('YYYY/MM/DD 형식 파싱', () => {
      const result = parseOnsetDate('2026/03/15');
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2026);
    });

    it('YYYY.MM.DD 형식 파싱', () => {
      const result = parseOnsetDate('2026.03.15');
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2026);
    });

    it('MM-DD 형식은 올해로 파싱', () => {
      const result = parseOnsetDate('03-15');
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(new Date().getFullYear());
      expect(result!.getMonth()).toBe(2);
      expect(result!.getDate()).toBe(15);
    });

    it('날짜가 아닌 텍스트는 null 반환', () => {
      expect(parseOnsetDate('갑자기 발생')).toBeNull();
      expect(parseOnsetDate('약 2주 전')).toBeNull();
    });

    it('빈 문자열은 null 반환', () => {
      expect(parseOnsetDate('')).toBeNull();
      expect(parseOnsetDate('  ')).toBeNull();
    });

    it('null/undefined 입력 처리', () => {
      expect(parseOnsetDate(null as unknown as string)).toBeNull();
      expect(parseOnsetDate(undefined as unknown as string)).toBeNull();
    });
  });

  describe('parseLocalDate', () => {
    it('YYYY-MM-DD를 로컬 Date로 변환한다', () => {
      const result = parseLocalDate('2026-03-18');
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(2); // March
      expect(result.getDate()).toBe(18);
      expect(result.getHours()).toBe(0);
    });
  });

  describe('getLocalToday', () => {
    it('오늘 00:00:00을 반환한다', () => {
      const today = getLocalToday();
      const now = new Date();
      expect(today.getFullYear()).toBe(now.getFullYear());
      expect(today.getMonth()).toBe(now.getMonth());
      expect(today.getDate()).toBe(now.getDate());
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
    });
  });
});
