/**
 * 한국어 환자명 매칭 — STT/받아쓰기 오인식을 감안해 명단에서 같은 사람을 찾는다.
 *
 * 배경: 음성 인식은 이름의 받침·모음을 자주 틀린다("김부경"→"김부겸", "장영임"→"장영일").
 * LLM에 명단을 넘겨 보정하게 해도 명단에 없는 철자를 그대로 돌려주는 경우가 있어,
 * **코드에서 한 번 더** 자모 단위로 비교한다.
 *
 * 매칭 결과는 항상 **명단에 있는 이름**이다 — 없는 환자를 지어낼 수 없다.
 * 다만 정확 일치(`exact: true`)와 유사 매칭(`exact: false`)을 구분해서 돌려주므로,
 * 호출부는 유사 매칭에 대해 사람 확인을 요구할 수 있다.
 */

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

// prettier-ignore
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
// prettier-ignore
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
// prettier-ignore
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

/** 서로 자주 혼동되는 자모 묶음 — 이 안에서 바뀐 것은 "거의 같은 소리"로 본다. */
const CONFUSABLE_GROUPS: Record<'cho' | 'jung' | 'jong', string[][]> = {
  cho: [
    ['ㄱ', 'ㄲ', 'ㅋ'],
    ['ㄷ', 'ㄸ', 'ㅌ'],
    ['ㅂ', 'ㅃ', 'ㅍ'],
    ['ㅅ', 'ㅆ'],
    ['ㅈ', 'ㅉ', 'ㅊ'],
    ['ㄴ', 'ㄹ'],
    ['ㅇ', 'ㅎ'],
  ],
  jung: [
    ['ㅐ', 'ㅔ', 'ㅒ', 'ㅖ'], // 현대 한국어에서 사실상 구분되지 않는다
    ['ㅓ', 'ㅗ'],
    ['ㅜ', 'ㅡ'],
    ['ㅚ', 'ㅙ', 'ㅞ', 'ㅟ'],
    ['ㅑ', 'ㅕ'],
    ['ㅏ', 'ㅑ'],
    ['ㅗ', 'ㅛ'],
    ['ㅜ', 'ㅠ'],
    ['ㅡ', 'ㅢ', 'ㅣ'],
  ],
  jong: [
    ['ㄴ', 'ㅇ', 'ㅁ'], // 김부겸/김부경, 장영임/장영인 — 가장 흔한 오인식
    ['ㄴ', 'ㄹ'], // 장영임/장영일 계열
    ['ㄱ', 'ㄲ', 'ㅋ', 'ㄺ'],
    ['ㅂ', 'ㅍ', 'ㅄ'],
    ['ㅅ', 'ㅆ', 'ㅈ', 'ㅊ', 'ㅌ', 'ㄷ', 'ㅎ'], // 받침에서 모두 ㄷ 소리로 난다
  ],
};

const CONFUSABLE_PAIRS = buildConfusablePairs();

function buildConfusablePairs(): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = { cho: new Set(), jung: new Set(), jong: new Set() };
  for (const [position, groups] of Object.entries(CONFUSABLE_GROUPS)) {
    for (const group of groups) {
      for (const a of group) {
        for (const b of group) {
          if (a !== b) result[position]!.add(`${a}|${b}`);
        }
      }
    }
  }
  return result;
}

/** 같으면 0, 혼동 자모면 0.35, 한쪽만 비어 있으면 0.7, 완전히 다르면 1 */
function jamoCost(position: 'cho' | 'jung' | 'jong', a: string, b: string): number {
  if (a === b) return 0;
  if (!a || !b) return 0.7; // 받침 유무 차이 (예: 부경/부겨)
  return CONFUSABLE_PAIRS[position]!.has(`${a}|${b}`) ? 0.35 : 1;
}

interface Syllable {
  raw: string;
  cho: string;
  jung: string;
  jong: string;
}

/** 한글 음절을 초·중·종성으로 나눈다. 한글이 아니면 raw만 채운다. */
function decompose(char: string): Syllable {
  const code = char.charCodeAt(0);
  if (code < HANGUL_BASE || code > HANGUL_LAST) {
    return { raw: char, cho: '', jung: '', jong: '' };
  }
  const index = code - HANGUL_BASE;
  return {
    raw: char,
    cho: CHO[Math.floor(index / (JUNG_COUNT * JONG_COUNT))]!,
    jung: JUNG[Math.floor(index / JONG_COUNT) % JUNG_COUNT]!,
    jong: JONG[index % JONG_COUNT]!,
  };
}

/** 음절 하나의 거리 (0 = 같음, 1 = 완전히 다름) */
function syllableCost(a: Syllable, b: Syllable): number {
  if (a.raw === b.raw) return 0;
  // 한쪽이 한글이 아니면 자모 비교가 의미 없다.
  if (!a.cho || !b.cho) return 1;
  const cost =
    (jamoCost('cho', a.cho, b.cho) +
      jamoCost('jung', a.jung, b.jung) +
      jamoCost('jong', a.jong, b.jong)) /
    3;
  return Math.min(cost, 1);
}

/** 음절 단위 편집 거리. 치환 비용은 자모 유사도(0~1), 삽입/삭제는 1. */
function nameDistance(a: string, b: string): number {
  const left = [...a].map(decompose);
  const right = [...b].map(decompose);

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(
        previous[j]! + 1, // 삭제
        current[j - 1]! + 1, // 삽입
        previous[j - 1]! + syllableCost(left[i - 1]!, right[j - 1]!) // 치환
      );
    }
    previous = current;
  }
  return previous[right.length]!;
}

/** 이름 뒤에 붙는 호칭 — 매칭 전에 떼어 낸다. */
const HONORIFIC = /(환자분|환자님|환자|어르신|할머니|할아버지|선생님|님|씨)$/;

/** 비교용 키로 이름을 정리한다 (공백·문장부호·호칭 제거, 영문은 소문자로). */
export function normalizePatientName(value: string): string {
  let name = value.replace(/[\s.,·'"“”‘’()[\]]/g, '').trim().toLowerCase();
  // "김부경님환자" 처럼 겹쳐 붙는 경우가 있어 반복해서 떼되, 이름이 한 글자로 줄면 멈춘다.
  while (HONORIFIC.test(name) && name.replace(HONORIFIC, '').length >= 2) {
    name = name.replace(HONORIFIC, '');
  }
  return name;
}

export interface RosterMatch {
  /** 명단에 있는 그대로의 이름 */
  name: string;
  /** 철자까지 일치했는지. false면 "비슷한 이름"으로 이은 것이므로 사람 확인이 필요하다. */
  exact: boolean;
  /** 음절 단위 거리 (0 = 동일) — 디버깅/테스트용 */
  distance: number;
}

/** 유사 매칭 허용 한도 — 이름이 짧을수록 엄격하게 본다. */
function allowedDistance(length: number): number {
  if (length >= 4) return 1;
  if (length === 3) return 0.8; // 자모 두어 개가 틀린 정도까지 (김부겸→김부경, 김민수→김민준)
  if (length === 2) return 0.3; // 두 글자 이름은 혼동 자모 수준만 허용 (김순↔김수 ○, 박수↔김수 ✗)
  return 0; // 한 글자는 유사 매칭하지 않는다
}

/** 1·2등 차이가 이보다 작으면 둘 중 누구인지 알 수 없다고 본다. */
const AMBIGUITY_MARGIN = 0.35;

/**
 * 들린 이름을 환자 명단의 이름 하나로 잇는다.
 *
 * - 철자가 같으면 `exact: true`
 * - 자모 단위로 충분히 가까운 이름이 **하나뿐일 때만** `exact: false`로 잇는다
 * - 후보가 둘 이상 비슷하게 가깝거나(누군지 알 수 없음) 너무 멀면 `null`
 */
export function matchRosterName(
  raw: string | null | undefined,
  roster: readonly string[]
): RosterMatch | null {
  const heard = normalizePatientName(typeof raw === 'string' ? raw : '');
  if (!heard) return null;

  const candidates = roster.map((name) => ({ name, normalized: normalizePatientName(name) }));

  const exact = candidates.find((candidate) => candidate.normalized === heard);
  if (exact) return { name: exact.name, exact: true, distance: 0 };

  const scored = candidates
    .map((candidate) => ({
      name: candidate.name,
      distance: nameDistance(heard, candidate.normalized),
      length: Math.max(heard.length, candidate.normalized.length),
    }))
    .sort((a, b) => a.distance - b.distance);

  const best = scored[0];
  if (!best || best.distance > allowedDistance(best.length)) return null;

  const runnerUp = scored[1];
  if (runnerUp && runnerUp.distance - best.distance < AMBIGUITY_MARGIN) return null;

  return { name: best.name, exact: false, distance: best.distance };
}
