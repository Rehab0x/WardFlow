import {
  decryptPatientIdentity,
  encryptPatientIdentity,
  type PatientIdentity,
} from '@/lib/patientIdentityCrypto';
import { getIdentityKeyMode, getIdentityKeys } from '@/lib/patientIdentityKeyring';
import { computeRegistrationLookup } from '@/lib/registrationLookup';

/**
 * patients 행의 식별정보 칸 ↔ 이름·등록번호·생년월일.
 *
 * 전환 기간에는 한 테이블에 두 형태가 섞여 있다.
 * - 암호화된 행: `identity_ciphertext`만 있고 평문 칸은 null (또는 2단계 이후 칸 자체가 없음)
 * - 아직 암호화 전 행: 평문 칸만 있음 — 잠금 해제 직후 `encryptLegacyPatientIdentities`가 옮긴다
 */
export interface PatientIdentityColumns {
  identity_ciphertext?: string | null;
  registration_hmac?: string | null;
  name?: string | null;
  registration_number?: string | null;
  birth_date?: string | null;
}

export class PatientIdentityLockedError extends Error {
  constructor() {
    super('환자정보 잠금을 먼저 해제해 주세요.');
    this.name = 'PatientIdentityLockedError';
  }
}

/** 복호화할 수 없는 행(다른 키로 암호화됨 등)을 목록에서 빼지 않고 이렇게 보여준다 */
const UNREADABLE_BIRTH_DATE = '1900-01-01';

export async function openPatientIdentity(
  patientId: string,
  row: PatientIdentityColumns
): Promise<PatientIdentity> {
  if (!row.identity_ciphertext) {
    return {
      name: row.name ?? '',
      registrationNumber: row.registration_number ?? '',
      birthDate: row.birth_date ?? UNREADABLE_BIRTH_DATE,
    };
  }

  const keys = getIdentityKeys();
  if (!keys) throw new PatientIdentityLockedError();
  try {
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

/**
 * 저장할 식별정보 칸.
 * 암호화 모드에서는 평문 칸을 아예 보내지 않는다 — 2단계 마이그레이션 뒤에는 칸이 없어서 보내면 실패한다.
 */
export async function sealPatientIdentity(
  patientId: string,
  identity: PatientIdentity
): Promise<PatientIdentityColumns> {
  const mode = getIdentityKeyMode();
  if (mode === 'legacy') {
    return {
      name: identity.name,
      registration_number: identity.registrationNumber,
      birth_date: identity.birthDate,
    };
  }

  const keys = getIdentityKeys();
  if (!keys) throw new PatientIdentityLockedError();
  const [ciphertext, lookup] = await Promise.all([
    encryptPatientIdentity(keys, patientId, identity),
    computeRegistrationLookup(keys.lookupKey, identity.registrationNumber),
  ]);
  return { identity_ciphertext: ciphertext, registration_hmac: lookup || null };
}

const PLAINTEXT_IDENTITY_COLUMNS = ['registration_number', 'name', 'birth_date'] as const;
let plaintextColumnsDropped = false;

/**
 * select에 넣을 식별정보 칸 (뒤에 쉼표까지 — 목록 맨 앞에 끼워 넣는다).
 *
 * 암호화 모드에서도 평문 칸을 같이 읽는다 — 아직 옮기지 않은 행이 있을 수 있어서.
 * 2단계 마이그레이션으로 칸이 사라지면 한 번 42703을 받고(`markPlaintextIdentityColumnMissing`),
 * 그 뒤로는 요청하지 않는다. 매 조회마다 실패→재시도 왕복을 하지 않기 위해서다.
 */
export function identitySelectColumns(): string {
  const plaintext = plaintextColumnsDropped ? '' : 'registration_number, name, birth_date,';
  return getIdentityKeyMode() === 'legacy' ? plaintext : `identity_ciphertext, ${plaintext}`;
}

export function markPlaintextIdentityColumnMissing(column: string) {
  if ((PLAINTEXT_IDENTITY_COLUMNS as readonly string[]).includes(column)) {
    plaintextColumnsDropped = true;
  }
}

/** 테스트 전용 */
export function __resetPlaintextIdentityColumnsForTests() {
  plaintextColumnsDropped = false;
}
