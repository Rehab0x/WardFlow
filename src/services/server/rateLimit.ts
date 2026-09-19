/**
 * 서버리스 함수용 간단한 슬라이딩 윈도우 rate limiter.
 *
 * ⚠️ **한계**: 상태를 인스턴스 메모리에 둔다. Vercel이 동시에 여러 인스턴스를 띄우면
 * 인스턴스마다 따로 카운트되므로 전역 상한을 보장하지 못한다.
 * 이 엔드포인트는 API 키로 먼저 보호되고 개인 자동화 에이전트가 호출하는 용도라
 * "실수로 반복 호출하거나 키가 샜을 때 폭주를 늦추는" 수준을 목표로 한다.
 * 엄격한 전역 제한이 필요해지면 Supabase 테이블이나 Upstash 같은 외부 저장소로 옮길 것.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** 현재 윈도우에서 남은 호출 수 */
  remaining: number;
  /** 거부된 경우 다시 시도 가능해지기까지의 초 */
  retryAfterSeconds: number;
  limit: number;
}

export interface RateLimitOptions {
  /** 윈도우 길이(ms) */
  windowMs: number;
  /** 윈도우당 허용 호출 수 */
  max: number;
}

const buckets = new Map<string, number[]>();

/** 오래된 버킷이 무한정 쌓이지 않도록 정리하는 기준 */
const MAX_TRACKED_KEYS = 500;

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const { windowMs, max } = options;
  const now = Date.now();
  const windowStart = now - windowMs;

  const hits = (buckets.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

  if (hits.length >= max) {
    const oldest = hits[0] ?? now;
    buckets.set(key, hits);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
      limit: max,
    };
  }

  hits.push(now);
  buckets.set(key, hits);
  pruneIdleBuckets(windowStart);

  return { allowed: true, remaining: max - hits.length, retryAfterSeconds: 0, limit: max };
}

function pruneIdleBuckets(windowStart: number) {
  if (buckets.size <= MAX_TRACKED_KEYS) return;
  for (const [key, hits] of buckets) {
    const live = hits.filter((timestamp) => timestamp > windowStart);
    if (live.length === 0) buckets.delete(key);
    else buckets.set(key, live);
  }
}

/** 테스트용 — 버킷 초기화 */
export function resetRateLimits() {
  buckets.clear();
}
