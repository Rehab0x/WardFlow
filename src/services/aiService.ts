/**
 * AI Service — Multi-LLM Support
 *
 * Claude (Anthropic), GPT (OpenAI), Gemini (Google), Grok (xAI)
 * 통합 인터페이스로 호출
 */

import { matchRosterName } from '@/lib/koreanName';
import { useAIStore, LLM_PROVIDERS, type LLMProvider } from '@/stores/useAIStore';

interface AIResponse {
  content: string;
  model: string;
  provider: LLMProvider;
}

/**
 * Send a message to the configured LLM and return the response.
 */
export async function callAI(
  systemPrompt: string,
  userMessage: string,
): Promise<AIResponse> {
  const { provider, apiKey, model } = useAIStore.getState();

  if (!apiKey) {
    throw new Error('API 키가 설정되지 않았습니다. 설정 > AI 설정에서 API 키를 입력해주세요.');
  }

  switch (provider) {
    case 'claude':
      return callClaude(apiKey, model, systemPrompt, userMessage);
    case 'gpt':
      return callOpenAICompatible(apiKey, model, systemPrompt, userMessage, LLM_PROVIDERS.gpt.apiUrl, 'gpt');
    case 'gemini':
      return callGemini(apiKey, model, systemPrompt, userMessage);
    case 'grok':
      return callOpenAICompatible(apiKey, model, systemPrompt, userMessage, LLM_PROVIDERS.grok.apiUrl, 'grok');
    default:
      throw new Error(`지원하지 않는 LLM: ${provider}`);
  }
}

/**
 * Test the API connection.
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await callAI(
      'You are a helpful assistant. Respond in Korean.',
      '안녕하세요. 연결 테스트입니다. "연결 성공"이라고만 답해주세요.'
    );
    return { success: true, message: `${response.provider}/${response.model}: ${response.content.slice(0, 50)}` };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
}

// ─── Claude (Anthropic) ───

async function callClaude(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<AIResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude API 오류 (${response.status}): ${((err as Record<string, Record<string, unknown>>)?.error as Record<string, unknown>)?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text || '',
    model,
    provider: 'claude',
  };
}

// ─── OpenAI Compatible (GPT, Grok) ───

async function callOpenAICompatible(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  apiUrl: string,
  provider: LLMProvider,
): Promise<AIResponse> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`${provider} API 오류 (${response.status}): ${((err as Record<string, Record<string, unknown>>)?.error as Record<string, unknown>)?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    model,
    provider,
  };
}

// ─── Gemini (Google) ───

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<AIResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 4096 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini API 오류 (${response.status}): ${((err as Record<string, Record<string, unknown>>)?.error as Record<string, unknown>)?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    model,
    provider: 'gemini',
  };
}

// ─── AI Feature Prompts ───

const SOAP_SYSTEM_PROMPT = `당신은 병원 입원환자 담당 의사의 경과기록을 SOAP 형식으로 정리하는 의료 AI 어시스턴트입니다.

규칙:
1. 반드시 아래 형식으로 출력하세요 (S/O/A/P 뒤에 제목 없이 바로 내용):
   S)
   (환자 주관적 호소, 증상 변화 내용)
   O)
   (활력징후, 검사결과, 신체검사 소견 내용)
   A)
   (평가, 진단, 문제 목록 내용)
   P)
   (치료 계획, 처방 변경, 검사 예정 내용)
2. "Subjective", "Objective", "Assessment", "Plan" 같은 제목 단어는 절대 쓰지 마세요. "S)", "O)", "A)", "P)" 만 쓰세요.
3. 간결하고 의학적으로 정확하게 작성하세요.
4. OCS/EMR에 바로 붙여넣기 좋은 형식으로 출력하세요.
5. 한국어로 작성하되, 의학 용어는 영어 병기 가능.
6. 입력 정보가 부족한 섹션은 추정하지 말고 빈칸으로 두세요.`;

const LAB_SUMMARY_SYSTEM_PROMPT = `당신은 병원 입원환자의 Lab 결과를 요약하는 의료 AI 어시스턴트입니다.

규칙:
1. 비정상 수치를 우선적으로 언급하세요.
2. 추이가 있으면 "상승세", "하강세", "안정" 등으로 요약하세요.
3. 임상적으로 중요한 항목 위주로 간결하게 작성하세요.
4. OCS/EMR 경과기록의 O) 섹션에 바로 넣을 수 있는 형식으로 출력하세요.
5. 한국어로 작성하되, Lab 항목명은 영어 그대로 사용하세요.
6. 마크다운 형식을 사용하지 말고 일반 텍스트로 출력하세요.`;

/**
 * Generate SOAP note from progress notes and patient context.
 */
export async function generateSOAP(context: {
  patientName: string;
  chiefComplaint: string;
  onset: string;
  progressNote: string;
  currentMedications?: string;
  recentLab?: string;
}): Promise<string> {
  const userMessage = [
    `환자: ${context.patientName}`,
    `C/C: ${context.chiefComplaint}`,
    `Onset: ${context.onset}`,
    context.currentMedications ? `현재 투약:\n${context.currentMedications}` : '',
    context.recentLab ? `최근 Lab:\n${context.recentLab}` : '',
    `\n오늘의 경과기록 메모:\n${context.progressNote}`,
    '\n위 내용을 SOAP 형식으로 정리해주세요.',
  ].filter(Boolean).join('\n');

  const response = await callAI(SOAP_SYSTEM_PROMPT, userMessage);
  return response.content;
}

/**
 * Generate Lab summary from lab data.
 */
export async function generateLabSummary(context: {
  patientName: string;
  chiefComplaint: string;
  labData: string; // formatted lab text
}): Promise<string> {
  const userMessage = [
    `환자: ${context.patientName}`,
    `C/C: ${context.chiefComplaint}`,
    `\nLab 결과:\n${context.labData}`,
    '\n위 Lab 결과를 임상적으로 요약해주세요.',
  ].join('\n');

  const response = await callAI(LAB_SUMMARY_SYSTEM_PROMPT, userMessage);
  return response.content;
}

// ─── Handoff Summary ───

const HANDOFF_SYSTEM_PROMPT = `당신은 병원 입원환자의 인수인계 요약을 작성하는 의료 AI 어시스턴트입니다.
당직 교대나 전과 시 넘겨받는 의사가 30초 안에 환자를 파악할 수 있도록 작성합니다.

출력 형식 (번호 매기기, 간결하게):
1. 환자 정보: 이름 / 성별/나이 / 입원 D+N
2. 주 진단: (Problem List 또는 C/C 기반)
3. 현재 상태: (최근 경과기록 기반, 1~2줄)
4. 주요 이슈: (주의가 필요한 사항들, 불릿)
5. 핵심 투약: (중요 약제만 — 항생제 D-day, 특수 약제)
6. 최근 Lab: (비정상 항목 위주, 추이)
7. 주의사항: (Tags, Attention 내용)
8. 오늘/내일 할 일: (일정, 예정된 검사/처치)

규칙:
1. 간결하고 핵심만 작성하세요. 각 항목 1~3줄 이내.
2. 마크다운 사용하지 말고 일반 텍스트로 출력하세요.
3. 한국어로 작성하되, 의학 용어는 영어 병기 가능.
4. 정보가 없는 항목은 "정보 없음"으로 표기하세요.
5. 임상적 판단이나 추측은 하지 마세요. 주어진 데이터만 정리하세요.`;

/**
 * Generate handoff summary from full patient context.
 */
export async function generateHandoff(context: {
  patientName: string;
  sex: string;
  age: number;
  admissionDate: string;
  chiefComplaint: string;
  onset: string;
  problemList: string;
  currentMedications: string;
  antibiotics: string;
  recentLab: string;
  recentNotes: string;
  tags: string;
  attention: boolean;
  schedules: string;
}): Promise<string> {
  const userMessage = [
    `환자: ${context.patientName} / ${context.sex}/${context.age}`,
    `입원일: ${context.admissionDate}`,
    `C/C: ${context.chiefComplaint}`,
    `Onset: ${context.onset}`,
    context.problemList ? `Problem List:\n${context.problemList}` : '',
    context.currentMedications ? `현재 전체 투약:\n${context.currentMedications}` : '',
    context.antibiotics ? `항생제:\n${context.antibiotics}` : '',
    context.recentLab ? `최근 Lab:\n${context.recentLab}` : '',
    context.recentNotes ? `최근 경과기록 (최근 3일):\n${context.recentNotes}` : '',
    context.tags ? `주의사항 Tags: ${context.tags}` : '',
    context.attention ? 'Attention 플래그: 활성 (주의 필요 환자)' : '',
    context.schedules ? `오늘/내일 일정:\n${context.schedules}` : '',
    '\n위 정보를 바탕으로 인수인계 요약을 작성해주세요.',
  ].filter(Boolean).join('\n');

  const response = await callAI(HANDOFF_SYSTEM_PROMPT, userMessage);
  return response.content;
}

// ─── Medication Check ───

const MED_CHECK_SYSTEM_PROMPT = `당신은 입원환자의 투약 안전성을 점검하는 의료 AI 어시스턴트입니다.
현재 투약 목록과 Lab 결과를 교차 분석하여 주의사항을 알려줍니다.

점검 항목:
1. 신기능(Cr, BUN, eGFR) 대비 용량 조절이 필요한 약제 (renal dose)
2. 간기능(AST, ALT, Bilirubin) 대비 주의 약제
3. 전해질(K, Na, Ca, Mg) 이상과 관련된 약제 상호작용
4. 항생제 장기 사용 (D+14 이상) 주의
5. 약물 간 주요 상호작용
6. 모니터링이 필요한 약제 (Warfarin→INR, Digoxin→level 등)
7. 누락된 모니터링 Lab (약제는 있는데 관련 Lab이 최근에 없는 경우)

출력 형식:
- ⚠️ (주의) 항목: 즉시 확인 필요한 사항
- ℹ️ (참고) 항목: 모니터링 권장 사항
- ✅ (양호) 항목: 확인 완료된 사항 (간략히)

규칙:
1. 임상적으로 중요한 항목 위주로 간결하게 작성하세요.
2. 확실하지 않은 상호작용은 "확인 필요"로 표기하세요.
3. 한국어로 작성하되, 약물명과 Lab 항목은 영어 사용.
4. 마크다운 사용하지 말고 일반 텍스트로 출력하세요.
5. 최대 10개 항목 이내로 작성하세요.`;

/**
 * Check medication safety against current lab values.
 */
export async function checkMedications(context: {
  patientName: string;
  age: number;
  sex: string;
  currentMedications: string;
  antibiotics: string;
  recentLab: string;
}): Promise<string> {
  const userMessage = [
    `환자: ${context.patientName} / ${context.sex}/${context.age}`,
    `\n현재 전체 투약:\n${context.currentMedications}`,
    context.antibiotics ? `\n항생제:\n${context.antibiotics}` : '',
    `\n최근 Lab:\n${context.recentLab}`,
    '\n위 투약과 Lab을 교차 분석하여 주의사항을 점검해주세요.',
  ].filter(Boolean).join('\n');

  const response = await callAI(MED_CHECK_SYSTEM_PROMPT, userMessage);
  return response.content;
}

// ─── Voice Query (음성 질의 → 구조화) ───

const VOICE_QUERY_SYSTEM_PROMPT = `당신은 병동 회진 중 의사의 음성 질문을 구조화된 조회 요청으로 바꾸는 파서입니다.

입력으로 (1) 음성 인식된 질문 텍스트와 (2) 현재 담당 중인 환자 명단이 주어집니다.

할 일:
1. 질문에서 어떤 환자를 가리키는지 찾습니다.
   - 음성 인식은 이름을 부정확하게 옮길 수 있습니다 (예: "이몽룡"을 "이몽룹"로).
   - 반드시 **주어진 환자 명단 안에서** 가장 가까운 이름을 고르고, 명단에 있는 철자 그대로 출력하세요.
   - 어느 환자인지 합리적으로 특정할 수 없으면 patientName을 null로 두세요. 명단에 없는 이름을 지어내지 마세요.
   - heardName에는 **질문에서 들린 이름을 그대로** 넣으세요 (명단에 없는 철자여도 괜찮습니다).
     patientName을 null로 두더라도 heardName은 채워야 합니다 — 코드가 발음으로 한 번 더 대조합니다.
2. 무엇을 묻는지 분류합니다.
   - 'lab': 검사 수치나 그 추이 (소듐, 칼륨, 크레아티닌, 헤모글로빈, CRP 등)
   - 'medication': 투약, 약제, 항생제
   - 'unknown': 위 둘로 분류할 수 없음
3. 검사 항목이나 약제 이름을 item에 넣습니다. 검사명은 **영문 약어**로 정규화하세요.
   (소듐→Na, 칼륨→K, 클로라이드→Cl, 칼슘→Ca, 크레아티닌→Cr, 헤모글로빈→Hb,
    백혈구→WBC, 혈소판→PLT, 혈당→Glucose, 당화혈색소→HbA1c)
   특정할 수 없으면 null.

출력 형식 — 아래 JSON 객체 **하나만** 출력하세요. 설명, 마크다운 코드펜스, 그 밖의 텍스트를 붙이지 마세요.
{"patientName": string|null, "heardName": string|null, "queryType": "lab"|"medication"|"unknown", "item": string|null}`;

export type VoiceQueryType = 'lab' | 'medication' | 'unknown';

export interface ParsedVoiceQuery {
  /** 명단에서 확정된 이름. 특정 못 하면 null */
  patientName: string | null;
  /** 질문에서 들린 이름 그대로 — 매칭 실패·유사 매칭일 때 사용자에게 보여준다 */
  heardName: string | null;
  /** 'exact' 철자 일치 · 'similar' 발음이 비슷해 연결 · 'none' 특정 실패 */
  nameMatch: NameMatchKind;
  queryType: VoiceQueryType;
  item: string | null;
}

/** 환자 이름을 어떻게 이었는지 — UI가 확인을 요구할지 판단하는 데 쓴다. */
export type NameMatchKind = 'exact' | 'similar' | 'none';

/**
 * 음성 인식 텍스트를 구조화된 조회 요청으로 바꾼다.
 *
 * 환자 매칭은 LLM에 맡긴다 — STT가 이름을 틀리게 옮기는 경우가 많아,
 * 활성 환자 명단을 컨텍스트로 함께 넘겨 가장 가까운 이름을 고르게 하는 편이 정확하다.
 */
export async function parseVoiceQuery(
  transcript: string,
  patientNames: string[]
): Promise<ParsedVoiceQuery> {
  const roster = patientNames.length > 0 ? patientNames.join(', ') : '(없음)';
  const userMessage = [`환자 명단: ${roster}`, `질문: ${transcript}`].join('\n');

  const response = await callAI(VOICE_QUERY_SYSTEM_PROMPT, userMessage);
  return normalizeVoiceQuery(parseVoiceQueryJson(response.content), patientNames);
}

/**
 * LLM 응답에서 JSON을 꺼낸다.
 * 코드펜스로 감싸거나 앞뒤에 설명을 붙이는 경우가 있어 방어적으로 처리한다.
 */
export function parseVoiceQueryJson(raw: string): unknown {
  const withoutFence = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    // 설명이 앞뒤에 붙은 경우 가장 바깥 중괄호 구간만 잘라 재시도한다.
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');
    if (start === -1 || end <= start) {
      throw new Error('음성 질문을 이해하지 못했습니다. 다시 말씀해주세요.');
    }
    try {
      return JSON.parse(withoutFence.slice(start, end + 1));
    } catch {
      throw new Error('음성 질문을 이해하지 못했습니다. 다시 말씀해주세요.');
    }
  }
}

/**
 * LLM 출력을 신뢰하지 않고 정규화한다.
 * 특히 환자 이름은 **실제 명단에 있는 값만** 통과시킨다 (없는 환자를 지어내지 못하도록).
 */
export function normalizeVoiceQuery(value: unknown, patientNames: string[]): ParsedVoiceQuery {
  const source = (typeof value === 'object' && value !== null ? value : {}) as Record<
    string,
    unknown
  >;

  const rawName = typeof source.patientName === 'string' ? source.patientName.trim() : '';
  const heardName = typeof source.heardName === 'string' ? source.heardName.trim() : '';
  // LLM이 명단 철자를 못 맞혔을 때를 대비해 들린 이름으로도 한 번 더 대조한다.
  const matched =
    matchRosterName(rawName, patientNames) ?? matchRosterName(heardName, patientNames);

  const rawType = typeof source.queryType === 'string' ? source.queryType.toLowerCase() : '';
  const queryType: VoiceQueryType =
    rawType === 'lab' || rawType === 'medication' ? rawType : 'unknown';

  const rawItem = typeof source.item === 'string' ? source.item.trim() : '';

  return {
    patientName: matched?.name ?? null,
    heardName: heardName || rawName || null,
    nameMatch: matched ? (matched.exact ? 'exact' : 'similar') : 'none',
    queryType,
    item: rawItem || null,
  };
}

// ─── Today 브리핑 / 알림 분석 ───

const BRIEFING_ANALYSIS_SYSTEM_PROMPT = `당신은 입원환자 담당 의사의 아침 회진을 돕는 의료 AI 어시스턴트입니다.
오늘의 알림·할 일·항생제·Lab 현황을 받아, 무엇부터 봐야 할지 정리합니다.

출력 형식:
1) 먼저 볼 환자 — 병실/이름과 이유를 한 줄씩 (최대 5명, 위험도 높은 순)
2) 함께 확인할 것 — 놓치기 쉬운 항목 (최대 3줄)
3) 오늘 특이사항 없음이면 그렇게 적으세요

규칙:
1. 주어진 정보에 없는 내용을 추측하거나 지어내지 마세요.
2. 처방을 지시하지 말고, 확인이 필요한 지점만 짚으세요.
3. 한국어로 간결하게. 약물명과 Lab 항목은 영어로.
4. 마크다운 사용하지 말고 일반 텍스트로 출력하세요.`;

/**
 * 오늘 현황을 요약해 "무엇부터 볼지" 제안한다.
 * 규칙 알림과 Today 큐를 함께 넘겨 우선순위 판단에 쓴다.
 */
export async function analyzeBriefing(context: {
  patientSummary: string;
  alerts: string;
  tasks: string;
  antibiotics: string;
  abnormalLabs: string;
}): Promise<string> {
  const userMessage = [
    `환자 현황: ${context.patientSummary}`,
    context.alerts ? `\n규칙 알림:\n${context.alerts}` : '',
    context.tasks ? `\n오늘 할 일:\n${context.tasks}` : '',
    context.antibiotics ? `\n항생제:\n${context.antibiotics}` : '',
    context.abnormalLabs ? `\n비정상 Lab:\n${context.abnormalLabs}` : '',
    '\n위 내용을 바탕으로 오늘 먼저 확인할 것을 정리해주세요.',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await callAI(BRIEFING_ANALYSIS_SYSTEM_PROMPT, userMessage);
  return response.content;
}

// ─── 간호사 대화 → 환자별 SOAP 분리 ───

const CONVERSATION_SEGMENT_SYSTEM_PROMPT = `당신은 병동에서 오간 대화(간호사 보고, 전화 인계 등)를 환자별로 나누어 경과기록 초안을 만드는 의료 AI입니다.

입력으로 (1) 대화 내용과 (2) 현재 담당 중인 환자 명단이 주어집니다.

할 일:
1. 대화를 환자 단위로 나눕니다. 한 대화에 여러 환자가 섞여 있을 수 있습니다.
2. 각 조각이 어떤 환자인지 찾습니다.
   - 음성 인식이나 받아쓰기로 이름이 부정확할 수 있습니다.
   - 반드시 **주어진 환자 명단 안에서** 가장 가까운 이름을 고르고, 명단에 있는 철자 그대로 출력하세요.
   - 환자를 특정할 수 없는 조각은 patientName을 null로 두세요. 명단에 없는 이름을 지어내지 마세요.
   - heardName에는 **대화에서 들린 이름을 그대로** 넣으세요 (명단에 없는 철자여도 괜찮습니다).
     patientName을 null로 두더라도 heardName은 채워야 합니다 — 코드가 발음으로 한 번 더 대조합니다.
3. 각 환자에 대해 S/O/A/P 네 줄로 정리합니다.
   - S(Subjective): 환자·보호자가 호소한 것
   - O(Objective): 관찰된 것, 측정치 (활력징후, 수치 등)
   - A(Assessment): 대화에서 드러난 평가
   - P(Plan): 언급된 처치·계획
   - 대화에 없는 항목은 빈 문자열로 두세요. **추측해서 채우지 마세요.**

출력 형식 — 아래 JSON 배열 **하나만** 출력하세요. 설명, 마크다운 코드펜스를 붙이지 마세요.
[{"patientName": string|null, "heardName": string|null, "excerpt": string, "subjective": string, "objective": string, "assessment": string, "plan": string}]

excerpt는 그 환자에 해당하는 대화 원문을 짧게 옮긴 것입니다(최대 두 문장).`;

export interface ConversationSegment {
  /** 명단에서 확정된 이름. 특정 못 하면 null */
  patientName: string | null;
  /** 대화에서 들린 이름 그대로 — 매칭 실패·유사 매칭일 때 사용자에게 보여준다 */
  heardName: string;
  /** 'exact' 철자 일치 · 'similar' 발음이 비슷해 연결(확인 필요) · 'none' 특정 실패 */
  nameMatch: NameMatchKind;
  excerpt: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

/**
 * 대화 내용을 환자별 SOAP 초안으로 나눈다.
 *
 * 음성 질의(`parseVoiceQuery`)와 같은 전략을 쓴다 — 활성 환자 명단을 컨텍스트로 넘겨
 * 이름 오인식을 보정하게 하되, 결과는 코드에서 명단과 대조해 검증한다.
 */
export async function segmentConversation(
  transcript: string,
  patientNames: string[]
): Promise<ConversationSegment[]> {
  const roster = patientNames.length > 0 ? patientNames.join(', ') : '(없음)';
  const userMessage = [`환자 명단: ${roster}`, `대화 내용:\n${transcript}`].join('\n\n');

  const response = await callAI(CONVERSATION_SEGMENT_SYSTEM_PROMPT, userMessage);
  return normalizeConversationSegments(parseVoiceQueryJson(response.content), patientNames);
}

/** LLM 출력을 신뢰하지 않고 정규화한다. 환자 이름은 실제 명단에 있는 값만 통과시킨다. */
export function normalizeConversationSegments(
  value: unknown,
  patientNames: string[]
): ConversationSegment[] {
  const list = Array.isArray(value) ? value : [value];

  return list
    .map((entry): ConversationSegment | null => {
      if (typeof entry !== 'object' || entry === null) return null;
      const source = entry as Record<string, unknown>;

      const rawName = readText(source.patientName);
      const heardName = readText(source.heardName) || rawName;
      // LLM이 명단 철자를 못 맞혔을 때를 대비해 들린 이름으로도 한 번 더 대조한다.
      const matched =
        matchRosterName(rawName, patientNames) ?? matchRosterName(heardName, patientNames);

      const segment: ConversationSegment = {
        patientName: matched?.name ?? null,
        heardName,
        nameMatch: matched ? (matched.exact ? 'exact' : 'similar') : 'none',
        excerpt: readText(source.excerpt),
        subjective: readText(source.subjective),
        objective: readText(source.objective),
        assessment: readText(source.assessment),
        plan: readText(source.plan),
      };

      // 아무 내용도 없는 조각은 버린다.
      const hasContent =
        segment.excerpt || segment.subjective || segment.objective || segment.assessment || segment.plan;
      return hasContent ? segment : null;
    })
    .filter((segment): segment is ConversationSegment => segment !== null);
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** SOAP 네 줄을 메모로 저장할 한 덩어리 텍스트로 만든다. */
export function formatSegmentAsNote(segment: ConversationSegment): string {
  return [
    segment.subjective && `S) ${segment.subjective}`,
    segment.objective && `O) ${segment.objective}`,
    segment.assessment && `A) ${segment.assessment}`,
    segment.plan && `P) ${segment.plan}`,
  ]
    .filter(Boolean)
    .join('\n');
}

// ─── 근거연결 (검색어 제안) ───

const EVIDENCE_SYSTEM_PROMPT = `당신은 입원환자 담당 의사가 근거를 찾을 때 **검색 방향을 잡아주는** 의료 AI입니다.

⚠️ 가장 중요한 규칙: **논문 제목, 저자, 저널명, 발행연도, DOI, PMID를 절대 만들어내지 마세요.**
당신은 문헌을 검색할 수 없습니다. 기억에 의존해 인용을 쓰면 존재하지 않는 논문을 지어내게 됩니다.
당신이 할 일은 "무엇을 어떤 말로 찾아봐야 하는지"를 알려주는 것뿐입니다.

주어진 환자 정보(진단/Problem List/투약/Lab)를 보고, 근거를 확인할 만한 주제를 고릅니다.

각 주제마다:
- title: 확인할 임상 질문 (한국어, 한 줄)
- rationale: 이 환자에게 왜 확인할 가치가 있는지 (한국어, 한 줄)
- keywords: 검색에 쓸 핵심 용어 3~5개 (영어 의학 용어)
- query: 실제 검색창에 넣을 영어 검색식 한 줄 (PubMed에 그대로 붙여넣을 수 있는 형태)
- guideline: 참고할 만한 **가이드라인 제정 기관/학회 이름** (예: "IDSA", "KDIGO", "대한신장학회"). 확실하지 않으면 빈 문자열.
  개별 가이드라인 문서의 제목이나 발행연도는 쓰지 마세요.

cautions에는 이 환자에서 근거를 적용할 때 주의할 점을 적습니다 (최대 3줄, 없으면 빈 배열).

출력 형식 — 아래 JSON 객체 **하나만** 출력하세요. 설명이나 코드펜스를 붙이지 마세요.
{"topics": [{"title": string, "rationale": string, "keywords": string[], "query": string, "guideline": string}], "cautions": string[]}

주제는 최대 4개로 제한하세요.`;

export interface EvidenceTopic {
  title: string;
  rationale: string;
  keywords: string[];
  query: string;
  guideline: string;
}

export interface EvidenceSuggestion {
  topics: EvidenceTopic[];
  cautions: string[];
}

/**
 * 환자 정보를 보고 **검색 방향**을 제안한다.
 *
 * 의도적으로 논문 인용을 만들지 않는다 — LLM은 문헌을 검색할 수 없고,
 * 기억으로 인용을 쓰면 존재하지 않는 논문을 지어낸다(임상 도구에서 특히 위험).
 * 대신 검색어와 검색식을 주고, 실제 결과는 사용자가 PubMed 등에서 직접 확인한다.
 */
export async function suggestEvidence(context: {
  patientSummary: string;
  problemList: string;
  medications: string;
  recentLab: string;
}): Promise<EvidenceSuggestion> {
  const userMessage = [
    `환자: ${context.patientSummary}`,
    context.problemList ? `\nProblem List:\n${context.problemList}` : '',
    context.medications ? `\n투약:\n${context.medications}` : '',
    context.recentLab ? `\n최근 Lab:\n${context.recentLab}` : '',
    '\n위 환자에서 근거를 확인할 만한 주제와 검색어를 제안해주세요.',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await callAI(EVIDENCE_SYSTEM_PROMPT, userMessage);
  return normalizeEvidenceSuggestion(parseVoiceQueryJson(response.content));
}

/** LLM 출력을 신뢰하지 않고 정규화한다. */
export function normalizeEvidenceSuggestion(value: unknown): EvidenceSuggestion {
  const source = (typeof value === 'object' && value !== null ? value : {}) as Record<
    string,
    unknown
  >;

  const topics = (Array.isArray(source.topics) ? source.topics : [])
    .map((entry): EvidenceTopic | null => {
      if (typeof entry !== 'object' || entry === null) return null;
      const item = entry as Record<string, unknown>;

      const title = readText(item.title);
      const query = readText(item.query);
      const keywords = (Array.isArray(item.keywords) ? item.keywords : [])
        .map(readText)
        .filter(Boolean);

      // 제목도 검색식도 없으면 쓸모가 없다.
      if (!title && !query && keywords.length === 0) return null;

      return {
        title: title || keywords.join(', '),
        rationale: readText(item.rationale),
        keywords,
        query: query || keywords.join(' AND '),
        guideline: readText(item.guideline),
      };
    })
    .filter((topic): topic is EvidenceTopic => topic !== null)
    .slice(0, 4);

  const cautions = (Array.isArray(source.cautions) ? source.cautions : [])
    .map(readText)
    .filter(Boolean)
    .slice(0, 3);

  return { topics, cautions };
}
