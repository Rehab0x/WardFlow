import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAutoLock } from '@/hooks/usePinLock';
import { Lock, Delete, LogOut } from 'lucide-react';
import { cn } from '@/utils/cn';

const PIN_LENGTH = 4;

interface PinLockOverlayProps {
  onUnlock: () => void;
}

const PinLockOverlay = ({ onUnlock }: PinLockOverlayProps) => {
  const { currentUser, logout } = useAuthStore();
  const { unlock } = useAutoLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= PIN_LENGTH || isVerifying) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    // 자동 검증 (4자리 입력 완료 시)
    if (newPin.length === PIN_LENGTH) {
      setIsVerifying(true);
      unlock(newPin).then((valid) => {
        if (valid) {
          onUnlock();
        } else {
          setShake(true);
          setError('PIN이 일치하지 않습니다');
          setTimeout(() => {
            setPin('');
            setShake(false);
            setIsVerifying(false);
          }, 500);
        }
      });
    }
  }, [pin, isVerifying, unlock, onUnlock]);

  const handleDelete = useCallback(() => {
    if (isVerifying) return;
    setPin((prev) => prev.slice(0, -1));
    setError('');
  }, [isVerifying]);

  // 키보드 입력 지원
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 p-4 sm:gap-8 sm:p-8">
        {/* Lock Icon & User */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold">WardFlow</h1>
          {currentUser && (
            <p className="mt-1 text-sm text-muted-foreground">
              {currentUser.name} ({currentUser.department || currentUser.role})
            </p>
          )}
        </div>

        {/* PIN Dots */}
        <div className={cn('flex gap-4', shake && 'animate-shake')}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-4 w-4 rounded-full border-2 transition-all duration-150',
                i < pin.length
                  ? error
                    ? 'border-red-500 bg-red-500'
                    : 'border-primary bg-primary'
                  : 'border-muted-foreground/30'
              )}
            />
          ))}
        </div>

        {/* Error Message */}
        <div className="h-5">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!error && <p className="text-sm text-muted-foreground">PIN을 입력하세요</p>}
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              disabled={isVerifying}
              className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full text-xl sm:text-2xl font-medium transition-colors hover:bg-accent active:bg-accent/80 disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          {/* Bottom row: Logout / 0 / Delete */}
          <button
            onClick={handleLogout}
            className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full text-sm text-muted-foreground transition-colors hover:bg-accent"
            title="로그아웃"
          >
            <LogOut className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDigit('0')}
            disabled={isVerifying}
            className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full text-xl sm:text-2xl font-medium transition-colors hover:bg-accent active:bg-accent/80 disabled:opacity-50"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={isVerifying}
            className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinLockOverlay;
