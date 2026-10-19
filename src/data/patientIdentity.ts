import {
  decryptPatientIdentity,
  encryptPatientIdentity,
  type PatientIdentity,
} from '@/lib/patientIdentityCrypto';
import { getIdentityKeys } from '@/lib/patientIdentityKeyring';
import { computeRegistrationLookup } from '@/lib/registrationLookup';

/**
 * patients 행의 식별정보 칸 ↔ 이름·등록번호·생년월일 (TODO 2.19).
 * DB에는 암호문(`identity_ciphertext`)과 등록번호 조회키(`registration_hmac`)만 있다.
 */
export interface PatientIdentityColumns {
  identity_ciphertext?: string | null;
  registration_hmac?: string | null;
}

export class PatientIdentityLockedError extends Error {
  constructor() {
    super('환자정보 잠금을 먼저 해제해 주세요.');
    this.name = 'PatientIdentityLockedError';
  }
}

/** 복호화할 수 없는 행(다른 키로 암호화됨 등)을 목록에서 빼지 않고 이렇게 보여준다 */
const UNREADABLE_BIRTH_DATE = '1900-01-01';

/** select에 넣을 식별정보 칸 */
export const IDENTITY_SELECT_COLUMNS = 'identity_ciphertext';

export async function openPatientIdentity(
  patientId: string,
  row: PatientIdentityColumns
): Promise<PatientIdentity> {
  const keys = getIdentityKeys();
  if (!keys) throw new PatientIdentityLockedError();
  try {
    if (!row.identity_ciphertext) throw new Error('No identity ciphertext.');
    return await decryptPatientIdentity(keys, patientId, row.identity_ciphertext);
  } catch {
    return {
      name: `🔒 ${patientId.slice(0, 4).toUpperCase()}`,
      registrationNumber: '',
      birthDate: UNREADABLE_BIRTH_DATE,
    };
  }
}

export async function openPatientIdentities<T extends PatientIdentityColumns & { id: string }>(
  rows: T[]
): Promise<Array<{ row: T; identity: PatientIdentity }>> {
  return Promise.all(rows.map(async (row) => ({ row, identity: await openPatientIdentity(row.id, row) })));
}

export async function sealPatientIdentity(
  patientId: string,
  identity: PatientIdentity
): Promise<PatientIdentityColumns> {
  const keys = getIdentityKeys();
  if (!keys) throw new PatientIdentityLockedError();
  const [ciphertext, lookup] = await Promise.all([
    encryptPatientIdentity(keys, patientId, identity),
    computeRegistrationLookup(keys.lookupKey, identity.registrationNumber),
  ]);
  return { identity_ciphertext: ciphertext, registration_hmac: lookup || null };
}
