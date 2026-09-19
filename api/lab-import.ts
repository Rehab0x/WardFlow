import { processStorageInboxFromApi } from '../src/services/server/storageLabImportApi.js';
import { checkRateLimit } from '../src/services/server/rateLimit.js';
import { maskErrorMessage, maskId } from '../src/services/server/logMasking.js';

declare const process: { env: Record<string, string | undefined> };

/**
 * 호출자당 허용량. 개인 자동화 에이전트가 주기적으로 호출하는 용도이므로
 * 넉넉하되 폭주는 막는 수준으로 잡는다. (rateLimit.ts의 인스턴스 메모리 한계 참고)
 */
const RATE_LIMIT = { windowMs: 60_000, max: 10 };

type VercelRequest = {
  method?: string;
  headers?: HeaderSource;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
};

type HeaderSource =
  | Record<string, string | string[] | undefined>
  | {
      get: (name: string) => string | null;
    };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Lab-Import-Key');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    // 인증은 fail-closed다. 키가 설정돼 있지 않으면 엔드포인트를 열지 않는다.
    // (예전에는 키가 없으면 인증을 통째로 건너뛰어, 환경변수 누락만으로
    //  서비스 롤 권한의 쓰기 엔드포인트가 공개되는 구조였다.)
    const configuredApiKey = process.env.LAB_IMPORT_API_KEY?.trim();
    if (!configuredApiKey) {
      console.error('[lab-import] LAB_IMPORT_API_KEY is not configured; refusing all requests.');
      res.status(503).json({ error: 'Lab import endpoint is not configured.' });
      return;
    }

    const providedKey =
      getHeader(req, 'x-lab-import-key') ?? getBearerToken(getHeader(req, 'authorization'));
    if (!providedKey || !timingSafeEquals(providedKey, configuredApiKey)) {
      console.warn('[lab-import] rejected request with missing/invalid key');
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    // 키가 확인된 뒤에 제한한다 — 인증 실패가 정상 호출자의 몫을 깎지 않도록.
    const limit = checkRateLimit(`key:${hashKey(providedKey)}`, RATE_LIMIT);
    res.setHeader('X-RateLimit-Limit', String(limit.limit));
    res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      console.warn('[lab-import] rate limited');
      res.status(429).json({
        error: 'Too many requests. Please retry later.',
        retryAfterSeconds: limit.retryAfterSeconds,
      });
      return;
    }

    const body = parseBody(req.body);
    const syncKey = String(
      readInput(body, 'syncKey') ?? readInput(req.query ?? {}, 'syncKey') ?? ''
    );
    const deleteAfterProcessing = toBoolean(
      readInput(body, 'deleteAfterProcessing') ??
        readInput(req.query ?? {}, 'deleteAfterProcessing') ??
        readInput(body, 'deleteFiles') ??
        readInput(req.query ?? {}, 'deleteFiles')
    );

    const startedAt = Date.now();
    const result = await processStorageInboxFromApi({
      syncKey,
      deleteAfterProcessing,
    });

    // 집계 수치만 남긴다. 환자 이름·등록번호·파일명은 로그로 내보내지 않는다.
    console.info(
      `[lab-import] syncKey=${maskId(syncKey)} files=${result.totalFiles} ok=${result.successCount} ` +
        `failed=${result.failedCount} unmatched=${result.unmatchedCount} ` +
        `patients=${result.savedPatients} items=${result.savedItems} ${Date.now() - startedAt}ms`
    );

    res.status(200).json(result);
  } catch (error) {
    // 원문에 환자 식별정보나 내부 구조가 섞일 수 있으므로 마스킹해 로그에만 남기고,
    // 응답에는 입력 검증 수준의 메시지만 돌려준다.
    console.error(`[lab-import] failed: ${maskErrorMessage(error)}`);
    res.status(400).json({ error: toClientError(error) });
  }
}

/**
 * 호출자에게 돌려줄 메시지. 입력을 고쳐서 해결할 수 있는 오류만 원문을 쓰고,
 * 그 밖의 내부 오류는 일반 문구로 바꾼다.
 */
function toClientError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const inputErrors = [
    'syncKey is required.',
    'syncKey may only contain letters, numbers, dots, underscores, and hyphens.',
  ];
  return inputErrors.includes(message) ? message : 'Lab import failed. See server logs for details.';
}

/** 길이 노출과 조기 종료를 피하는 상수 시간 비교 */
function timingSafeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** rate limit 버킷 키용 — 원본 키를 메모리에 그대로 들고 있지 않기 위해 */
function hashKey(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readInput(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

function getHeader(req: VercelRequest, name: string) {
  const headers = req.headers;
  if (!headers) return undefined;

  if ('get' in headers && typeof headers.get === 'function') {
    return headers.get(name)?.trim() || undefined;
  }

  const headerMap = headers as Record<string, string | string[] | undefined>;
  const lowerName = name.toLowerCase();
  const key = Object.keys(headerMap).find((headerName) => headerName.toLowerCase() === lowerName);
  const value = key ? headerMap[key] : undefined;
  const firstValue = Array.isArray(value) ? value[0] : value;
  return firstValue?.trim() || undefined;
}

function getBearerToken(value: string | undefined) {
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());
}
