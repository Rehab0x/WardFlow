/**
 * Today 빠른 입력 — 환자별 3줄(이름 / O / P)을 SOAP 초안 + 항생제로 바꾼다.
 *
 * 입력 예)
 *   홍길동
 *   Fever, K 2.7, CRP 15.0
 *   Tazocin 7일, 알림설정, 케이콘틴 3T#3
 *
 * 블록 분리와 이름 매칭은 코드가 하고(규칙 기반), AI는 SOAP 정리와 P의 항생제 추출만 맡는다.
 * AI 출력은 신뢰하지 않고 `normalizeQuickEntryDraft()`에서 검증한다.
 */
import { matchRosterName } from '@/lib/koreanName';
import { calculateAntibioticEndDate, calendarDaysBetween, MAX_ANTIBIOTIC_DAYS } from '@/utils/antibioticCourse';
import { lookupAntibioticName } from '@/services/antibioticNames';
import { callAI, parseVoiceQueryJson, type NameMatchKind } from '@/services/aiService';

export interface QuickEntryBlock {
  /** 첫 줄에 적은 이름 그대로 */
  heardName: string;
  patientName: string | null;
  nameMatch: NameMatchKind;
  objective: string;
  plan: string;
}

export interface QuickEntryAntibiotic {
  drugName: string;
  /** 투여 일수. 적지 않았으면 null — 종료일 없이 등록한다 */
  days: number | null;
  /** 하루 용량 (예: 4V) — 적지 않았으면 빈 문자열 */
  dosage: string;
  /** 횟수 (예: #4) — 적지 않았으면 빈 문자열 */
  frequency: string;
}

export interface QuickEntryReminder {
  /** 알림에 보일 문구 (예: "F/U", "검사 예정") */
  title: string;
  /** 오늘로부터 며칠 뒤인지 (1~365) */
  daysFromNow: number;
}

export interface QuickEntryDraft {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  antibiotics: QuickEntryAntibiotic[];
  reminders: QuickEntryReminder[];
}

export interface QuickEntryPatientContext {
  patientName: string;
  chiefComplaint: string;
  onset: string;
  problemList: string;
  currentMedications: string;
  recentLab: string;
}

export { calculateAntibioticEndDate };

/** 빈 줄로 환자를 나누고, 각 블록을 1줄=이름 · 2줄=O · 3줄 이후=P 로 읽는다. */
export function parseQuickEntryBlocks(text: string, roster: readonly string[]): QuickEntryBlock[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((chunk) =>
      chunk
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0)
    .map(([heardName, objective = '', ...planLines]) => {
      const matched = matchRosterName(heardName, roster);
      return {
        heardName: heardName!,
        patientName: matched?.name ?? null,
        nameMatch: matched ? (matched.exact ? 'exact' : 'similar') : 'none',
        objective,
        plan: planLines.join('\n'),
      } satisfies QuickEntryBlock;
    });
}

const DRAFT_SYSTEM_PROMPT = `당신은 입원환자 담당 의사의 경과기록(SOAP)을 정리하는 의료 AI입니다.

입력: 환자 차트 정보, 최근 Lab, 의사가 적은 O(객관 소견) 한 줄과 P(계획) 줄들.

규칙:
1. 의사가 적은 내용만 근거로 씁니다. 적지 않은 증상·수치·진단·처방을 지어내지 마세요.
2. subjective는 의사가 적지 않았으면 빈 문자열입니다.
3. objective는 의사가 적은 O를 정리하고, 관련 있는 최근 Lab 수치를 덧붙입니다. 수치는 주어진 값 그대로 쓰세요.
4. assessment는 Problem List 형식입니다. 한 줄에 하나씩 "#. 진단명", 의심 진단은 "#. R/O 진단명".
   차트 Problem List에 이미 있는 문제는 그 표기를 그대로 쓰고, 근거 없는 진단은 넣지 마세요.
5. plan은 의사가 적은 P를 그대로 정리합니다. "알림설정" 같은 앱 조작 문구는 plan에서 뺍니다.
6. antibiotics에는 P에 적힌 **항생제만** 넣습니다. 일반 약(예: 진통제, 항경련제)은 넣지 마세요.
   - drugName: 적힌 약 이름 **그대로** (약칭·한글이어도 바꾸지 마세요)
   - genericName: 그 약의 표준 일반명(영어). **확실할 때만** 쓰고, 조금이라도 불확실하면 빈 문자열
   - dosage: "4V", "2g"처럼 적힌 하루 용량 그대로, 없으면 빈 문자열
   - frequency: "#4"처럼 적힌 횟수 그대로(# 포함), 없으면 빈 문자열
   - days: "7일"처럼 일수가 적혀 있으면 숫자, 없으면 null
   - 예) P에 "Tazocin 4V#4 7일" → {"drugName": "Tazocin", "dosage": "4V", "frequency": "#4", "days": 7}
7. reminders에는 P에 "일주일 뒤 F/U", "10일 뒤 검사 예정"처럼 **며칠 뒤에 다시 확인할 일**이 적혀 있을 때만 넣습니다.
   - title: 할 일 문구만 (예: "F/U", "검사 예정"), daysFromNow: 오늘로부터 며칠 뒤인지 정수 (일주일=7, 2주=14, 한 달=30)
   - 항생제 투여 일수("7일")는 reminders가 아닙니다. 적히지 않은 알림을 만들지 마세요.
8. 한국어로 쓰되 약어·검사명은 영어 그대로 둡니다. 마크다운을 쓰지 마세요.

출력: 아래 JSON 객체 **하나만** 출력하세요. 설명이나 코드펜스를 붙이지 마세요.
{"subjective": string, "objective": string, "assessment": string, "plan": string, "antibiotics": [{"drugName": string, "genericName": string, "dosage": string, "frequency": string, "days": number | null}], "reminders": [{"title": string, "daysFromNow": number}]}`;

export async function draftQuickEntry(
  block: Pick<QuickEntryBlock, 'objective' | 'plan'>,
  context: QuickEntryPatientContext
): Promise<QuickEntryDraft> {
  const userMessage = [
    `환자: ${context.patientName}`,
    context.chiefComplaint && `C/C: ${context.chiefComplaint}`,
    context.onset && `Onset: ${context.onset}`,
    context.problemList && `차트 Problem List:\n${context.problemList}`,
    context.currentMedications && `현재 항생제:\n${context.currentMedications}`,
    context.recentLab && `최근 Lab:\n${context.recentLab}`,
    `O: ${block.objective || '(없음)'}`,
    `P: ${block.plan || '(없음)'}`,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await callAI(DRAFT_SYSTEM_PROMPT, userMessage);
  return normalizeQuickEntryDraft(parseVoiceQueryJson(response.content), block);
}

/** LLM 출력을 신뢰하지 않고 정규화한다. 항생제 일수는 1~60일 정수만 통과시킨다. */
export function normalizeQuickEntryDraft(
  value: unknown,
  fallback: Pick<QuickEntryBlock, 'objective' | 'plan'>
): QuickEntryDraft {
  const source = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const antibiotics = Array.isArray(source.antibiotics) ? source.antibiotics : [];

  return {
    subjective: readText(source.subjective),
    // AI가 비워 보내도 의사가 적은 원문은 잃지 않는다.
    objective: readText(source.objective) || fallback.objective,
    assessment: readText(source.assessment),
    plan: readText(source.plan) || fallback.plan,
    antibiotics: antibiotics
      .map((entry): QuickEntryAntibiotic | null => {
        if (typeof entry !== 'object' || entry === null) return null;
        const item = entry as Record<string, unknown>;
        const drugName = readText(item.drugName);
        if (!drugName) return null;
        const days = Number(item.days);
        const valid = Number.isInteger(days) && days >= 1 && days <= MAX_ANTIBIOTIC_DAYS;
        const llm = {
          drugName,
          days: valid ? days : null,
          dosage: readText(item.dosage),
          frequency: readText(item.frequency),
        };
        // 의사가 적은 원문에서 코드가 읽은 값이 있으면 그것을 우선한다 (AI가 틀려도 원문은 정확하다).
        const parsed = extractAntibioticRegimen(fallback.plan, drugName);
        return {
          // 내장 별칭표(결정적) → AI가 확실하다고 한 일반명 → 적힌 그대로 순서로 쓴다.
          drugName: lookupAntibioticName(drugName) ?? (readText(item.genericName) || drugName),
          days: parsed.days ?? llm.days,
          dosage: parsed.dosage || llm.dosage,
          frequency: parsed.frequency || llm.frequency,
        };
      })
      .filter((item): item is QuickEntryAntibiotic => item !== null),
    reminders: mergeReminders(
      extractReminders(fallback.plan, new Date()),
      Array.isArray(source.reminders) ? source.reminders : []
    ),
  };
}

const MAX_REMINDER_DAYS = 365;

function mergeReminders(parsed: QuickEntryReminder[], fromAi: unknown[]): QuickEntryReminder[] {
  const merged = [...parsed];
  for (const entry of fromAi) {
    if (typeof entry !== 'object' || entry === null) continue;
    const item = entry as Record<string, unknown>;
    const title = readText(item.title);
    const days = Number(item.daysFromNow);
    if (!title || !Number.isInteger(days) || days < 1 || days > MAX_REMINDER_DAYS) continue;
    // 코드가 이미 읽은 것과 같은 날짜면 같은 알림으로 보고 AI 쪽은 버린다.
    if (merged.some((existing) => existing.daysFromNow === days)) continue;
    merged.push({ title, daysFromNow: days });
  }
  return merged;
}

const WORD_NUMBERS: Record<string, number> = { 일: 1, 이: 2, 삼: 3, 사: 4, 한: 1, 두: 2, 세: 3 };

/**
 * P 줄에서 "일주일 뒤 F/U", "10일 후 검사 예정", "2주 뒤 외래", "내일 Lab" 같은 알림을 읽는다.
 * 쉼표·줄바꿈·세미콜론으로 나눈 조각마다 시간 표현 하나를 찾고, 나머지를 알림 문구로 쓴다.
 * 항생제 일수("Tazocin 7일")는 "뒤/후"가 없으므로 읽지 않는다.
 */
export function extractReminders(plan: string, today: Date): QuickEntryReminder[] {
  const reminders: QuickEntryReminder[] = [];
  // 1: 내일/모레 · 2: 일/이/삼/사 + 주일 · 3: 한/두/세 + 달 · 4,5: 숫자 + 단위 (모두 뒤/후 필요)
  const offset =
    /(내일|모레)|(?:(일|이|삼|사)\s*주일|(한|두|세)\s*달|(\d{1,3})\s*(주일|주|일|개월|달))\s*(?:뒤|후)(?:에)?/;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  for (const segment of plan.split(/[,;\n]/)) {
    const found = offset.exec(segment);
    if (!found) continue;

    let target: Date;
    if (found[1]) target = shift(base, found[1] === '내일' ? 1 : 2);
    else if (found[2]) target = shift(base, WORD_NUMBERS[found[2]]! * 7);
    else if (found[3]) target = addMonths(base, WORD_NUMBERS[found[3]]!);
    else {
      const count = Number(found[4]);
      const unit = found[5];
      target =
        unit === '일'
          ? shift(base, count)
          : unit === '주' || unit === '주일'
            ? shift(base, count * 7)
            : addMonths(base, count);
    }

    const daysFromNow = calendarDaysBetween(base, target);
    const title = (segment.slice(0, found.index) + segment.slice(found.index + found[0].length))
      .replace(/\s+/g, ' ')
      .trim();
    if (!title || daysFromNow < 1 || daysFromNow > MAX_REMINDER_DAYS) continue;
    reminders.push({ title, daysFromNow });
  }
  return reminders;
}

function shift(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export interface AntibioticRegimen {
  dosage: string;
  frequency: string;
  days: number | null;
}

const DOSE_UNITS = '(?:vials?|amp|mcg|mg|iu|ml|cc|v|g|t|a)';

/**
 * P 줄에서 약 이름 바로 뒤에 붙은 용량·횟수·일수를 읽는다.
 * 예) "Tazocin 4V#4 7일", "Tazocin, 3V, #3, 7일" → 4V / #4 / 7일
 * 약 이름 뒤에서 용량·횟수·일수가 아닌 토큰(다음 약 이름 등)을 만나면 멈춘다.
 */
export function extractAntibioticRegimen(plan: string, drugName: string): AntibioticRegimen {
  const result: AntibioticRegimen = { dosage: '', frequency: '', days: null };
  const lowerPlan = plan.toLowerCase();
  const candidates = [drugName, drugName.split(/\s+/)[0] ?? ''].filter(Boolean);
  const at = candidates
    .map((name) => ({ name, index: lowerPlan.indexOf(name.toLowerCase()) }))
    .find((entry) => entry.index >= 0);
  if (!at) return result;

  let rest = plan.slice(at.index + at.name.length);
  const tokens: Array<[keyof AntibioticRegimen, RegExp]> = [
    ['days', /^[\s,]*(\d{1,3})\s*일/],
    ['frequency', /^[\s,]*#\s*(\d{1,2})(?!\d)/],
    ['dosage', new RegExp(`^[\\s,]*(\\d+(?:\\.\\d+)?\\s*${DOSE_UNITS})(?![a-z])`, 'i')],
  ];

  for (;;) {
    let matched = false;
    for (const [field, pattern] of tokens) {
      const found = pattern.exec(rest);
      if (!found) continue;
      matched = true;
      rest = rest.slice(found[0].length);
      if (field === 'days') {
        const value = Number(found[1]);
        if (result.days === null && value >= 1 && value <= MAX_ANTIBIOTIC_DAYS) result.days = value;
      } else if (field === 'frequency') {
        result.frequency ||= `#${found[1]}`;
      } else {
        result.dosage ||= found[1]!.replace(/\s+/g, '').toUpperCase().replace(/^(\d+(?:\.\d+)?)(MG|MCG|ML|CC|IU)$/, (_, n, u) => n + u.toLowerCase());
      }
      break;
    }
    if (!matched) break;
  }
  return result;
}

export function formatQuickEntryNote(
  draft: Pick<QuickEntryDraft, 'subjective' | 'objective' | 'assessment' | 'plan'>
): string {
  return [
    draft.subjective && `S) ${draft.subjective}`,
    draft.objective && `O) ${draft.objective}`,
    draft.assessment && `A) ${draft.assessment}`,
    draft.plan && `P) ${draft.plan}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
