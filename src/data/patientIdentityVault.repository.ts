import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/supabase';

export interface PatientIdentityVault {
  ownerId: string;
  kdfSalt: string;
  kdfIterations: number;
  passphraseWrappedKey: string;
  recoveryWrappedKey: string;
  keyCheck: string;
}

/**
 * - `missing-table`: 마이그레이션(202610190001) 전 — 앱은 예전처럼 평문으로 동작한다
 * - `none`: 테이블은 있지만 아직 암호를 설정하지 않음
 */
export type PatientIdentityVaultLookup =
  | { status: 'missing-table' }
  | { status: 'none' }
  | { status: 'ready'; vault: PatientIdentityVault };

const vaultColumns = `
  owner_id,
  kdf_salt,
  kdf_iterations,
  passphrase_wrapped_key,
  recovery_wrapped_key,
  key_check
`;

/** Postgres 42P01 / PostgREST PGRST205 — 테이블이 없음 */
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205']);

export async function getPatientIdentityVault(ownerId: string): Promise<PatientIdentityVaultLookup> {
  const { data, error } = await supabase
    .from('patient_identity_vaults')
    .select(vaultColumns)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) {
    if (error.code && MISSING_TABLE_CODES.has(error.code)) return { status: 'missing-table' };
    throw error;
  }
  return data ? { status: 'ready', vault: fromVaultRow(data) } : { status: 'none' };
}

export async function createPatientIdentityVault(vault: PatientIdentityVault): Promise<void> {
  const { error } = await supabase.from('patient_identity_vaults').insert({
    owner_id: vault.ownerId,
    kdf_salt: vault.kdfSalt,
    kdf_iterations: vault.kdfIterations,
    passphrase_wrapped_key: vault.passphraseWrappedKey,
    recovery_wrapped_key: vault.recoveryWrappedKey,
    key_check: vault.keyCheck,
  });
  if (error) throw error;
}

/** 암호문구만 바꾼다 — 마스터 키와 복구 코드는 그대로라 환자 데이터를 다시 암호화할 필요가 없다 */
export async function updatePatientIdentityPassphrase(
  ownerId: string,
  input: Pick<PatientIdentityVault, 'kdfSalt' | 'kdfIterations' | 'passphraseWrappedKey'>
): Promise<void> {
  const { error } = await supabase
    .from('patient_identity_vaults')
    .update({
      kdf_salt: input.kdfSalt,
      kdf_iterations: input.kdfIterations,
      passphrase_wrapped_key: input.passphraseWrappedKey,
    })
    .eq('owner_id', ownerId);
  if (error) throw error;
}

type VaultRow = Pick<
  Tables<'patient_identity_vaults'>,
  | 'owner_id'
  | 'kdf_salt'
  | 'kdf_iterations'
  | 'passphrase_wrapped_key'
  | 'recovery_wrapped_key'
  | 'key_check'
>;

function fromVaultRow(row: VaultRow): PatientIdentityVault {
  return {
    ownerId: row.owner_id,
    kdfSalt: row.kdf_salt,
    kdfIterations: row.kdf_iterations,
    passphraseWrappedKey: row.passphrase_wrapped_key,
    recoveryWrappedKey: row.recovery_wrapped_key,
    keyCheck: row.key_check,
  };
}
