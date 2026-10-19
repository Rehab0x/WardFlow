import { useState, type FormEvent } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MIN_PASSPHRASE_LENGTH } from '@/services/patientIdentityService';

interface RememberDeviceProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function RememberDevice({ checked, onChange }: RememberDeviceProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300"
      />
      <span className="text-sm text-muted-foreground">
        이 기기에서 기억하기
        <span className="block text-xs">여러 사람이 쓰는 병원 PC에서는 켜지 마세요.</span>
      </span>
    </label>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{message}</div>;
}

interface IdentitySetupFormProps {
  busy: boolean;
  error: string | null;
  onSubmit: (passphrase: string, remember: boolean) => void;
}

export function IdentitySetupForm({ busy, error, onSubmit }: IdentitySetupFormProps) {
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(false);
  const mismatch = confirm.length > 0 && passphrase !== confirm;
  const tooShort = passphrase.length < MIN_PASSPHRASE_LENGTH;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!tooShort && !mismatch) onSubmit(passphrase, remember);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        환자 이름·등록번호·생년월일을 이 암호문구로 잠가서 저장합니다. 로그인 비밀번호와 다르게
        정하세요. 서버에는 보내지 않으므로 <b>잊으면 복구 코드로만</b> 열 수 있습니다.
      </p>
      <Input
        type="password"
        placeholder={`암호문구 (${MIN_PASSPHRASE_LENGTH}자 이상)`}
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        autoComplete="new-password"
        disabled={busy}
        autoFocus
      />
      <Input
        type="password"
        placeholder="암호문구 확인"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        disabled={busy}
      />
      {mismatch && <p className="text-xs text-destructive">암호문구가 서로 다릅니다.</p>}
      <RememberDevice checked={remember} onChange={setRemember} />
      <FormError message={error} />
      <Button type="submit" className="w-full" disabled={busy || tooShort || mismatch || !confirm}>
        {busy ? '설정 중...' : '암호 설정'}
      </Button>
    </form>
  );
}

interface IdentityUnlockFormProps {
  busy: boolean;
  error: string | null;
  onSubmit: (secret: string, remember: boolean) => void;
}

export function IdentityUnlockForm({ busy, error, onSubmit }: IdentityUnlockFormProps) {
  const [secret, setSecret] = useState('');
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (secret) onSubmit(secret, remember);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        환자정보 암호문구를 입력하세요. 잊었다면 복구 코드(XXXX-XXXX-…)를 넣어도 됩니다.
      </p>
      <Input
        type="password"
        placeholder="암호문구 또는 복구 코드"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        autoComplete="current-password"
        disabled={busy}
        autoFocus
      />
      <RememberDevice checked={remember} onChange={setRemember} />
      <FormError message={error} />
      <Button type="submit" className="w-full" disabled={busy || !secret}>
        {busy ? '확인 중...' : '잠금 해제'}
      </Button>
    </form>
  );
}

interface RecoveryCodeNoticeProps {
  recoveryCode: string;
  onConfirm: () => void;
}

export function RecoveryCodeNotice({ recoveryCode, onConfirm }: RecoveryCodeNoticeProps) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        아래 복구 코드를 <b>지금 따로 적어 두세요.</b> 암호문구를 잊었을 때 환자정보를 열 수 있는
        유일한 방법이며, 이 화면을 닫으면 다시 볼 수 없습니다.
      </p>
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
        <code className="flex-1 break-all font-mono text-sm tracking-wide">{recoveryCode}</code>
        <Button type="button" variant="ghost" size="sm" onClick={() => void copy()}>
          <Copy className="mr-1 h-4 w-4" />
          {copied ? '복사됨' : '복사'}
        </Button>
      </div>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <span className="text-sm">복구 코드를 안전한 곳에 저장했습니다</span>
      </label>
      <Button type="button" className="w-full" disabled={!saved} onClick={onConfirm}>
        계속
      </Button>
    </div>
  );
}
