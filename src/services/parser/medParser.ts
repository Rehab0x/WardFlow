/**
 * OCS 처방 붙여넣기 파서
 *
 * 포맷: (잔여일수) 약물명[TAB]1회투약량[TAB]투약시간
 * 예시: (12) 암로스크정(6.42mg/1정)	1.0000	아침 식후30분
 */

export interface ParsedMedication {
  drugName: string;           // 전체 약물명 (용량 포함)
  drugBaseName: string;       // 기본 약물명 (검색용)
  singleDose: number;         // 1회 투약량
  schedule: string;           // 투약 시간 (예: "아침,저녁")
  timing?: string;            // 복용 타이밍 (예: "식후 30분", "식전 30분")
  daysRemaining?: number;     // 잔여일수 (옵션)
}

/**
 * OCS 처방 텍스트를 파싱합니다.
 *
 * @param text - OCS에서 복사한 처방 텍스트 (여러 줄 가능)
 * @returns 파싱된 약물 목록
 */
export function parseOCSMedication(text: string): ParsedMedication[] {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const results: ParsedMedication[] = [];

  for (const line of lines) {
    try {
      const parsed = parseSingleLine(line);
      if (parsed) {
        results.push(parsed);
      }
    } catch (error) {
      console.warn('Failed to parse line:', line, error);
      // 개별 라인 파싱 실패는 무시하고 계속 진행
    }
  }

  return results;
}

/**
 * 단일 라인을 파싱합니다.
 */
function parseSingleLine(line: string): ParsedMedication | null {
  // 포맷: (잔여일수) 약물명[TAB]1회투약량[TAB]투약시간
  // 정규식: /^\((\d+)\)\s+(.+?)\t([\d.]+)\t(.+)$/

  const regex = /^\((\d+)\)\s+(.+?)\t([\d.]+)\t(.+)$/;
  const match = line.match(regex);

  if (!match) {
    // 잔여일수가 없는 형태도 시도: 약물명[TAB]투약량[TAB]투약시간
    const simpleRegex = /^(.+?)\t([\d.]+)\t(.+)$/;
    const simpleMatch = line.match(simpleRegex);

    if (!simpleMatch) {
      return null;
    }

    const [, drugName = '', doseStr = '', scheduleRaw = ''] = simpleMatch;
    const { schedule, timing } = extractScheduleAndTiming(scheduleRaw.trim());

    return {
      drugName: drugName.trim(),
      drugBaseName: extractBaseName(drugName.trim()),
      singleDose: cleanDoseValue(doseStr),
      schedule,
      timing,
    };
  }

  const [, daysRemainingStr = '', drugName = '', doseStr = '', scheduleRaw = ''] = match;
  const { schedule, timing } = extractScheduleAndTiming(scheduleRaw.trim());

  return {
    drugName: drugName.trim(),
    drugBaseName: extractBaseName(drugName.trim()),
    singleDose: cleanDoseValue(doseStr),
    schedule,
    timing,
    daysRemaining: parseInt(daysRemainingStr, 10),
  };
}

/**
 * 투약시간에서 schedule과 timing을 분리합니다.
 *
 * 예시:
 * - "아침,저녁 식후 30분" → { schedule: "아침,저녁", timing: "식후 30분" }
 * - "아침 식전30분" → { schedule: "아침", timing: "식전 30분" }
 * - "아침,점심,저녁" → { schedule: "아침,점심,저녁", timing: undefined }
 */
function extractScheduleAndTiming(scheduleRaw: string): { schedule: string; timing?: string } {
  // 식전/식후 패턴: "식전", "식후", 뒤에 숫자+분이 올 수 있음
  const timingRegex = /(식전|식후)\s*(\d+분?)?/;
  const match = scheduleRaw.match(timingRegex);

  if (match) {
    const timing = match[0].trim();
    // "식전30분" → "식전 30분"으로 정규화
    const normalizedTiming = timing.replace(/(\D)(\d)/, '$1 $2').replace(/(\d)(분?)$/, '$1분');

    // timing을 제거한 나머지가 schedule
    const schedule = scheduleRaw.replace(timingRegex, '').trim().replace(/\s+/g, '');

    return {
      schedule: schedule || scheduleRaw, // schedule이 비어있으면 원본 반환
      timing: normalizedTiming,
    };
  }

  // 식전/식후 정보가 없으면 전체를 schedule로
  return {
    schedule: scheduleRaw,
    timing: undefined,
  };
}

/**
 * 약물명에서 기본명을 추출합니다.
 *
 * 예시:
 * - "페로스핀정10mg(메틸페니데이트염산염)" → "페로스핀정"
 * - "암로스크정(6.42mg/1정)" → "암로스크정"
 * - "메트포르민정500mg" → "메트포르민정"
 */
function extractBaseName(fullName: string): string {
  // 괄호 제거
  let baseName = fullName.replace(/\([^)]*\)/g, '').trim();

  // 용량 정보 제거 (숫자+단위)
  // 예: "500mg", "10mg", "1g" 등
  baseName = baseName.replace(/\d+(\.\d+)?(mg|g|mcg|μg|ml|mL|%)/gi, '').trim();

  // 남은 공백 정리
  baseName = baseName.replace(/\s+/g, ' ').trim();

  return baseName || fullName; // 실패 시 원본 반환
}

/**
 * 투약량 문자열을 숫자로 변환하고 후행 0을 제거합니다.
 *
 * 예시:
 * - "1.0000" → 1
 * - "0.5000" → 0.5
 * - "2.5000" → 2.5
 */
function cleanDoseValue(doseStr: string): number {
  const value = parseFloat(doseStr);

  if (isNaN(value)) {
    throw new Error(`Invalid dose value: ${doseStr}`);
  }

  // 후행 0 제거를 위해 parseFloat가 자동으로 처리
  return value;
}

/**
 * 파싱 결과를 사람이 읽기 쉬운 형태로 포맷합니다.
 *
 * @param parsed - 파싱된 약물 정보
 * @returns 포맷된 문자열
 */
export function formatParsedMedication(parsed: ParsedMedication): string {
  const parts = [
    parsed.drugName,
    `${parsed.singleDose}T`,
    parsed.schedule,
  ];

  if (parsed.daysRemaining !== undefined) {
    parts.push(`(${parsed.daysRemaining}일 남음)`);
  }

  return parts.join(' | ');
}

/**
 * 파싱 결과 검증
 */
export function validateParsedMedication(parsed: ParsedMedication): string[] {
  const errors: string[] = [];

  if (!parsed.drugName || parsed.drugName.length === 0) {
    errors.push('약물명이 비어있습니다.');
  }

  if (!parsed.drugBaseName || parsed.drugBaseName.length === 0) {
    errors.push('기본 약물명 추출에 실패했습니다.');
  }

  if (parsed.singleDose <= 0) {
    errors.push('투약량은 0보다 커야 합니다.');
  }

  if (!parsed.schedule || parsed.schedule.length === 0) {
    errors.push('투약시간이 비어있습니다.');
  }

  if (parsed.daysRemaining !== undefined && parsed.daysRemaining < 0) {
    errors.push('잔여일수는 음수일 수 없습니다.');
  }

  return errors;
}
