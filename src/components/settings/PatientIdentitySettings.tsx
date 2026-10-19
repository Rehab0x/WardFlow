import { useState, type FormEvent } from 'react';
import { Copy, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { formatUserFacingError } from '@/lib/errorMessages';
import { IdentityUnlockError } from '@/lib/patientIdentityCrypto';
import {
  changeIdentityPassphrase,
  forgetThisDevice,
  getIdentityStatus,
  getServerLookupKey,
  lockIdentityNow,
  MIN_PASSPHRASE_LENGTH,
} from '@/services/patientIdentityService';
import { useAuthStore } from '@/stores/useAuthStore';

/** 설정 > 환자정보 암호화 (TODO 2.19) */
export function PatientIdentitySettings() {
  const userId = useAuthStore((state) => state.currentUser?.id);
  const [, rerender] = useState(0);
  if (!userId) return null;

  const status = getIdentityStatus(userId);

  return (
    <Card className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">환자정보 암호화</h2>
      </div>

      <>
        <p className="text-sm text-muted-foreground">
          환자 이름·등록번호·생년월일은 이 기기에서 암호화되어 저장됩니다. DB만으로는 환자를 식별할
          수 없습니다.
          {status.rememberedOnThisDevice
            ? ' 이 기기는 키를 기억하고 있어 다시 묻지 않습니다.'
            : ' 이 기기는 탭을 닫으면 다시 암호문구를 묻습니다.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              lockIdentityNow({ forgetThisDevice: true });
              window.location.reload();
            }}
          >
            <Lock className="mr-1 h-4 w-4" />
            지금 잠그기
          </Button>
          {status.rememberedOnThisDevice && (
            <Button
              variant="outline"
              onClick={() => {
                forgetThisDevice(userId);
                rerender((n) => n + 1);
              }}
            >
              이 기기 기억 해제
            </Button>
          )}
        </div>
        <ChangePassphraseForm userId={userId} />
        <ServerLookupKey />
      </>
    </Card>
  );
}

function ChangePassphraseForm({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalid = next.length < MIN_PASSPHRASE_LENGTH || next !== confirm || !current;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    setBusy(true);
    setError(null);
    try {
      await changeIdentityPassphrase(userId, current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      toast({ title: '암호문구를 바꿨습니다', description: '복구 코드는 그대로 쓸 수 있습니다.' });
    } catch (err) {
      setError(
        err instanceof IdentityUnlockError
          ? err.message
          : formatUserFacingError(err, '암호문구를 바꾸지 못했습니다.')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2 border-t pt-4">
      <h3 className="text-sm font-semibold">암호문구 변경</h3>
      <Input
        type="password"
        placeholder="현재 암호문구"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        autoComplete="current-password"
        disabled={busy}
      />
      <Input
        type="password"
        placeholder={`새 암호문구 (${MIN_PASSPHRASE_LENGTH}자 이상)`}
        value={next}
        onChange={(e) => setNext(e.target.value)}
        autoComplete="new-password"
        disabled={busy}
      />
      <Input
        type="password"
        placeholder="새 암호문구 확인"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        disabled={busy}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy || invalid}>
        {busy ? '변경 중...' : '변경'}
      </Button>
    </form>
  );
}

function ServerLookupKey() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const key = getServerLookupKey();
  if (!key) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-2 border-t pt-4">
      <h3 className="text-sm font-semibold">서버 Lab import 조회키</h3>
      <p className="text-sm text-muted-foreground">
        서버 자동 Lab import가 등록번호로 환자를 찾으려면 이 값을 Vercel 환경변수{' '}
        <code>PATIENT_LOOKUP_KEY</code>에 넣고 다시 배포하세요. 이 키로 이름·생년월일은 풀 수
        없지만, DB와 이 키가 함께 유출되면 등록번호는 대입으로 알아낼 수 있으니 외부에 공유하지
        마세요.
      </p>
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
        <code className="flex-1 break-all font-mono text-xs">{visible ? key : '•'.repeat(43)}</code>
        <Button type="button" variant="ghost" size="sm" onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => void copy()}>
          <Copy className="mr-1 h-4 w-4" />
          {copied ? '복사됨' : '복사'}
        </Button>
      </div>
    </div>
  );
}
