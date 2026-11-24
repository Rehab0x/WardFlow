/**
 * 항생제 투여 기간 계산 — "시작일 + 일수"가 기준이다.
 * 시작일을 1일째로 세므로 2026-11-15에 7일이면 11-21이 마지막 날이다.
 */

export const MAX_ANTIBIOTIC_DAYS = 60;

function calendarDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** 달력 날짜 차이 (end − start). 시각·서머타임과 무관하다. */
export function calendarDaysBetween(start: Date, end: Date): number {
  const a = calendarDay(start);
  const b = calendarDay(end);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function calculateAntibioticEndDate(startDate: Date, days: number): Date {
  const end = calendarDay(startDate);
  end.setDate(end.getDate() + Math.max(days, 1) - 1);
  return end;
}

/** 시작일~종료일의 투여 일수 (양끝 포함). 수정 폼에 일수를 되살릴 때 쓴다. */
export function antibioticCourseDays(startDate: Date, endDate: Date): number {
  return calendarDaysBetween(startDate, endDate) + 1;
}

/** 입력칸의 일수 문자열을 1~60 정수로 읽는다. 아니면 null. */
export function readAntibioticDays(text: string): number | null {
  const value = Number(text.trim());
  return Number.isInteger(value) && value >= 1 && value <= MAX_ANTIBIOTIC_DAYS ? value : null;
}

export type AntibioticEndNotice =
  | { kind: 'day-before'; label: string }
  | { kind: 'end-day'; label: string }
  | { kind: 'overdue'; label: string; daysOver: number };

/** 오늘 기준으로 종료 알림이 필요한지. 종료일이 없거나 아직 멀었으면 null. */
export function getAntibioticEndNotice(endDate: Date | undefined, today: Date): AntibioticEndNotice | null {
  if (!endDate) return null;
  const remaining = calendarDaysBetween(today, endDate);
  if (remaining === 1) return { kind: 'day-before', label: '항생제 종료 1일 전' };
  if (remaining === 0) return { kind: 'end-day', label: '항생제 종료일' };
  if (remaining < 0) {
    return { kind: 'overdue', label: `항생제 종료일 ${-remaining}일 지남`, daysOver: -remaining };
  }
  return null;
}
