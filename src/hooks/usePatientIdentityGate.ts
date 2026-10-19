import { useCallback, useEffect, useState } from 'react';
import { IdentityUnlockError } from '@/lib/patientIdentityCrypto';
import { formatUserFacingError } from '@/lib/errorMessages';
import {
  prepareIdentityKeys,
  setUpIdentityVault,
  unlockIdentityVault,
} from '@/services/patientIdentityService';

export type PatientIdentityGateState =
  | { phase: 'checking' }
  | { phase: 'setup' }
  /** 첫 설정 직후 — 복구 코드를 적어 두었다고 확인해야 다음으로 간다 */
  | { phase: 'recovery'; recoveryCode: string }
  | { phase: 'locked' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string };

/**
 * 로그인 뒤, 환자 데이터를 읽기 전에 거치는 잠금 단계 (TODO 2.19).
 * 환자 이름·등록번호·생년월일은 이 기기에 키가 있어야만 보인다.
 */
export function usePatientIdentityGate(userId: string | undefined) {
  const [state, setState] = useState<PatientIdentityGateState>({ phase: 'checking' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!userId) return;
    setState({ phase: 'checking' });
    try {
      const result = await prepareIdentityKeys(userId);
      setState(result === 'unlocked' ? { phase: 'ready' } : { phase: result });
    } catch (error) {
      setState({
        phase: 'error',
        message: formatUserFacingError(error, '환자정보 잠금 상태를 확인하지 못했습니다.'),
      });
    }
  }, [userId]);

  useEffect(() => {
    void check();
  }, [check]);

  const run = useCallback(async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setFormError(null);
    try {
      await action();
    } catch (error) {
      setFormError(
        error instanceof IdentityUnlockError ? error.message : formatUserFacingError(error, fallback)
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const setUp = useCallback(
    (passphrase: string, remember: boolean) =>
      run(async () => {
        if (!userId) return;
        const { recoveryCode } = await setUpIdentityVault(userId, passphrase, remember);
        setState({ phase: 'recovery', recoveryCode });
      }, '환자정보 암호를 설정하지 못했습니다.'),
    [run, userId]
  );

  const unlock = useCallback(
    (secret: string, remember: boolean) =>
      run(async () => {
        if (!userId) return;
        await unlockIdentityVault(userId, secret, remember);
        setState({ phase: 'ready' });
      }, '잠금을 해제하지 못했습니다.'),
    [run, userId]
  );

  const confirmRecoverySaved = useCallback(() => setState({ phase: 'ready' }), []);

  return { state, busy, formError, setUp, unlock, confirmRecoverySaved, retry: check };
}
