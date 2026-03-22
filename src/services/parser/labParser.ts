import { getLabInfo, findLabByName, extractCleanName } from './labCodeMap';

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

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed) {
      items.push(parsed);
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
  const cols = line.split('\t').map((c) => c.trim());
  if (cols.length < 3) return null;

  const col0 = cols[0] ?? '';
  const col1 = cols[1] ?? '';
  const col2 = cols[2] ?? '';
  const col3 = cols[3] ?? '';
  const col4 = cols[4] ?? '';

  // Code pattern: B/A codes (B2500, A0118) or D-codes (D0002010, D000201HZ)
  const codePattern = /^[ABDabd][\w]{3,}/;

  let code = '';
  let rawName = '';
  let value = '';
  let flagRaw = '';
  let refRaw = '';

  if (codePattern.test(col0)) {
    code = col0.toUpperCase();
    rawName = col1;
    value = col2;
    flagRaw = col3;
    refRaw = col4;
  } else {
    rawName = col0;
    value = col1;
    flagRaw = col2;
    refRaw = col3;
  }

  if (!rawName || !value) return null;

  const flagUp = flagRaw.toUpperCase().trim();
  const normalFlag: 'H' | 'L' | '' =
    (flagUp === 'H' || flagUp === 'HIGH') ? 'H' :
    (flagUp === 'L' || flagUp === 'LOW') ? 'L' : '';

  const cleanName = extractCleanName(code, rawName);
  const info = code ? getLabInfo(code) : findLabByName(cleanName);
  const ref = parseReferenceRange(refRaw);

  return {
    code,
    name: cleanName,
    category: info?.category ?? inferCategoryFromName(cleanName),
    unit: info?.unit ?? '',
    value,
    flag: normalFlag,
    referenceMin: ref.min,
    referenceMax: ref.max,
    referenceText: (ref.text ?? refRaw) || undefined,
  };
}

function inferCategoryFromName(name: string): string {
  const lower = name.toLowerCase();
  if (['wbc', 'rbc', 'hb', 'hct', 'mcv', 'mch', 'mchc', 'plt', 'platelet'].includes(lower)) return 'CBC';
  if (['neutrophil', 'n.segment', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil'].includes(lower)) return 'WBC Diff.';
  if (['na', 'k', 'cl'].includes(lower)) return 'Electrolyte';
  if (lower === 'crp' || lower === 'esr' || lower === 'pct') return 'Inflammatory';
  if (['color', 'leukocyte', 'occult blood', 'bilirubin', 'urobilinogen', 'ketone', 'protein', 'nitrite', 'ph', 's.g'].includes(lower)) return 'UA';
  if (lower.includes('micro') || lower.includes('epithelial') || lower.includes('bacteria')) return 'UA Micro';
  return 'LFT';
}

function parseSpaceLine(line: string): ParsedLabItem | null {
  const codeMatch = line.match(/^([ABab]\d{4,6}[ABab]?)\s+(.+)/);
  if (!codeMatch || !codeMatch[1] || !codeMatch[2]) return null;

  const code = codeMatch[1].toUpperCase();
  const rest = codeMatch[2].trim();

  const parts = rest.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const name = parts[0] ?? '';
  const value = parts[1] ?? '';
  const thirdPart = parts[2] ?? '';
  const flag = thirdPart === 'H' || thirdPart === 'L' ? thirdPart : '';
  const refRaw = flag ? (parts[3] ?? '') : (parts[2] ?? '');

  const info = getLabInfo(code);
  const ref = parseReferenceRange(refRaw);

  return {
    code,
    name: info?.name ?? name,
    category: info?.category ?? 'Other',
    unit: info?.unit ?? '',
    value,
    flag: flag as 'H' | 'L' | '',
    referenceMin: ref.min,
    referenceMax: ref.max,
    referenceText: (ref.text ?? refRaw) || undefined,
  };
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
  orderDate?: string;   // YYYY-MM-DD
  items: ParsedLabItem[];
}

/** Parse YYYYMMDD → "YYYY-MM-DD" */
function parseXlsDate(raw: string): string | undefined {
  const m = String(raw).replace(/\D/g, '').match(/^(\d{4})(\d{2})(\d{2})$/);
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
    const rawDate  = String(row[6] ?? '').trim();
    const labCode  = String(row[8] ?? '').trim();
    const labName  = String(row[10] ?? '').trim();
    const numResult = String(row[11] ?? '').trim();
    const textResult = String(row[12] ?? '').trim();
    const hlFlag   = String(row[13] ?? '').trim();
    const refRaw   = String(row[15] ?? '').trim();
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

    // Culture: textResult에 전체 균/감수성 결과가 있음. numResult는 비어있음.
    const isCulture = !numResult && !!textResult;

    if (!numResult && !textResult) continue;

    const code = labCode.toUpperCase();
    const info = getLabInfo(code);
    const normalFlag: 'H' | 'L' | '' =
      hlFlag.toUpperCase() === 'H' ? 'H' : hlFlag.toUpperCase() === 'L' ? 'L' : '';
    const ref = parseReferenceRange(refRaw);

    const resolvedCategory = isCulture ? 'Culture' : (info?.category ?? inferCategory(labCode, labName));

    // Culture는 전체 텍스트를 value에 저장 (\r\n → \n 정규화)
    const resolvedValue = isCulture
      ? textResult.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
      : numResult;

    group.items.push({
      code,
      name: info?.name ?? normalizeName(code, labName),
      category: resolvedCategory,
      unit: info?.unit ?? '',
      value: resolvedValue,
      flag: normalFlag,
      referenceMin: ref.min,
      referenceMax: ref.max,
      referenceText: isCulture ? undefined : ((ref.text ?? refRaw) || undefined),
    });
  }

  return Array.from(groupMap.values());
}

/** Fallback category inference from Korean test name */
function inferCategory(code: string, name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('cbc') || lower.includes('혈액검사') || lower.includes('백혈구') || lower.includes('적혈구')) return 'CBC';
  if (lower.includes('전해질') || code.startsWith('B279') || code.startsWith('B280') || code.startsWith('B281')) return 'Electrolyte';
  if (lower.includes('crp') || lower.includes('반응성단백') || lower.includes('esr')) return 'Inflammatory';
  if (lower.includes('소변') || lower.includes('urine') || code.startsWith('B003')) return 'UA';
  if (lower.includes('culture') || lower.includes('배양') || lower.includes('cre')) return 'Culture';
  if (lower.includes('갑상') || lower.includes('thyroid') || lower.includes('tsh')) return 'Thyroid';
  return 'Chemistry';
}
