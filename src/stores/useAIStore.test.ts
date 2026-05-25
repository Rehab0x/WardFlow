import { beforeEach, describe, expect, it } from 'vitest';
import { useAIStore } from './useAIStore';

describe('useAIStore', () => {
  beforeEach(() => {
    useAIStore.setState({
      provider: 'claude',
      apiKey: '',
      model: 'claude-sonnet-4-20250514',
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

    expect(useAIStore.getState().model).toBe('gpt-4o');
  });
});

