import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimits } from '../src/services/server/rateLimit';

const processStorageInboxFromApi = vi.hoisted(() => vi.fn());
vi.mock('../src/services/server/storageLabImportApi.js', () => ({ processStorageInboxFromApi }));

const { default: handler } = await import('./lab-import');

function makeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
    end() {},
  };
  return res;
}

const summary = {
  syncKey: 'k',
  deleteAfterProcessing: false,
  totalFiles: 1,
  successCount: 1,
  failedCount: 0,
  unmatchedCount: 0,
  savedPatients: 1,
  savedItems: 5,
  failedPatients: 0,
  errors: [],
  deletedFiles: 0,
  deleteErrors: [],
  details: [],
};

const post = (headers: Record<string, string> = {}, body: unknown = { syncKey: 'ward-a' }) => ({
  method: 'POST',
  headers,
  body,
});

describe('POST /api/lab-import', () => {
  beforeEach(() => {
    resetRateLimits();
    processStorageInboxFromApi.mockReset().mockResolvedValue(summary);
    process.env.LAB_IMPORT_API_KEY = 'secret-key';
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('refuses every request when no API key is configured (fail closed)', async () => {
    delete process.env.LAB_IMPORT_API_KEY;
    const res = makeRes();

    await handler(post({ 'x-lab-import-key': 'anything' }), res);

    expect(res.statusCode).toBe(503);
    expect(processStorageInboxFromApi).not.toHaveBeenCalled();
  });

  it('rejects a missing or wrong key', async () => {
    const noKey = makeRes();
    await handler(post(), noKey);
    expect(noKey.statusCode).toBe(401);

    const wrongKey = makeRes();
    await handler(post({ 'x-lab-import-key': 'nope' }), wrongKey);
    expect(wrongKey.statusCode).toBe(401);

    expect(processStorageInboxFromApi).not.toHaveBeenCalled();
  });

  it('accepts the key via header or bearer token', async () => {
    const viaHeader = makeRes();
    await handler(post({ 'x-lab-import-key': 'secret-key' }), viaHeader);
    expect(viaHeader.statusCode).toBe(200);

    const viaBearer = makeRes();
    await handler(post({ authorization: 'Bearer secret-key' }), viaBearer);
    expect(viaBearer.statusCode).toBe(200);
  });

  it('rate limits an authenticated caller and reports Retry-After', async () => {
    for (let i = 0; i < 10; i++) {
      const ok = makeRes();
      await handler(post({ 'x-lab-import-key': 'secret-key' }), ok);
      expect(ok.statusCode).toBe(200);
    }

    const blocked = makeRes();
    await handler(post({ 'x-lab-import-key': 'secret-key' }), blocked);

    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers['Retry-After'])).toBeGreaterThan(0);
    expect(processStorageInboxFromApi).toHaveBeenCalledTimes(10);
  });

  it('does not let failed auth consume the caller budget', async () => {
    for (let i = 0; i < 20; i++) {
      await handler(post({ 'x-lab-import-key': 'nope' }), makeRes());
    }

    const ok = makeRes();
    await handler(post({ 'x-lab-import-key': 'secret-key' }), ok);
    expect(ok.statusCode).toBe(200);
  });

  it('keeps internal error detail out of the response', async () => {
    processStorageInboxFromApi.mockRejectedValue(
      new Error('Patient lookup failed: column "x" does not exist for 0000004532')
    );
    const res = makeRes();

    await handler(post({ 'x-lab-import-key': 'secret-key' }), res);

    expect(res.statusCode).toBe(400);
    const message = String((res.body as { error: string }).error);
    expect(message).not.toContain('column');
    expect(message).not.toContain('0000004532');
  });

  it('still returns actionable input errors', async () => {
    processStorageInboxFromApi.mockRejectedValue(new Error('syncKey is required.'));
    const res = makeRes();

    await handler(post({ 'x-lab-import-key': 'secret-key' }, {}), res);

    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toBe('syncKey is required.');
  });

  it('never writes patient identifiers to the log', async () => {
    const infoSpy = vi.mocked(console.info);
    await handler(post({ 'x-lab-import-key': 'secret-key' }, { syncKey: 'ward-a-0000004532' }), makeRes());

    const logged = infoSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).not.toContain('0000004532');
    expect(logged).toContain('files=1');
  });

  it('rejects non-POST methods', async () => {
    const res = makeRes();
    await handler({ method: 'GET', headers: {}, body: undefined }, res);
    expect(res.statusCode).toBe(405);
  });
});
