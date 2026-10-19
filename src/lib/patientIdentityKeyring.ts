import {
  deriveIdentityKeys,
  fromBase64,
  toBase64,
  type PatientIdentityKeys,
} from './patientIdentityCrypto';

/**
 * 이 기기가 지금 들고 있는 환자 식별정보 키.
 *
 * - 메모리에만 있으면 새로고침 시 다시 물어야 하므로, 탭이 살아 있는 동안은 sessionStorage에 둔다
 * - "이 기기 기억"을 고르면 localStorage에도 둔다 — 그 브라우저 프로필에서는 다시 묻지 않는다
 *   (여러 사람이 쓰는 병원 PC에서는 고르지 않도록 화면에서 안내한다)
 * - 저장소 키에 사용자 ID를 넣어, 같은 브라우저에서 다른 계정으로 로그인해도 섞이지 않게 한다
 *
 * 키가 없으면(`locked`) 환자 데이터를 읽고 쓰면 안 된다.
 */
export type IdentityKeyMode = 'locked' | 'unlocked';

const STORAGE_PREFIX = 'wardflow.patientIdentityKey.';

let current: { userId: string; keys: PatientIdentityKeys } | null = null;

export function getIdentityKeyMode(): IdentityKeyMode {
  return current ? 'unlocked' : 'locked';
}

export function getIdentityKeys(): PatientIdentityKeys | null {
  return current?.keys ?? null;
}

export async function unlockIdentityKeys(
  userId: string,
  masterSecret: Uint8Array,
  remember: boolean
): Promise<void> {
  const keys = await deriveIdentityKeys(masterSecret);
  current = { userId, keys };

  const encoded = toBase64(masterSecret);
  safeStorage(() => sessionStorage.setItem(storageKey(userId), encoded));
  if (remember) safeStorage(() => localStorage.setItem(storageKey(userId), encoded));
}

/**
 * 이 기기에 남겨 둔 키로 다시 연다.
 * @returns 저장된 키가 있었는지. 키가 맞는지는 호출부가 금고로 확인한다
 */
export async function restoreIdentityKeys(userId: string): Promise<Uint8Array | null> {
  const stored =
    safeStorage(() => sessionStorage.getItem(storageKey(userId))) ??
    safeStorage(() => localStorage.getItem(storageKey(userId)));
  if (!stored) return null;
  try {
    return fromBase64(stored);
  } catch {
    return null;
  }
}

export function isIdentityKeyRemembered(userId: string): boolean {
  return Boolean(safeStorage(() => localStorage.getItem(storageKey(userId))));
}

/**
 * @param forget true면 "이 기기 기억"까지 지운다. 로그아웃은 false — 기억해 둔 기기는 다음 로그인에 다시 묻지 않는다
 */
export function lockIdentityKeys({ forget }: { forget: boolean }) {
  const userId = current?.userId;
  current = null;
  if (!userId) return;
  safeStorage(() => sessionStorage.removeItem(storageKey(userId)));
  if (forget) safeStorage(() => localStorage.removeItem(storageKey(userId)));
}

/** "이 기기 기억"만 해제 — 지금 탭은 열린 채로 둔다 */
export function forgetRememberedIdentityKey(userId: string) {
  safeStorage(() => localStorage.removeItem(storageKey(userId)));
}

/** 특정 사용자의 저장 키 삭제 — 저장된 키가 금고와 안 맞을 때 */
export function forgetStoredIdentityKey(userId: string) {
  if (current?.userId === userId) current = null;
  safeStorage(() => sessionStorage.removeItem(storageKey(userId)));
  safeStorage(() => localStorage.removeItem(storageKey(userId)));
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function safeStorage<T>(run: () => T): T | null {
  try {
    return run() ?? null;
  } catch {
    return null;
  }
}

/** 테스트 전용 */
export function __resetIdentityKeyringForTests() {
  current = null;
}
