export function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

export function fromNullableDateOnly(value: string | null): Date | undefined {
  return value ? fromDateOnly(value) : undefined;
}

export function toNullableDateOnly(value: Date | undefined): string | null {
  return value ? toDateOnly(value) : null;
}

