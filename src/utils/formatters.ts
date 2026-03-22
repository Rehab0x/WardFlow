/**
 * Data formatting utility functions
 */

/**
 * Format patient name with privacy option
 * @param name Full name
 * @param useInitials If true, show only initials (e.g., "김철수" -> "김ㅊㅅ")
 */
export function formatPatientName(name: string, useInitials = false): string {
  if (!useInitials) return name;

  // Korean name initials
  if (name.length >= 2) {
    const surname = name[0];
    const givenName = name.slice(1);
    // Simple initial for Korean (just show first character of each syllable)
    const givenInitials = givenName.split('').map(() => '○').join('');
    return `${surname}${givenInitials}`;
  }

  return name;
}

/**
 * Format room-bed string (e.g., "301-1")
 */
export function formatRoomBed(room: string, bed?: string): string {
  if (bed) return `${room}-${bed}`;
  return room;
}

/**
 * Parse room-bed string to separate values
 */
export function parseRoomBed(roomBed: string): { room: string; bed: string } {
  const parts = roomBed.split('-');
  return {
    room: parts[0] ?? '',
    bed: parts[1] ?? '',
  };
}

/**
 * Format sex to Korean
 */
export function formatSex(sex: 'M' | 'F'): string {
  return sex === 'M' ? '남' : '여';
}

/**
 * Remove trailing zeros from dose (e.g., "1.0000" -> "1", "0.5000" -> "0.5")
 */
export function formatDose(dose: number | string): string {
  const num = typeof dose === 'string' ? parseFloat(dose) : dose;
  return num.toString();
}

/**
 * Extract base drug name from full drug name
 * Remove dosage, formulation details, and generic name in parentheses
 * e.g., "페로스핀정10mg(메틸페니데이트염산염)" -> "페로스핀정"
 * e.g., "바로판(10mg/1정)" -> "바로판"
 */
export function extractDrugBaseName(fullName: string): string {
  // Remove content in parentheses
  let baseName = fullName.replace(/\([^)]*\)/g, '');

  // Remove common dosage patterns: 10mg, 2g, 500mg, etc.
  baseName = baseName.replace(/\d+(\.\d+)?(mg|g|mcg|μg|mL|ml|L|l|정|캡슐|주사|시럽)/gi, '');

  // Trim whitespace
  baseName = baseName.trim();

  return baseName || fullName; // Fallback to original if result is empty
}

/**
 * Format lab value with unit
 */
export function formatLabValue(value: number | string, unit: string): string {
  if (typeof value === 'string') return `${value} ${unit}`.trim();
  return `${value} ${unit}`.trim();
}

/**
 * Format problem list array to numbered text
 * e.g., ["CAP", "DM"] -> "1. CAP\n2. DM"
 */
export function formatProblemList(problems: string[]): string {
  return problems.map((p, i) => `${i + 1}. ${p}`).join('\n');
}
