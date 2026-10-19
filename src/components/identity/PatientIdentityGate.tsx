import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePatientIdentityGate } from '@/hooks/usePatientIdentityGate';
import { useAuthStore } from '@/stores/useAuthStore';
import { IdentitySetupForm, IdentityUnlockForm, RecoveryCodeNotice } from './IdentityForms';

const TITLES = {
  setup: '환자정보 암호 설정',
  recovery: '복구 코드 저장',
  locked: '환자정보 잠금 해제',
} as const;

/**
 * 환자 이름·등록번호·생년월일 잠금 (TODO 2.19).
 * 키가 이 기기에 열려 있어야 children(앱 화면)을 그린다.
 */
export function PatientIdentityGate({ children }: { children: ReactNode }) {
  const userId = useAuthStore((state) => state.currentUser?.id);
  const logout = useAuthStore((state) => state.logout);
  const { state, busy, formError, setUp, unlock, confirmRecoverySaved, retry } =
    usePatientIdentityGate(userId);

  if (state.phase === 'ready') return <>{children}</>;

  if (state.phase === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold">
            {state.phase === 'error' ? '환자정보를 열 수 없습니다' : TITLES[state.phase]}
          </h1>
        </div>

        {state.phase === 'setup' && (
          <IdentitySetupForm busy={busy} error={formError} onSubmit={(p, r) => void setUp(p, r)} />
        )}
        {state.phase === 'recovery' && (
          <RecoveryCodeNotice recoveryCode={state.recoveryCode} onConfirm={confirmRecoverySaved} />
        )}
        {state.phase === 'locked' && (
          <IdentityUnlockForm busy={busy} error={formError} onSubmit={(s, r) => void unlock(s, r)} />
        )}
        {state.phase === 'error' && (
          <div className="space-y-4">
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.message}
            </div>
            <Button className="w-full" onClick={() => void retry()}>
              다시 시도
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className="mt-6 w-full text-center text-xs text-muted-foreground hover:underline"
        >
          로그아웃
        </button>
      </Card>
    </div>
  );
}
