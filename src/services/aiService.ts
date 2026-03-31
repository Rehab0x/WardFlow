/**
 * AI Service — Multi-LLM Support
 *
 * Claude (Anthropic), GPT (OpenAI), Gemini (Google), Grok (xAI)
 * 통합 인터페이스로 호출
 */

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
