import { processStorageInboxFromApi } from '../src/services/server/storageLabImportApi';

declare const process: { env: Record<string, string | undefined> };

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

    const configuredApiKey = process.env.LAB_IMPORT_API_KEY?.trim();
    if (configuredApiKey) {
      const providedKey =
        getHeader(req, 'x-lab-import-key') ?? getBearerToken(getHeader(req, 'authorization'));
      if (providedKey !== configuredApiKey) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }
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

    const result = await processStorageInboxFromApi({
      syncKey,
      deleteAfterProcessing,
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
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
