import { normalizeRegistrationNumber } from './registrationNumber.js';

/**
 * 등록번호 조회키 (blind index).
 *
 * DB에는 등록번호 원문 대신 `HMAC-SHA256(조회키, 정규화한 등록번호)`만 둔다.
 * 등록번호는 자릿수가 적어 그냥 해시하면 전수 대입으로 바로 풀리므로, **비밀 키가 있는 HMAC**이어야 한다.
 * 같은 키를 가진 쪽(기기 · Vercel Lab import 서버)만 "이 번호의 환자가 누구인지" 찾을 수 있다.
 *
 * 서버(`services/server`)에서도 import하므로 `@/` 별칭이나 브라우저 전용 API를 쓰지 않는다.
 *
 * @returns 소문자 hex. 등록번호가 비어 있으면 `''`
 */
export async function computeRegistrationLookup(
  lookupKey: Uint8Array,
  registrationNumber: string | undefined | null
): Promise<string> {
  const normalized = normalizeRegistrationNumber(registrationNumber);
  if (!normalized) return '';

  const key = await crypto.subtle.importKey(
    'raw',
    copyToArrayBuffer(lookupKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    copyToArrayBuffer(new TextEncoder().encode(normalized))
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

/** 조회키는 base64(url)로 주고받는다 — 설정 화면 표시, Vercel 환경변수 */
export function encodeLookupKey(lookupKey: Uint8Array): string {
  let binary = '';
  for (const byte of lookupKey) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** @returns 32바이트 키, 형식이 틀리면 `null` */
export function decodeLookupKey(value: string | undefined | null): Uint8Array | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  try {
    const base64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return bytes.length === 32 ? bytes : null;
  } catch {
    return null;
  }
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}
