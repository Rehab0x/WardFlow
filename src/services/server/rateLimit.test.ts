import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { checkRateLimit, resetRateLimits } from './rateLimit';

const options = { windowMs: 60_000, max: 3 };

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 19, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('allows calls up to the limit and reports the remaining budget', () => {
    expect(checkRateLimit('k', options)).toMatchObject({ allowed: true, remaining: 2 });
    expect(checkRateLimit('k', options)).toMatchObject({ allowed: true, remaining: 1 });
    expect(checkRateLimit('k', options)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it('rejects once the limit is reached and reports when to retry', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('k', options);

    const blocked = checkRateLimit('k', options);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('counts each caller separately', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', options);

    expect(checkRateLimit('a', options).allowed).toBe(false);
    expect(checkRateLimit('b', options).allowed).toBe(true);
  });

  it('lets the window slide so calls recover over time', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('k', options);
    expect(checkRateLimit('k', options).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit('k', options)).toMatchObject({ allowed: true, remaining: 2 });
  });
});
