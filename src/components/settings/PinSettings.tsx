import { useEffect, useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  checkHasPin,
  removePin,
  setPin as savePinToDB,
  usePinLockStore,
  verifyPin,
} from '@/hooks/usePinLock';
import { useAuthStore } from '@/stores/useAuthStore';
export function PinSettings() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const { hasPin, autoLockMinutes, setAutoLockMinutes, setHasPin } = usePinLockStore();
  const [mode, setMode] = useState<'idle' | 'set' | 'change' | 'remove'>('idle');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    checkHasPin(currentUser.id).then(setHasPin);
  }, [currentUser, setHasPin]);

  const resetForm = () => {
    setMode('idle');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
  };

  const savePin = async () => {
    if (!currentUser) return;
    setError('');
    setLoading(true);

    try {
      if (mode === 'change' || mode === 'remove') {
        const valid = await verifyPin(currentUser.id, currentPin);
        if (!valid) {
          setError('현재 PIN이 일치하지 않습니다.');
          return;
        }
      }

      if (mode === 'remove') {
        await removePin(currentUser.id);
        setHasPin(false);
        toast({ title: 'PIN 해제 완료', description: 'PIN 잠금이 비활성화되었습니다.' });
      } else {
        if (!/^\d{4}$/.test(newPin)) {
          setError('PIN은 4자리 숫자여야 합니다.');
          return;
        }
        if (newPin !== confirmPin) {
          setError('새 PIN과 확인 PIN이 일치하지 않습니다.');
          return;
        }
        await savePinToDB(currentUser.id, newPin);
        setHasPin(true);
        toast({ title: 'PIN 설정 완료', description: '이 기기에서 PIN 잠금이 활성화되었습니다.' });
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN 설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {hasPin ? (
            <Lock className="h-5 w-5 text-primary" />
          ) : (
            <Unlock className="h-5 w-5 text-muted-foreground" />
          )}
          <h2 className="text-lg font-semibold">PIN 잠금</h2>
          {hasPin && <Badge variant="secondary">활성</Badge>}
        </div>
        {mode === 'idle' && (
          <div className="flex gap-2">
            {hasPin ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setMode('change')}>
                  변경
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMode('remove')}>
                  해제
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setMode('set')}>
                PIN 설정
              </Button>
            )}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {hasPin
          ? `${autoLockMinutes}분 동안 입력이 없으면 자동 잠금됩니다.`
          : 'PIN은 이 기기에 저장되는 로컬 잠금 기능입니다.'}
      </p>

      {hasPin && mode === 'idle' && (
        <div className="flex items-center gap-3">
          <span className="text-sm">자동 잠금 시간</span>
          <select
            value={autoLockMinutes}
            onChange={(event) => setAutoLockMinutes(Number(event.target.value))}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            {[1, 3, 5, 10, 15, 30].map((minute) => (
              <option key={minute} value={minute}>
                {minute}분
              </option>
            ))}
          </select>
        </div>
      )}

      {mode !== 'idle' && (
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-medium">
            {mode === 'set' && 'PIN 설정'}
            {mode === 'change' && 'PIN 변경'}
            {mode === 'remove' && 'PIN 해제'}
          </h3>
          {(mode === 'change' || mode === 'remove') && (
            <PinInput label="현재 PIN" value={currentPin} onChange={setCurrentPin} />
          )}
          {mode !== 'remove' && (
            <>
              <PinInput label="새 PIN" value={newPin} onChange={setNewPin} />
              <PinInput label="새 PIN 확인" value={confirmPin} onChange={setConfirmPin} />
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={savePin} disabled={loading}>
              {mode === 'remove' ? '해제' : '저장'}
            </Button>
            <Button variant="outline" size="sm" onClick={resetForm}>
              취소
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function PinInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        type="password"
        maxLength={4}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        placeholder="4자리 숫자"
        className="mt-1 w-40"
      />
    </div>
  );
}
