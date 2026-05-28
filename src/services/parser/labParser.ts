import { getLabInfo, getLabInfoForXls, findLabByName, extractCleanName } from './labCodeMap.js';
import { getHLFlag, getLabReference, getLabReferenceByName } from '../../utils/labReference.js';

export interface ParsedLabItem {
  code: string;
  name: string;
  category: string;
  unit: string;
  value: string;
  flag: 'H' | 'L' | '';
  referenceMin?: number;
  referenceMax?: number;
  referenceText?: string;
}

export interface ParsedLabResult {
  items: ParsedLabItem[];
  unmatched: string[];
  parseRate: number;
}

// ─────────────────────────────────────────────────
// Reference range parser
// ─────────────────────────────────────────────────

function parseReferenceRange(raw: string): {
  min?: number;
  max?: number;
  text?: string;
} {
  if (!raw) return {};

  const s = raw.replace(/d"/g, '≤').replace(/e"/g, '≥').trim();

  // Range: "6.60 ~ 8.30"
  const rangeMatch = s.match(/^([\d.]+)\s*~\s*([\d.]+)/);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
  }

  // Upper limit: "≤40" or "<40"
  const upperMatch = s.match(/^[≤<]([\d.]+)/);
  if (upperMatch && upperMatch[1]) {
    return { max: parseFloat(upperMatch[1]) };
  }

  // Lower limit: "≥40" or ">40"
  const lowerMatch = s.match(/^[≥>]([\d.]+)/);
  if (lowerMatch && lowerMatch[1]) {
    return { min: parseFloat(lowerMatch[1]) };
  }

  // Descriptive: extract first numeric range
  const descMatch = s.match(/([\d.]+)\s*[~-]\s*([\d.]+)/);
  if (descMatch && descMatch[1] && descMatch[2]) {
    return { min: parseFloat(descMatch[1]), max: parseFloat(descMatch[2]), text: s };
  }

  return { text: s };
}

// ─────────────────────────────────────────────────
// Text paste parser
// ─────────────────────────────────────────────────

export function parseLabText(text: string): ParsedLabResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: ParsedLabItem[] = [];
  const unmatched: string[] = [];
  let sectionCategory: string | undefined;

  for (const line of lines) {
    const nextSection = inferSectionCategory(line);
    if (nextSection !== undefined) {
      sectionCategory = nextSection || undefined;
      continue;
    }
    if (isIgnoredContinuationLine(line)) continue;

    const parsed = parseLine(line);
    if (parsed) {
      items.push(applySectionContext(parsed, sectionCategory));
    } else {
      unmatched.push(line);
    }
  }

  const total = items.length + unmatched.length;
  return {
    items,
    unmatched,
    parseRate: total > 0 ? items.length / total : 0,
  };
}

function parseLine(line: string): ParsedLabItem | null {
  if (line.includes('\t')) {
    return parseTabLine(line);
  }
  return parseSpaceLine(line);
}

function parseTabLine(line: string): ParsedLabItem | null {
  const cols = normalizeMultilineLabValue(line)
    .split('\t')
    .map((c) => c.trim());
  if (cols.length < 2) return null;

  const col0 = cols[0] ?? '';
  const col1 = cols[1] ?? '';
  const col2 = cols[2] ?? '';
  const col3 = cols[3] ?? '';
  const col4 = cols[4] ?? '';

  // Code pattern: B/A numeric codes (B2500, A0118) or D-codes.
  // Keep this strict so plain names like "Albumin" are not mistaken for codes.
  const codePattern = /^(?:[ABab]\d{4,6}[A-Za-z]?|[Dd](?:\d{4,8}[A-Za-z]*|\d{3,4}))$/;

  let code = '';
  let rawName = '';
  let value = '';
  let flagRaw = '';
  let refRaw = '';

  if (codePattern.test(col0)) {
    // 검사코드 + 검사명 + 값 + [H/L] + [참조치]
    code = col0.toUpperCase();
    rawName = col1;
    value = col2;
    flagRaw = col3;
    refRaw = col4;
  } else {
    // 검사명 + 값 + [H/L] + [참조치]  (간소화된 형식)
    rawName = col0;
    value = col1;
    flagRaw = col2;
    refRaw = col3;
  }

  if (!rawName || isSkippableLabLine(rawName, value)) return null;
  value = resolveLabValue(rawName, value);
  if (!value) return null;

  const flagUp = flagRaw.toUpperCase().trim();
  const normalFlag: 'H' | 'L' | '' =
    flagUp === 'H' || flagUp === 'HIGH' ? 'H' : flagUp === 'L' || flagUp === 'LOW' ? 'L' : '';

  const cleanName = extractCleanName(code, rawName);
  const info = code ? getLabInfo(code) : findLabByName(cleanName);
  const ref = parseReferenceRange(refRaw);

  return buildParsedItem({
    code,
    name: cleanName,
    category: info?.category ?? inferCategoryFromName(cleanName),
    unit: info?.unit ?? '',
    value,
    flag: normalFlag,
    referenceMin: ref.min,
    referenceMax: ref.max,
    referenceText: (ref.text ?? refRaw) || undefined,
  });
}

function inferCategoryFromName(name: string): string {
  const lower = name.toLowerCase();
  if (['wbc', 'rbc', 'hb', 'hct', 'mcv', 'mch', 'mchc', 'plt', 'platelet'].includes(lower))
    return 'CBC';
  if (
    ['neutrophil', 'n.segment', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil'].includes(lower)
  )
    return 'WBC Diff';
  if (['na', 'k', 'cl'].includes(lower)) return 'BC';
  if (lower === 'crp' || lower === 'esr' || lower === 'pct') return 'BC';
  if (
    [
      'color',
      'leukocyte',
      'occult blood',
      'bilirubin',
      'urobilinogen',
      'ketone',
      'protein',
      'nitrite',
      'ph',
      's.g',
    ].includes(lower)
  )
    return 'UA';
  if (
    lower.includes('micro') ||
    lower.includes('epithelial') ||
    lower.includes('bacteria') ||
    lower.includes('cast') ||
    lower.includes('crystal')
  )
    return 'Urine Sediment';
  return 'BC';
}

function parseSpaceLine(line: string): ParsedLabItem | null {
  const normalizedLine = normalizeMultilineLabValue(line);
  if (isStandaloneLabSectionLine(normalizedLine)) return null;

  const codeMatch = normalizedLine.match(/^([ABab]\d{4,6}[ABab]?)\s+(.+)/);
  if (codeMatch && codeMatch[1] && codeMatch[2]) {
    // 코드가 있는 경우: 기존 형식
    const code = codeMatch[1].toUpperCase();
    const rest = codeMatch[2].trim();

    const parts = rest
      .split(/\s{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) return null;

    const name = parts[0] ?? '';
    const value = parts[1] ?? '';
    const thirdPart = parts[2] ?? '';
    const flag = thirdPart === 'H' || thirdPart === 'L' ? thirdPart : '';
    const refRaw = flag ? (parts[3] ?? '') : (parts[2] ?? '');

    const info = getLabInfo(code);
    const ref = parseReferenceRange(refRaw);

    return buildParsedItem({
      code,
      name: info?.name ?? name,
      category: info?.category ?? 'Other',
      unit: info?.unit ?? '',
      value,
      flag: flag as 'H' | 'L' | '',
      referenceMin: ref.min,
      referenceMax: ref.max,
      referenceText: (ref.text ?? refRaw) || undefined,
    });
  }

  // 코드 없이 "검사명 값" 또는 "검사명 값 H/L" 형식
  // 여러 공백으로 분리
  const parts = normalizedLine
    .split(/\s{2,}|\t+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    // 단일 공백으로 분리 시도 — 마지막 토큰이 값일 가능성
    const tokens = normalizedLine.trim().split(/\s+/);
    if (tokens.length < 2) return null;
    // 뒤에서부터 값/flag/ref 파싱
    const lastToken = tokens[tokens.length - 1] ?? '';
    const secondLast = tokens[tokens.length - 2] ?? '';
    // "검사명 ... 값" 패턴 — 값이 숫자나 +기호이면 마지막 토큰을 값으로
    if (/^[\d.+\-]/.test(lastToken)) {
      const value = lastToken;
      const name = tokens.slice(0, -1).join(' ');
      return buildItemFromNameValue(name, value, '', '');
    }
    // "검사명 값 H/L" 패턴
    if ((lastToken === 'H' || lastToken === 'L') && /^[\d.+\-]/.test(secondLast)) {
      const value = secondLast;
      const flag = lastToken;
      const name = tokens.slice(0, -2).join(' ');
      return buildItemFromNameValue(name, value, flag, '');
    }
    return null;
  }

  // 2+ parts
  const name = parts[0] ?? '';
  const value = parts[1] ?? '';
  const thirdPart = parts[2] ?? '';
  const flag = thirdPart === 'H' || thirdPart === 'L' ? thirdPart : '';
  const refRaw = flag ? (parts[3] ?? '') : (parts[2] ?? '');

  return buildItemFromNameValue(name, value, flag, refRaw);
}

function buildItemFromNameValue(
  name: string,
  value: string,
  flag: string,
  refRaw: string
): ParsedLabItem | null {
  if (!name || isSkippableLabLine(name, value)) return null;
  const cleanName = extractCleanName('', name);
  const info = findLabByName(cleanName);
  const resolvedValue = resolveLabValue(cleanName, value);
  if (!resolvedValue) return null;
  const ref = parseReferenceRange(refRaw);
  return buildParsedItem({
    code: '',
    name: cleanName,
    category: info?.category ?? inferCategoryFromName(cleanName),
    unit: info?.unit ?? '',
    value: resolvedValue,
    flag: (flag === 'H' || flag === 'L' ? flag : '') as 'H' | 'L' | '',
    referenceMin: ref.min,
    referenceMax: ref.max,
    referenceText: (ref.text ?? refRaw) || undefined,
  });
}

function buildParsedItem(item: ParsedLabItem): ParsedLabItem {
  const reference =
    (item.code ? getLabReference(item.code) : undefined) ?? getLabReferenceByName(item.name);
  const referenceMin = item.referenceMin ?? reference?.referenceMin;
  const referenceMax = item.referenceMax ?? reference?.referenceMax;
  const numericValue = parseNumericLabValue(item.value);
  const computedFlag =
    item.flag ||
    (reference && numericValue !== undefined ? (getHLFlag(numericValue, reference) ?? '') : '');

  return {
    ...item,
    unit: item.unit || reference?.unit || '',
    flag: computedFlag,
    referenceMin,
    referenceMax,
  };
}

function applySectionContext(
  item: ParsedLabItem,
  sectionCategory: string | undefined
): ParsedLabItem {
  if (!sectionCategory) return item;

  if (sectionCategory === 'UA') {
    if (item.name === 'Glucose') {
      return {
        ...item,
        name: 'Glucose (UA)',
        category: 'UA',
        unit: '',
        flag: '',
        referenceMin: undefined,
        referenceMax: undefined,
        referenceText: undefined,
      };
    }
    if (item.name === 'pH') {
      return buildParsedItem({
        ...item,
        name: 'pH (UA)',
        category: 'UA',
        unit: '',
        flag: '',
        referenceMin: undefined,
        referenceMax: undefined,
        referenceText: undefined,
      });
    }
    if (
      [
        'Color',
        'Leukocyte',
        'Occult Blood',
        'Bilirubin',
        'Urobilinogen',
        'Ketone',
        'Protein',
        'Nitrite',
        'Glucose (UA)',
        'pH (UA)',
        'S.G',
      ].includes(item.name)
    ) {
      return { ...item, category: 'UA' };
    }
  }

  if (sectionCategory === 'Urine Sediment') {
    return { ...item, category: 'Urine Sediment' };
  }

  if (sectionCategory === 'WBC Diff' && item.category === 'BC') {
    return { ...item, category: 'WBC Diff' };
  }

  if (sectionCategory === 'Serology') {
    return { ...item, category: 'Serology' };
  }

  return item;
}

function resolveLabValue(name: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/hba1c/i.test(name) || /hba1c/i.test(trimmed)) {
    const ngsp = trimmed.match(/NGSP\s*:?\s*([\d.]+)/i);
    if (ngsp?.[1]) return ngsp[1];
  }

  return trimmed;
}

function parseNumericLabValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const normalizedRange = trimmed.match(/^([<>≤≥]?)\s*([\d.]+)/);
  if (!normalizedRange?.[2]) return undefined;
  const numeric = Number(normalizedRange[2]);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeMultilineLabValue(line: string) {
  return line.replace(/\r?\n/g, ' ');
}

function isStandaloneLabSectionLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return inferSectionCategory(trimmed) !== undefined;
}

function isSkippableLabLine(name: string, value: string) {
  const cleanName = name.trim();
  const cleanValue = value.trim();
  if (!cleanName) return true;
  if (/^\d{8};/.test(cleanName)) return true;
  if (/;\s*;\s*$/.test(cleanName) || /;\s*;\s*$/.test(cleanValue)) return true;
  if (!cleanValue) return true;
  if (/백혈구백분율|요일반검사|요침사검사/.test(cleanName)) return true;
  return false;
}

function inferSectionCategory(line: string): string | undefined {
  const trimmed = line.trim();
  if (!trimmed) return undefined;
  const tabCols = trimmed.split('\t').map((col) => col.trim());
  if (tabCols.length > 1 && tabCols.slice(1).some(Boolean)) return undefined;
  if (/^\d{8};/.test(trimmed)) return '';
  if (/백혈구백분율/.test(trimmed)) return 'WBC Diff';
  if (/UA1|요검사|요일반검사/.test(trimmed)) return 'UA';
  if (/요침사검사|Urine Micro|Urine Sediment/i.test(trimmed)) return 'Urine Sediment';
  if (/HBSAG|B형간염/i.test(trimmed)) return 'Serology';
  if (/HBA1C|HbA1C/i.test(trimmed) && /;\s*;\s*$/.test(trimmed)) return 'BC';
  if (/CRP/i.test(trimmed) && /;\s*;\s*$/.test(trimmed)) return 'BC';
  if (/^[A-Za-z0-9()/-]+\s+-\s+.+;\s*;\s*$/.test(trimmed)) return '';
  return undefined;
}

function isIgnoredContinuationLine(line: string) {
  return /^HbA1c-(IFCC|eAG)\s*:/i.test(line.trim());
}

// ─────────────────────────────────────────────────
// XLS file parser
// ─────────────────────────────────────────────────
//
// 실제 병원 XLS 컬럼 구조 (헤더 행 기준):
//  [0] 기관구분   [1] 검체번호   [2] 수신자명
//  [3] 나이/성별  [4] 성별/나이  [5] 차트번호
//  [6] 접수일자   [7] 접수번호   [8] 병원검사코드
//  [9] 이원코드   [10] 검사명    [11] 문자결과
//  [12] 문장결과  [13] H/L      [14] Remark
//  [15] 참고치    [16] 주민등록번호
// ─────────────────────────────────────────────────

export interface XlsPatientGroup {
  patientName?: string;
  registrationNumber?: string;
  orderDate?: string; // YYYY-MM-DD
  items: ParsedLabItem[];
}

/** Parse YYYYMMDD → "YYYY-MM-DD" */
function parseXlsDate(raw: string): string | undefined {
  const m = String(raw)
    .replace(/\D/g, '')
    .match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return undefined;
}

/** Normalize test name: remove Korean unit/description suffixes */
function normalizeName(code: string, rawName: string): string {
  const info = getLabInfo(code);
  if (info) return info.name;

  // Strip common Korean suffixes like "일반혈액검사(CBC)-백혈구수" → use mapped name if code matches
  // Try to extract the last segment after "-"
  const afterDash = rawName.split('-').pop()?.trim() ?? rawName;
  const found = findLabByName(afterDash);
  return found?.name ?? rawName;
}

/**
 * Parse hospital XLS/BIFF ArrayBuffer.
 * Groups rows by (chart number + order date) and returns one group per patient per date.
 */
export async function parseLabXls(buffer: ArrayBuffer): Promise<XlsPatientGroup[]> {
  const XLSX = await import('xlsx');

  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: 'array',
    codepage: 949,
    cellDates: false,
    raw: true,
  });

  const allGroups: XlsPatientGroup[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName] ?? {};
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
    }) as string[][];

    const groups = extractGroupsFromRows(rows);
    allGroups.push(...groups);
  }

  return allGroups;
}

function extractGroupsFromRows(rows: string[][]): XlsPatientGroup[] {
  // Key: "chartNumber|YYYY-MM-DD"
  const groupMap = new Map<string, XlsPatientGroup>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 12) continue;

    // Skip header row
    const firstCell = String(row[0] ?? '').trim();
    if (firstCell === '기관구분' || firstCell === '') continue;

    const chartNum = String(row[5] ?? '').trim();
    const rawDate = String(row[6] ?? '').trim();
    const labCode = String(row[8] ?? '').trim();
    const labName = String(row[10] ?? '').trim();
    const numResult = String(row[11] ?? '').trim();
    const textResult = String(row[12] ?? '').trim();
    const hlFlag = String(row[13] ?? '').trim();
    const refRaw = String(row[15] ?? '').trim();
    const patientName = String(row[2] ?? '').trim();

    if (!chartNum || !labCode) continue;

    const orderDate = parseXlsDate(rawDate);
    const key = `${chartNum}|${orderDate ?? rawDate}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        patientName,
        registrationNumber: chartNum,
        orderDate,
        items: [],
      });
    }

    const group = groupMap.get(key)!;

    if (!numResult && !textResult) continue;

    const code = labCode.toUpperCase();
    let info = getLabInfoForXls(code, labName);
    if (
      code === 'B00301' &&
      labName.toLowerCase() === 'color' &&
      refRaw.toLowerCase() === 'negative' &&
      /[+\-]/.test(numResult || textResult)
    ) {
      info = { name: 'Leukocyte', category: 'UA', unit: '' };
    }
    const normalFlag: 'H' | 'L' | '' =
      hlFlag.toUpperCase() === 'H' ? 'H' : hlFlag.toUpperCase() === 'L' ? 'L' : '';
    const ref = parseReferenceRange(refRaw);

    // 카테고리 판별
    const categoryFromMap = info?.category ?? inferCategory(labCode, labName);

    // Culture 판별:
    // 1) labCodeMap/inferCategory에서 'Culture'로 판별됨
    // 2) numResult 없고 textResult만 있되:
    //    a) 이름에 culture/배양/cre- 포함, 또는
    //    b) textResult 자체에 growth/culture/배양/sensitivity/resistant 등 포함
    const isCulture =
      categoryFromMap === 'Culture' ||
      (!numResult &&
        !!textResult &&
        (/culture|배양|^cre-|^cre /i.test(labName) ||
          /growth|culture|배양|sensitivity|resistant|susceptib|감수성/i.test(textResult)));

    // textResult만 있고 Culture가 아닌 경우 (예: HbA1c) → 첫 번째 숫자 추출
    let resolvedValue: string;
    let resolvedCategory: string;
    if (isCulture) {
      resolvedCategory = 'Culture';
      resolvedValue = (textResult || numResult).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    } else if (!numResult && textResult) {
      // HbA1c 특별 처리: NGSP 라인의 값만 추출
      const ngspMatch = textResult.match(/NGSP\s*:?\s*([\d.]+)/i);
      if (ngspMatch) {
        resolvedValue = ngspMatch[1]!;
      } else {
        // 일반 textResult: 첫 번째 숫자값 추출
        const firstNumMatch = textResult.match(/:?\s*([\d.]+)/);
        resolvedValue = firstNumMatch ? firstNumMatch[1]! : textResult.trim();
      }
      resolvedCategory = categoryFromMap;
    } else {
      resolvedValue = numResult;
      resolvedCategory = categoryFromMap;
    }

    group.items.push(
      buildParsedItem({
        code,
        name: info?.name ?? normalizeName(code, labName),
        category: resolvedCategory,
        unit: info?.unit ?? '',
        value: resolvedValue,
        flag: normalFlag,
        referenceMin: ref.min,
        referenceMax: ref.max,
        referenceText: isCulture ? undefined : (ref.text ?? refRaw) || undefined,
      })
    );
  }

  return Array.from(groupMap.values());
}

/** Fallback category inference from Korean test name */
function inferCategory(code: string, name: string): string {
  const lower = name.toLowerCase();
  if (
    lower.includes('culture') ||
    lower.includes('諛곗뼇') ||
    lower.startsWith('cre-') ||
    lower.startsWith('cre ')
  )
    return 'Culture';
  if (
    lower.includes('cbc') ||
    lower.includes('혈액검사') ||
    lower.includes('백혈구') ||
    lower.includes('적혈구')
  )
    return 'CBC';
  if (
    lower.includes('전해질') ||
    code.startsWith('B279') ||
    code.startsWith('B280') ||
    code.startsWith('B281')
  )
    return 'BC';
  if (lower.includes('crp') || lower.includes('반응성단백') || lower.includes('esr')) return 'BC';
  if (lower.includes('hba1c') || lower.includes('당화혈색소')) return 'BC';
  if (
    code.startsWith('B004') ||
    code.startsWith('D004') ||
    lower.includes('micro') ||
    lower.includes('sediment')
  )
    return 'Urine Sediment';
  if (
    lower.includes('소변') ||
    lower.includes('urine') ||
    code.startsWith('B003') ||
    code.startsWith('D003')
  )
    return 'UA';
  if (
    lower.includes('culture') ||
    lower.includes('배양') ||
    lower.startsWith('cre-') ||
    lower.startsWith('cre ')
  )
    return 'Culture';
  if (lower.includes('갑상') || lower.includes('thyroid') || lower.includes('tsh'))
    return 'Thyroid';
  return 'BC';
}
