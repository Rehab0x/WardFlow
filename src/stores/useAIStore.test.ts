import { beforeEach, describe, expect, it } from 'vitest';
import { LLM_PROVIDERS, useAIStore } from './useAIStore';

describe('useAIStore', () => {
  beforeEach(() => {
    useAIStore.setState({
      provider: 'claude',
      apiKey: '',
      model: LLM_PROVIDERS.claude.models[0]!.id,
    });
  });

  it('trims API keys before storing and checking configuration', () => {
    useAIStore.getState().setApiKey('   test-api-key-value   ');

    expect(useAIStore.getState().apiKey).toBe('test-api-key-value');
    expect(useAIStore.getState().isConfigured()).toBe(true);
  });

  it('falls back to the provider default when an invalid model is selected', () => {
    useAIStore.getState().setProvider('gpt');
    useAIStore.getState().setModel('not-a-model');

    expect(useAIStore.getState().model).toBe(LLM_PROVIDERS.gpt.models[0]!.id);
  });

  it('switches to the new provider default when the current model belongs elsewhere', () => {
    useAIStore.getState().setProvider('gemini');
    expect(useAIStore.getState().model).toBe('gemini-3.5-flash-lite');
  });

  it('drops a model that was retired from the list', () => {
    // 브라우저에 gpt-4o가 저장된 채로 목록이 갱신된 상황
    useAIStore.setState({ provider: 'gpt', model: 'gpt-4o' });
    useAIStore.getState().setModel('gpt-4o');

    expect(useAIStore.getState().model).toBe('gpt-5.6-luna');
  });

  it('keeps every listed model id non-empty and unique per provider', () => {
    for (const provider of Object.values(LLM_PROVIDERS)) {
      const ids = provider.models.map((model) => model.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.every((id) => id.trim().length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

