import { describe, expect, it } from 'vitest';
import {
  decryptPatientIdentity,
  deriveIdentityKeys,
  encryptPatientIdentity,
  generateMasterSecret,
  generateRecoveryCode,
  generateSalt,
  IdentityUnlockError,
  looksLikeRecoveryCode,
  unwrapWithPassphrase,
  unwrapWithRecoveryCode,
  wrapWithPassphrase,
  wrapWithRecoveryCode,
} from './patientIdentityCrypto';
import { computeRegistrationLookup, decodeLookupKey, encodeLookupKey } from './registrationLookup';

const identity = { name: '이몽룡', registrationNumber: '0004532', birthDate: '1950-03-01' };
// 테스트에서는 KDF 반복 수를 낮춰 속도를 맞춘다 (형식·정확성만 본다)
const FAST = 1_000;

describe('patient identity encryption', () => {
  it('round-trips identity and never leaves plaintext in the ciphertext', async () => {
    const keys = await deriveIdentityKeys(generateMasterSecret());
    const sealed = await encryptPatientIdentity(keys, 'p1', identity);

    expect(sealed).toMatch(/^v1\./);
    expect(sealed).not.toContain('4532');
    expect(await decryptPatientIdentity(keys, 'p1', sealed)).toEqual(identity);
  });

  it('refuses ciphertext moved to another patient row', async () => {
    const keys = await deriveIdentityKeys(generateMasterSecret());
    const sealed = await encryptPatientIdentity(keys, 'p1', identity);

    await expect(decryptPatientIdentity(keys, 'p2', sealed)).rejects.toThrow();
  });

  it('refuses a different master key', async () => {
    const keys = await deriveIdentityKeys(generateMasterSecret());
    const other = await deriveIdentityKeys(generateMasterSecret());
    const sealed = await encryptPatientIdentity(keys, 'p1', identity);

    await expect(decryptPatientIdentity(other, 'p1', sealed)).rejects.toThrow();
  });
});

describe('master key wrapping', () => {
  it('unwraps with the right passphrase and rejects a wrong one', async () => {
    const master = generateMasterSecret();
    const salt = generateSalt();
    const wrapped = await wrapWithPassphrase(master, 'correct horse', salt, FAST);

    expect(await unwrapWithPassphrase(wrapped, 'correct horse', salt, FAST)).toEqual(master);
    await expect(unwrapWithPassphrase(wrapped, 'wrong horse', salt, FAST)).rejects.toBeInstanceOf(
      IdentityUnlockError
    );
  });

  it('accepts the recovery code regardless of dashes and case', async () => {
    const master = generateMasterSecret();
    const code = generateRecoveryCode();
    const salt = generateSalt();
    const wrapped = await wrapWithRecoveryCode(master, code, salt);

    expect(looksLikeRecoveryCode(code)).toBe(true);
    expect(code).toMatch(/^([A-Z2-9]{4}-){7}[A-Z2-9]{4}$/);
    expect(await unwrapWithRecoveryCode(wrapped, code.toLowerCase().replace(/-/g, ' '), salt)).toEqual(
      master
    );
  });

  it('does not mistake an ordinary passphrase for a recovery code', () => {
    expect(looksLikeRecoveryCode('my ward passphrase')).toBe(false);
  });
});

describe('registration lookup (blind index)', () => {
  it('matches leading-zero variants and differs per key', async () => {
    const keys = await deriveIdentityKeys(generateMasterSecret());
    const other = await deriveIdentityKeys(generateMasterSecret());

    const a = await computeRegistrationLookup(keys.lookupKey, '0000004532');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await computeRegistrationLookup(keys.lookupKey, '4532')).toBe(a);
    expect(await computeRegistrationLookup(keys.lookupKey, '4533')).not.toBe(a);
    expect(await computeRegistrationLookup(other.lookupKey, '4532')).not.toBe(a);
    expect(await computeRegistrationLookup(keys.lookupKey, '  ')).toBe('');
  });

  it('survives the env-var encoding used by the server', async () => {
    const keys = await deriveIdentityKeys(generateMasterSecret());
    const decoded = decodeLookupKey(encodeLookupKey(keys.lookupKey));

    expect(decoded).toEqual(keys.lookupKey);
    expect(await computeRegistrationLookup(decoded!, '4532')).toBe(
      await computeRegistrationLookup(keys.lookupKey, '4532')
    );
    expect(decodeLookupKey('not-a-key')).toBeNull();
    expect(decodeLookupKey(undefined)).toBeNull();
  });
});
