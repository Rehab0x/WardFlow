import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LLMProvider = 'claude' | 'gpt' | 'gemini' | 'grok';

export interface LLMModelOption {
  id: string;
  name: string;
}

export const LLM_PROVIDERS: Record<LLMProvider, {
  name: string;
  models: LLMModelOption[];
  apiUrl: string;
}> = {
  claude: {
    name: 'Claude (Anthropic)',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-haiku-4-20250414', name: 'Claude Haiku 4' },
    ],
    apiUrl: 'https://api.anthropic.com/v1/messages',
  },
  gpt: {
    name: 'GPT (OpenAI)',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
    apiUrl: 'https://api.openai.com/v1/chat/completions',
  },
  gemini: {
    name: 'Gemini (Google)',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    ],
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  },
  grok: {
    name: 'Grok (xAI)',
    models: [
      { id: 'grok-3', name: 'Grok 3' },
      { id: 'grok-3-mini', name: 'Grok 3 Mini' },
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
      model: 'claude-sonnet-4-20250514',
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
    }
  )
);
