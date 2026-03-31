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

interface AIStore {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  setProvider: (provider: LLMProvider) => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  isConfigured: () => boolean;
}

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      provider: 'claude',
      apiKey: '',
      model: 'claude-sonnet-4-20250514',

      setProvider: (provider) => {
        const firstModel = LLM_PROVIDERS[provider].models[0]?.id || '';
        set({ provider, model: firstModel });
      },

      setApiKey: (apiKey) => set({ apiKey }),

      setModel: (model) => set({ model }),

      isConfigured: () => {
        const { apiKey } = get();
        return apiKey.length > 10;
      },
    }),
    {
      name: 'wardflow-ai-settings',
    }
  )
);
