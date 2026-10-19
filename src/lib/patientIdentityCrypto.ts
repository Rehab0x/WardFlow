/**
 * 환자 식별정보(이름 · 등록번호 · 생년월일) 암호화.
 *
 * 키 구조
 * - **마스터 키**: 기기에서 만든 32바이트 난수. Supabase로는 원문이 가지 않는다
 * - 마스터 키를 HKDF로 나눠 **암호화 키**(AES-GCM)와 **조회 키**(등록번호 HMAC, `registrationLookup`)를 만든다
 * - 마스터 키는 ① 사용자 암호문구(PBKDF2) ② 복구 코드 — 두 가지로 각각 감싸서(wrap) DB 금고에 둔다.
 *   둘 중 하나만 있으면 다른 기기에서도 풀 수 있고, 둘 다 잃으면 **복구할 방법이 없다**
 *
 * 암호문 형식: `v1.<iv base64>.<ciphertext base64>`
 */

export const IDENTITY_KDF_ITERATIONS = 600_000;
/** 복구 코드는 100비트 난수라 느린 KDF가 필요 없다 */
const RECOVERY_KDF_ITERATIONS = 10_000;
const FORMAT_VERSION = 'v1';

export interface PatientIdentity {
  name: string;
  registrationNumber: string;
  /** YYYY-MM-DD */
  birthDate: string;
}

export interface PatientIdentityKeys {
  encryptionKey: CryptoKey;
  lookupKey: Uint8Array;
}

/** 암호문구/복구 코드가 틀렸거나 감싼 키가 손상됨 */
export class IdentityUnlockError extends Error {
  constructor(message = '암호문구 또는 복구 코드가 올바르지 않습니다.') {
    super(message);
    this.name = 'IdentityUnlockError';
  }
}

export function generateMasterSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function generateSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveIdentityKeys(masterSecret: Uint8Array): Promise<PatientIdentityKeys> {
  const base = await crypto.subtle.importKey('raw', buffer(masterSecret), 'HKDF', false, [
    'deriveBits',
  ]);
  const derive = async (info: string) =>
    new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt: new ArrayBuffer(0), info: buffer(utf8(info)) },
        base,
        256
      )
    );

  const encryptionBits = await derive('wardflow/patient-identity/encryption/v1');
  const encryptionKey = await crypto.subtle.importKey(
    'raw',
    buffer(encryptionBits),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );
  return { encryptionKey, lookupKey: await derive('wardflow/patient-identity/lookup/v1') };
}

// ─────────────────────────────────────────────
// 마스터 키 감싸기
// ─────────────────────────────────────────────

export async function wrapWithPassphrase(
  masterSecret: Uint8Array,
  passphrase: string,
  salt: string,
  iterations = IDENTITY_KDF_ITERATIONS
): Promise<string> {
  const key = await deriveWrappingKey(passphrase, salt, iterations);
  return seal(key, masterSecret);
}

export async function unwrapWithPassphrase(
  wrapped: string,
  passphrase: string,
  salt: string,
  iterations = IDENTITY_KDF_ITERATIONS
): Promise<Uint8Array> {
  const key = await deriveWrappingKey(passphrase, salt, iterations);
  return open(key, wrapped).catch(() => {
    throw new IdentityUnlockError();
  });
}

export function wrapWithRecoveryCode(masterSecret: Uint8Array, code: string, salt: string) {
  return wrapWithPassphrase(masterSecret, normalizeRecoveryCode(code), salt, RECOVERY_KDF_ITERATIONS);
}

export function unwrapWithRecoveryCode(wrapped: string, code: string, salt: string) {
  return unwrapWithPassphrase(wrapped, normalizeRecoveryCode(code), salt, RECOVERY_KDF_ITERATIONS);
}

// ─────────────────────────────────────────────
// 복구 코드 — 20바이트를 base32로, 4자씩 끊어 보여준다 (XXXX-XXXX-…)
// ─────────────────────────────────────────────

const BASE32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 I·O·0·1 제외

export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out.match(/.{1,4}/g)?.join('-') ?? out;
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function looksLikeRecoveryCode(value: string): boolean {
  const normalized = normalizeRecoveryCode(value);
  return normalized.length === 32 && [...normalized].every((char) => BASE32.includes(char));
}

// ─────────────────────────────────────────────
// 환자 식별정보
// ─────────────────────────────────────────────

/**
 * 환자 ID를 추가 인증 데이터(AAD)로 묶는다 — DB에서 두 환자의 암호문을 서로 바꿔 넣으면 복호화가 실패한다.
 */
export async function encryptPatientIdentity(
  keys: PatientIdentityKeys,
  patientId: string,
  identity: PatientIdentity
): Promise<string> {
  const payload = JSON.stringify({
    n: identity.name,
    r: identity.registrationNumber,
    b: identity.birthDate,
  });
  return seal(keys.encryptionKey, utf8(payload), utf8(patientId));
}

export async function decryptPatientIdentity(
  keys: PatientIdentityKeys,
  patientId: string,
  ciphertext: string
): Promise<PatientIdentity> {
  const bytes = await open(keys.encryptionKey, ciphertext, utf8(patientId));
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { n?: unknown; r?: unknown; b?: unknown };
  return {
    name: typeof parsed.n === 'string' ? parsed.n : '',
    registrationNumber: typeof parsed.r === 'string' ? parsed.r : '',
    birthDate: typeof parsed.b === 'string' ? parsed.b : '',
  };
}

// ─────────────────────────────────────────────
// 내부
// ─────────────────────────────────────────────

async function deriveWrappingKey(passphrase: string, salt: string, iterations: number) {
  const base = await crypto.subtle.importKey('raw', buffer(utf8(passphrase)), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: buffer(fromBase64(salt)), iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function seal(key: CryptoKey, plaintext: Uint8Array, aad?: Uint8Array): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: buffer(iv), ...(aad ? { additionalData: buffer(aad) } : {}) },
    key,
    buffer(plaintext)
  );
  return [FORMAT_VERSION, toBase64(iv), toBase64(new Uint8Array(ciphertext))].join('.');
}

async function open(key: CryptoKey, sealed: string, aad?: Uint8Array): Promise<Uint8Array> {
  const [version, iv, ciphertext] = sealed.split('.');
  if (version !== FORMAT_VERSION || !iv || !ciphertext) {
    throw new Error('Unsupported identity ciphertext format.');
  }
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: buffer(fromBase64(iv)), ...(aad ? { additionalData: buffer(aad) } : {}) },
    key,
    buffer(fromBase64(ciphertext))
  );
  return new Uint8Array(plaintext);
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
