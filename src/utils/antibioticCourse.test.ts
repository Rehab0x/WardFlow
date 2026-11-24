import { describe, expect, it } from 'vitest';
import {
  antibioticCourseDays,
  calculateAntibioticEndDate,
  getAntibioticEndNotice,
  readAntibioticDays,
} from './antibioticCourse';

const day = (month: number, date: number) => new Date(2026, month - 1, date);

describe('항생제 투여 기간', () => {
  it('11-15에 7일이면 11-21까지', () => {
    expect(calculateAntibioticEndDate(day(11, 15), 7)).toEqual(day(11, 21));
  });

  it('달을 넘겨도 맞다', () => {
    expect(calculateAntibioticEndDate(day(11, 28), 7)).toEqual(day(12, 4));
  });

  it('종료일에서 일수를 되살린다 (수정 폼용)', () => {
    expect(antibioticCourseDays(day(11, 15), day(11, 21))).toBe(7);
  });

  it('일수는 1~60 정수만 읽는다', () => {
    expect(readAntibioticDays('7')).toBe(7);
    expect(readAntibioticDays('0')).toBeNull();
    expect(readAntibioticDays('61')).toBeNull();
    expect(readAntibioticDays('')).toBeNull();
    expect(readAntibioticDays('3.5')).toBeNull();
  });
});

describe('getAntibioticEndNotice', () => {
  const end = day(11, 21);

  it('종료 하루 전(11-20)에는 1일 전 알림', () => {
    expect(getAntibioticEndNotice(end, day(11, 20))?.kind).toBe('day-before');
  });

  it('종료일(11-21)에는 종료일 알림', () => {
    expect(getAntibioticEndNotice(end, day(11, 21))?.kind).toBe('end-day');
  });

  it('그 전(11-19)에는 알림이 없다', () => {
    expect(getAntibioticEndNotice(end, day(11, 19))).toBeNull();
  });

  it('종료일이 지났는데 아직 켜져 있으면 지남으로 알린다', () => {
    const notice = getAntibioticEndNotice(end, day(11, 23));
    expect(notice).toMatchObject({ kind: 'overdue', daysOver: 2 });
  });

  it('종료일이 없으면 알리지 않는다', () => {
    expect(getAntibioticEndNotice(undefined, day(11, 21))).toBeNull();
  });

  it('시각이 달라도 같은 날로 본다', () => {
    expect(getAntibioticEndNotice(end, new Date(2026, 10, 21, 23, 59))?.kind).toBe('end-day');
  });
});
