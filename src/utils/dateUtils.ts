/**
 * Date utility functions
 */

/**
 * Format date to Korean format (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date to Korean format with time (YYYY-MM-DD HH:MM)
 */
export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Calculate days between two dates
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const startMs = start.getTime();
  const endMs = end.getTime();
  return Math.floor((endMs - startMs) / msPerDay);
}

/**
 * Calculate D-day (days from start to today)
 * Returns formatted string like "D+7" or "D+0"
 */
export function calculateDDay(startDate: Date): string {
  const today = new Date();
  const days = daysBetween(startDate, today);
  return `D+${days}`;
}

/**
 * Get age from birth date
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Calculate detailed age (years, months, days)
 * Returns formatted string like "44년 1개월 15일"
 */
export function calculateDetailedAge(birthDate: Date): string {
  const today = new Date();

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  // Adjust for negative days
  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }

  return `${years}년 ${months}개월 ${days}일`;
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Get start of day (00:00:00)
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day (23:59:59)
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Parse onset text to detect if it contains a date
 * Supports formats:
 * - YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
 * - MM-DD, MM/DD, MM.DD (assumes current year)
 * Returns null if no date pattern found
 */
export function parseOnsetDate(onsetText: string): Date | null {
  if (!onsetText || typeof onsetText !== 'string') {
    return null;
  }

  const text = onsetText.trim();

  // Pattern 1: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  const fullDatePattern = /(\d{4})[-/.]\s*(\d{1,2})[-/.]\s*(\d{1,2})/;
  const fullMatch = text.match(fullDatePattern);

  if (fullMatch) {
    const year = parseInt(fullMatch[1]!, 10);
    const month = parseInt(fullMatch[2]!, 10) - 1; // JS months are 0-indexed
    const day = parseInt(fullMatch[3]!, 10);
    const date = new Date(year, month, day);

    // Validate date
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Pattern 2: MM-DD, MM/DD, MM.DD (current year)
  const shortDatePattern = /^(\d{1,2})[-/.]\s*(\d{1,2})/;
  const shortMatch = text.match(shortDatePattern);

  if (shortMatch) {
    const currentYear = new Date().getFullYear();
    const month = parseInt(shortMatch[1]!, 10) - 1;
    const day = parseInt(shortMatch[2]!, 10);
    const date = new Date(currentYear, month, day);

    // Validate date
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

/**
 * Calculate duration from onset date to today
 * Returns formatted string like "1년 2개월 15일"
 * If onset is not a date, returns null
 */
export function calculateOnsetDuration(onsetText: string): string | null {
  const onsetDate = parseOnsetDate(onsetText);

  if (!onsetDate) {
    return null;
  }

  const today = new Date();

  let years = today.getFullYear() - onsetDate.getFullYear();
  let months = today.getMonth() - onsetDate.getMonth();
  let days = today.getDate() - onsetDate.getDate();

  // Adjust for negative days
  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }

  // Format output based on duration
  const parts: string[] = [];

  if (years > 0) parts.push(`${years}년`);
  if (months > 0) parts.push(`${months}개월`);
  if (days > 0 || parts.length === 0) parts.push(`${days}일`);

  return parts.join(' ');
}

/**
 * Convert YYYY-MM-DD string to local Date (not UTC)
 * Input: "2026-03-18" → Output: Date object at 2026-03-18 00:00:00 in local timezone
 */
export const parseLocalDate = (dateString: string): Date => {
  const [year = 0, month = 0, day = 0] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};

/**
 * Get today's date at 00:00:00 in local timezone
 */
export const getLocalToday = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
