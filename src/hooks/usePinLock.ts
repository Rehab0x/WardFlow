import { useEffect, useCallback, useRef } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/db/database';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSupabaseBackend } from '@/config/backend';

// --- PIN Lock Store ---

interface PinLockStore {
  isLocked: boolean;
  hasPin: boolean;
  autoLockMinutes: number; // 자동 잠금 시간 (분)

  setLocked: (locked: boolean) => void;
  setHasPin: (hasPin: boolean) => void;
  setAutoLockMinutes: (minutes: number) => void;
  reset: () => void;
}

export const usePinLockStore = create<PinLockStore>()(
  persist(
    (set) => ({
      isLocked: false,
      hasPin: false,
      autoLockMinutes: 5,

      setLocked: (locked) => set({ isLocked: locked }),
      setHasPin: (hasPin) => set({ hasPin }),
      setAutoLockMinutes: (minutes) => set({ autoLockMinutes: minutes }),
      reset: () => set({ isLocked: false, hasPin: false }),
    }),
    {
      name: 'wardflow-pin-lock',
      partialize: (state) => ({
        isLocked: state.isLocked,
        hasPin: state.hasPin,
        autoLockMinutes: state.autoLockMinutes,
      }),
    }
  )
);

// --- PIN Actions (DB operations) ---

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  if (useSupabaseBackend) return false;
  const credentials = await db.authCredentials.get(userId);
  if (!credentials?.pin) return false;
  return credentials.pin === pin;
}

export async function setPin(userId: string, newPin: string): Promise<void> {
  if (useSupabaseBackend) {
    throw new Error('PIN lock is not available in Supabase mode yet.');
  }
  await db.authCredentials.update(userId, {
    pin: newPin,
    updatedAt: new Date(),
  });
  usePinLockStore.getState().setHasPin(true);
}

export async function removePin(userId: string): Promise<void> {
  if (useSupabaseBackend) {
    usePinLockStore.getState().setHasPin(false);
    usePinLockStore.getState().setLocked(false);
    return;
  }
  await db.authCredentials.update(userId, {
    pin: undefined,
    updatedAt: new Date(),
  });
  usePinLockStore.getState().setHasPin(false);
  usePinLockStore.getState().setLocked(false);
}

export async function checkHasPin(userId: string): Promise<boolean> {
  if (useSupabaseBackend) return false;
  const credentials = await db.authCredentials.get(userId);
  return !!credentials?.pin;
}

// --- Auto-Lock Hook ---

/**
 * 자동 잠금 타이머 훅
 * 마우스/키보드/터치 활동이 없으면 자동으로 잠금
 */
export function useAutoLock() {
  const { currentUser, isAuthenticated } = useAuthStore();
  const { isLocked, hasPin, autoLockMinutes, setLocked, setHasPin } = usePinLockStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 로그인 시 PIN 존재 여부 확인
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    checkHasPin(currentUser.id).then((result) => {
      setHasPin(result);
      // 로그인 직후 PIN이 있으면 잠금
      if (result && !isLocked) {
        setLocked(true);
      }
    });
  }, [isAuthenticated, currentUser?.id]);

  // 타이머 리셋
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!isAuthenticated || !hasPin || isLocked) return;

    timerRef.current = setTimeout(() => {
      setLocked(true);
    }, autoLockMinutes * 60 * 1000);
  }, [isAuthenticated, hasPin, isLocked, autoLockMinutes, setLocked]);

  // 활동 감지 이벤트 리스너
  useEffect(() => {
    if (!isAuthenticated || !hasPin || isLocked) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];

    const handleActivity = () => resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // 초기 타이머 시작
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, hasPin, isLocked, resetTimer]);

  // 해제 함수
  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    if (!currentUser) return false;

    const valid = await verifyPin(currentUser.id, pin);
    if (valid) {
      setLocked(false);
      resetTimer();
    }
    return valid;
  }, [currentUser, setLocked, resetTimer]);

  // 수동 잠금
  const lock = useCallback(() => {
    if (hasPin) setLocked(true);
  }, [hasPin, setLocked]);

  return { isLocked: isLocked && hasPin, hasPin, unlock, lock };
}
