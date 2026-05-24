export function formatDetailedAge(birthDate: Date) {
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return `${years}년 ${months}개월 ${days}일`;
}

export function formatAgeYears(birthDate: Date) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

export function parseDateText(value?: string) {
  if (!value) return null;
  const normalized = value.trim().replace(/[/.]/g, '-');
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function formatOnsetElapsed(onsetDate: Date) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const onsetStart = new Date(onsetDate.getFullYear(), onsetDate.getMonth(), onsetDate.getDate());
  const diffDays = daysBetween(onsetStart, todayStart);

  if (diffDays < 0) return `onset D${diffDays}`;
  return `onset 후 ${formatElapsedCalendarDuration(onsetStart, addDays(todayStart, 1))}째`;
}

export function formatOnsetElapsedText(value?: string) {
  const onsetDate = parseDateText(value);
  return onsetDate ? formatOnsetElapsed(onsetDate) : null;
}

export function formatClockTime(date: Date) {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function isDateInRange(date: Date, minDate: Date, maxDate: Date) {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const min = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  const max = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());

  return current >= min && current <= max;
}

export function daysBetweenDates(startDate: Date, endDate: Date) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function formatElapsedCalendarDuration(startDate: Date, exclusiveEndDate: Date) {
  let years = exclusiveEndDate.getFullYear() - startDate.getFullYear();
  let months = exclusiveEndDate.getMonth() - startDate.getMonth();
  let days = exclusiveEndDate.getDate() - startDate.getDate();

  if (days < 0) {
    days += new Date(exclusiveEndDate.getFullYear(), exclusiveEndDate.getMonth(), 0).getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return [years > 0 ? `${years}년` : '', months > 0 ? `${months}개월` : '', `${days}일`]
    .filter(Boolean)
    .join(' ');
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function daysBetween(startDate: Date, endDate: Date) {
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}
