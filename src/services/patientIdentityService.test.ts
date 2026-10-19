import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PatientIdentityVault,
  PatientIdentityVaultLookup,
} from '@/data/patientIdentityVault.repository';
import { openPatientIdentity, sealPatientIdentity } from '@/data/patientIdentity';
import {
  __resetIdentityKeyringForTests,
  getIdentityKeyMode,
  lockIdentityKeys,
} from '@/lib/patientIdentityKeyring';

// 금고는 메모리에 둔다 — 실제 DB 없이 흐름만 검증
let vaultLookup: PatientIdentityVaultLookup = { status: 'none' };

vi.mock('@/data/patientIdentityVault.repository', () => ({
  getPatientIdentityVault: vi.fn(async () => vaultLookup),
  createPatientIdentityVault: vi.fn(async (vault: PatientIdentityVault) => {
    vaultLookup = { status: 'ready', vault };
  }),
  updatePatientIdentityPassphrase: vi.fn(
    async (_ownerId: string, input: Partial<PatientIdentityVault>) => {
      if (vaultLookup.status === 'ready')
        vaultLookup = { status: 'ready', vault: { ...vaultLookup.vault, ...input } };
    }
  ),
}));

// PBKDF2 60만 회는 테스트에서 너무 느리다
vi.mock('@/lib/patientIdentityCrypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/patientIdentityCrypto')>();
  return { ...actual, IDENTITY_KDF_ITERATIONS: 1_000 };
});

const service = await import('./patientIdentityService');

const USER = 'user-1';

beforeEach(() => {
  vaultLookup = { status: 'none' };
  __resetIdentityKeyringForTests();
  sessionStorage.clear();
  localStorage.clear();
});

describe('patientIdentityService', () => {
  it('sets up, then reopens with the passphrase or the recovery code', async () => {
    expect(await service.prepareIdentityKeys(USER)).toBe('setup');
    const { recoveryCode } = await service.setUpIdentityVault(USER, 'ward passphrase', false);
    const sealed = await sealPatientIdentity('p1', {
      name: '이몽룡',
      registrationNumber: '4532',
      birthDate: '1950-03-01',
    });

    expect(sealed).not.toHaveProperty('name');
    expect(sealed.identity_ciphertext).toMatch(/^v1\./);
    expect(sealed.registration_hmac).toMatch(/^[0-9a-f]{64}$/);

    // 다른 기기: 저장소가 비어 있다
    lockIdentityKeys({ forget: true });
    sessionStorage.clear();
    expect(await service.prepareIdentityKeys(USER)).toBe('locked');
    await expect(openPatientIdentity('p1', sealed)).rejects.toThrow('잠금');

    await expect(service.unlockIdentityVault(USER, 'wrong passphrase', false)).rejects.toThrow();
    await service.unlockIdentityVault(USER, 'ward passphrase', false);
    expect((await openPatientIdentity('p1', sealed)).name).toBe('이몽룡');

    lockIdentityKeys({ forget: true });
    await service.unlockIdentityVault(USER, recoveryCode, false);
    expect((await openPatientIdentity('p1', sealed)).name).toBe('이몽룡');
  });

  it('reopens silently on a remembered device, and only there', async () => {
    await service.setUpIdentityVault(USER, 'ward passphrase', true);
    __resetIdentityKeyringForTests();
    sessionStorage.clear();

    expect(await service.prepareIdentityKeys(USER)).toBe('unlocked');

    service.forgetThisDevice(USER);
    __resetIdentityKeyringForTests();
    sessionStorage.clear();
    expect(await service.prepareIdentityKeys(USER)).toBe('locked');
  });

  it('drops a stored key that belongs to an older vault', async () => {
    await service.setUpIdentityVault(USER, 'first passphrase', true);
    vaultLookup = { status: 'none' };
    __resetIdentityKeyringForTests();
    await service.setUpIdentityVault(USER, 'second passphrase', false);
    const currentVault = vaultLookup;

    // 예전 키를 기억한 다른 기기를 흉내 낸다
    await service.setUpIdentityVault(USER, 'first passphrase', true);
    vaultLookup = currentVault;
    __resetIdentityKeyringForTests();

    expect(await service.prepareIdentityKeys(USER)).toBe('locked');
    expect(getIdentityKeyMode()).toBe('locked');
  });

  it('changing the passphrase keeps the recovery code working', async () => {
    const { recoveryCode } = await service.setUpIdentityVault(USER, 'old passphrase', false);

    await expect(
      service.changeIdentityPassphrase(USER, 'not it', 'new passphrase')
    ).rejects.toThrow();
    await service.changeIdentityPassphrase(USER, 'old passphrase', 'new passphrase');

    lockIdentityKeys({ forget: true });
    await expect(service.unlockIdentityVault(USER, 'old passphrase', false)).rejects.toThrow();
    await service.unlockIdentityVault(USER, 'new passphrase', false);
    lockIdentityKeys({ forget: true });
    await service.unlockIdentityVault(USER, recoveryCode, false);
  });
});
