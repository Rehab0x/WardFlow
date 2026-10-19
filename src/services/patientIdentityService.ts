import {
  createPatientIdentityVault,
  getPatientIdentityVault,
  updatePatientIdentityPassphrase,
  type PatientIdentityVault,
} from '@/data/patientIdentityVault.repository';
import {
  deriveIdentityKeys,
  generateMasterSecret,
  generateRecoveryCode,
  generateSalt,
  IDENTITY_KDF_ITERATIONS,
  IdentityUnlockError,
  looksLikeRecoveryCode,
  toBase64,
  unwrapWithPassphrase,
  unwrapWithRecoveryCode,
  wrapWithPassphrase,
  wrapWithRecoveryCode,
} from '@/lib/patientIdentityCrypto';
import {
  forgetRememberedIdentityKey,
  forgetStoredIdentityKey,
  getIdentityKeyMode,
  getIdentityKeys,
  isIdentityKeyRemembered,
  lockIdentityKeys,
  type IdentityKeyMode,
  restoreIdentityKeys,
  unlockIdentityKeys,
} from '@/lib/patientIdentityKeyring';
import { computeRegistrationLookup, encodeLookupKey } from '@/lib/registrationLookup';

/**
 * 환자 식별정보 잠금 흐름 (TODO 2.19).
 *
 * 1. `prepareIdentityKeys` — 로그인 직후. 금고 상태를 보고, 이 기기에 저장된 키가 있으면 바로 연다
 * 2. 금고가 없으면 `setUpIdentityVault`(첫 설정), 있으면 `unlockIdentityVault`(암호문구 또는 복구 코드)
 */

export const MIN_PASSPHRASE_LENGTH = 8;
const KEY_CHECK_INPUT = 'wardflow-key-check';

export type IdentityPreparation =
  /** 금고 없음 — 첫 설정 화면 */
  | 'setup'
  /** 금고 있음, 키 없음 — 잠금 해제 화면 */
  | 'locked'
  | 'unlocked';

export async function prepareIdentityKeys(userId: string): Promise<IdentityPreparation> {
  const lookup = await getPatientIdentityVault(userId);
  if (lookup.status === 'none') return 'setup';

  if (getIdentityKeys() && (await matchesVault(lookup.vault))) return 'unlocked';

  const stored = await restoreIdentityKeys(userId);
  if (!stored) return 'locked';
  // 저장할 때 기억 여부는 이미 반영돼 있다 — 다시 쓰지 않도록 remember=false
  await unlockIdentityKeys(userId, stored, false);
  if (await matchesVault(lookup.vault)) return 'unlocked';

  // 금고를 새로 만든 뒤라면 예전 키가 남아 있을 수 있다
  forgetStoredIdentityKey(userId);
  return 'locked';
}

export interface IdentitySetupResult {
  /** 화면에 한 번만 보여주고 저장하지 않는다 */
  recoveryCode: string;
}

export async function setUpIdentityVault(
  userId: string,
  passphrase: string,
  remember: boolean
): Promise<IdentitySetupResult> {
  assertPassphrase(passphrase);
  const masterSecret = generateMasterSecret();
  const recoveryCode = generateRecoveryCode();
  const salt = generateSalt();
  const keys = await deriveIdentityKeys(masterSecret);

  await createPatientIdentityVault({
    ownerId: userId,
    kdfSalt: salt,
    kdfIterations: IDENTITY_KDF_ITERATIONS,
    passphraseWrappedKey: await wrapWithPassphrase(masterSecret, passphrase, salt, IDENTITY_KDF_ITERATIONS),
    recoveryWrappedKey: await wrapWithRecoveryCode(masterSecret, recoveryCode, recoverySalt(userId)),
    keyCheck: await computeRegistrationLookup(keys.lookupKey, KEY_CHECK_INPUT),
  });
  await unlockIdentityKeys(userId, masterSecret, remember);
  return { recoveryCode };
}

/** 입력이 복구 코드 모양이면 복구 코드로, 아니면 암호문구로 연다 */
export async function unlockIdentityVault(
  userId: string,
  secret: string,
  remember: boolean
): Promise<void> {
  const vault = await requireVault(userId);
  const masterSecret = looksLikeRecoveryCode(secret)
    ? await unwrapWithRecoveryCode(vault.recoveryWrappedKey, secret, recoverySalt(userId)).catch(
        () => unwrapWithPassphrase(vault.passphraseWrappedKey, secret, vault.kdfSalt, vault.kdfIterations)
      )
    : await unwrapWithPassphrase(vault.passphraseWrappedKey, secret, vault.kdfSalt, vault.kdfIterations);

  await unlockIdentityKeys(userId, masterSecret, remember);
}

export async function changeIdentityPassphrase(
  userId: string,
  currentPassphrase: string,
  nextPassphrase: string
): Promise<void> {
  assertPassphrase(nextPassphrase);
  const vault = await requireVault(userId);
  // 열려 있는 키가 있어도 현재 암호문구를 확인한다 — 잠깐 자리를 비운 PC에서 남이 바꾸지 못하게
  const masterSecret = await unwrapWithPassphrase(
    vault.passphraseWrappedKey,
    currentPassphrase,
    vault.kdfSalt,
    vault.kdfIterations
  );
  const salt = generateSalt();
  await updatePatientIdentityPassphrase(userId, {
    kdfSalt: salt,
    kdfIterations: IDENTITY_KDF_ITERATIONS,
    passphraseWrappedKey: await wrapWithPassphrase(
      masterSecret,
      nextPassphrase,
      salt,
      IDENTITY_KDF_ITERATIONS
    ),
  });
}

/** Vercel `PATIENT_LOOKUP_KEY`에 넣을 값 — 서버 Lab import가 등록번호로 환자를 찾을 때 쓴다 */
export function getServerLookupKey(): string | null {
  const keys = getIdentityKeys();
  return keys ? encodeLookupKey(keys.lookupKey) : null;
}

export interface IdentityStatus {
  mode: IdentityKeyMode;
  rememberedOnThisDevice: boolean;
}

export function getIdentityStatus(userId: string): IdentityStatus {
  return { mode: getIdentityKeyMode(), rememberedOnThisDevice: isIdentityKeyRemembered(userId) };
}

/** 이 탭의 키를 닫는다. 화면에 남은 환자 이름까지 지우려면 호출부가 새로고침한다 */
export function lockIdentityNow(options: { forgetThisDevice: boolean }) {
  lockIdentityKeys({ forget: options.forgetThisDevice });
}

export function forgetThisDevice(userId: string) {
  forgetRememberedIdentityKey(userId);
}

// ─────────────────────────────────────────────

async function requireVault(userId: string): Promise<PatientIdentityVault> {
  const lookup = await getPatientIdentityVault(userId);
  if (lookup.status !== 'ready') throw new Error('환자정보 암호가 아직 설정되지 않았습니다.');
  return lookup.vault;
}

async function matchesVault(vault: PatientIdentityVault): Promise<boolean> {
  const keys = getIdentityKeys();
  if (!keys) return false;
  return (await computeRegistrationLookup(keys.lookupKey, KEY_CHECK_INPUT)) === vault.keyCheck;
}

/** 복구 코드는 100비트 난수라 소금이 보안에 기여하는 바가 없다. 암호문구를 바꿔도 그대로 쓸 수 있게 고정한다 */
function recoverySalt(userId: string): string {
  return toBase64(new TextEncoder().encode(`wardflow-recovery:${userId}`));
}

function assertPassphrase(passphrase: string) {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new IdentityUnlockError(`암호문구는 ${MIN_PASSPHRASE_LENGTH}자 이상이어야 합니다.`);
  }
}
