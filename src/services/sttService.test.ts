import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SttError, transcribeAudio } from './sttService';
import { useAIStore } from '@/stores/useAIStore';

describe('transcribeAudio', () => {
  beforeEach(() => {
    useAIStore.setState({ whisperApiKey: 'sk-test-key-that-is-long' });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    useAIStore.setState({ whisperApiKey: '' });
  });

  it('refuses before a key is configured', async () => {
    useAIStore.setState({ whisperApiKey: '' });
    await expect(transcribeAudio(new Blob(['x']))).rejects.toMatchObject({ stage: 'config' });
  });

  it('sends the audio with the Korean language and medical prompt hints', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: '  장영임 소듐 어땠지  ' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const text = await transcribeAudio(new Blob(['audio']));

    expect(text).toBe('장영임 소듐 어땠지');
    const init = fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string>; body: FormData };
    expect(init.headers.Authorization).toBe('Bearer sk-test-key-that-is-long');
    const form = init.body;
    expect(form.get('model')).toBe('whisper-1');
    expect(form.get('language')).toBe('ko');
    expect(String(form.get('prompt'))).toContain('크레아티닌');
  });

  it('maps an invalid key to a clear message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => '' }));
    await expect(transcribeAudio(new Blob(['x']))).rejects.toThrow(/키가 올바르지 않습니다/);
  });

  it('maps rate limiting and server errors separately', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => '' }));
    await expect(transcribeAudio(new Blob(['x']))).rejects.toThrow(/너무 잦습니다/);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => '' }));
    await expect(transcribeAudio(new Blob(['x']))).rejects.toThrow(/일시적인 문제/);
  });

  it('reports a network failure as a transcription-stage error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(transcribeAudio(new Blob(['x']))).rejects.toMatchObject({
      stage: 'transcription',
    });
  });

  it('treats an empty transcript as a failure worth retrying', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ text: '   ' }) }));
    await expect(transcribeAudio(new Blob(['x']))).rejects.toThrow(/인식하지 못했습니다/);
  });

  it('is an SttError so the UI can branch on the stage', async () => {
    useAIStore.setState({ whisperApiKey: '' });
    await expect(transcribeAudio(new Blob(['x']))).rejects.toBeInstanceOf(SttError);
  });
});
