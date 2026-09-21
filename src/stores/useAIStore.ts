import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LLMProvider = 'claude' | 'gpt' | 'gemini' | 'grok';

export interface LLMModelOption {
  id: string;
  name: string;
}

/**
 * 제공사별 모델 목록.
 *
 * 모델은 자주 바뀌고 옛 모델은 조용히 은퇴한다. 목록에서 모델을 빼면
 * **이미 그 모델을 저장해 둔 브라우저**가 문제가 되므로(localStorage에 남는다),
 * 하이드레이션 때 목록에 없는 모델은 해당 제공사의 기본값으로 되돌린다.
 * 가격은 자주 바뀌니 여기 적지 않는다 — 각 제공사 요금 페이지를 볼 것.
 */
export const LLM_PROVIDERS: Record<LLMProvider, {
  name: string;
  models: LLMModelOption[];
  apiUrl: string;
}> = {
  claude: {
    name: 'Claude (Anthropic)',
    models: [
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
      { id: 'claude-opus-5', name: 'Claude Opus 5' },
    ],
    apiUrl: 'https://api.anthropic.com/v1/messages',
  },
  gpt: {
    name: 'GPT (OpenAI)',
    models: [{ id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna' }],
    apiUrl: 'https://api.openai.com/v1/chat/completions',
  },
  gemini: {
    name: 'Gemini (Google)',
    models: [
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
    ],
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  },
  grok: {
    name: 'Grok (xAI)',
    models: [
      { id: 'grok-4.6', name: 'Grok 4.6' },
      { id: 'grok-4.3', name: 'Grok 4.3' },
    ],
    apiUrl: 'https://api.x.ai/v1/chat/completions',
  },
};

/** Whisper(음성 인식)는 OpenAI 전용이므로, 위에서 고른 텍스트 LLM과 무관한 별도 키가 필요하다. */
export const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
export const WHISPER_MODEL = 'whisper-1';

interface AIStore {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  /** OpenAI Whisper 전용 키. provider 선택과 무관하다. */
  whisperApiKey: string;
  setProvider: (provider: LLMProvider) => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  setWhisperApiKey: (key: string) => void;
  isConfigured: () => boolean;
  isSttConfigured: () => boolean;
}

function getDefaultModel(provider: LLMProvider): string {
  return LLM_PROVIDERS[provider].models[0]?.id || '';
}

function isModelForProvider(provider: LLMProvider, model: string): boolean {
  return LLM_PROVIDERS[provider].models.some((item) => item.id === model);
}

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      provider: 'claude',
      apiKey: '',
      model: getDefaultModel('claude'),
      whisperApiKey: '',

      setProvider: (provider) => {
        const currentModel = get().model;
        set({ provider, model: isModelForProvider(provider, currentModel) ? currentModel : getDefaultModel(provider) });
      },

      setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),

      setWhisperApiKey: (whisperApiKey) => set({ whisperApiKey: whisperApiKey.trim() }),

      setModel: (model) => {
        const { provider } = get();
        set({ model: isModelForProvider(provider, model) ? model : getDefaultModel(provider) });
      },

      isConfigured: () => {
        const { apiKey } = get();
        return apiKey.trim().length > 10;
      },

      isSttConfigured: () => {
        const { whisperApiKey } = get();
        return whisperApiKey.trim().length > 10;
      },
    }),
    {
      name: 'wardflow-ai-settings',
      // 저장돼 있던 모델이 목록에서 사라졌으면(은퇴·교체) 기본값으로 되돌린다.
      // 그대로 두면 설정 화면에는 아무것도 선택돼 있지 않은데 호출은 옛 모델로 나간다.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!isModelForProvider(state.provider, state.model)) {
          state.model = getDefaultModel(state.provider);
        }
      },
    }
  )
);
