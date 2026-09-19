import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { fetchBriefingData, type BriefingData } from '@/services/briefingService';
import { formatUserFacingError } from '@/lib/errorMessages';
import { emptyBriefingData } from '@/features/app/optimisticBriefing';
import type { User } from '@/types/user';

/** 포커스 복귀 시 이 시간이 지났으면 조용히 다시 불러온다. */
const STALE_REFRESH_MS = 60_000;

interface UseBriefingDataInput {
  currentUser: User | null;
  fetchPatients: () => Promise<void>;
  /** 미저장 작업이 있으면 자동 갱신을 건너뛴다. */
  hasUnsavedWork: boolean;
}

export interface BriefingDataController {
  briefingData: BriefingData;
  setBriefingData: Dispatch<SetStateAction<BriefingData>>;
  briefingLoading: boolean;
  briefingError: string | null;
  setBriefingError: Dispatch<SetStateAction<string | null>>;
  lastBriefingUpdatedAt: Date | null;
  /** Today 데이터만 다시 불러온다 (중복 호출은 합쳐진다). */
  loadBriefingData: () => Promise<void>;
  /** 환자 목록 + Today 데이터를 함께 다시 불러온다. */
  loadData: () => Promise<void>;
  /** 낙관적 업데이트 직후 "방금 갱신됨" 상태로 표시한다. */
  markLocalBriefingUpdated: () => void;
}

/**
 * Today 브리핑 데이터 로딩 상태와 갱신 정책을 담당한다.
 * - 같은 사용자에 대한 동시 갱신 요청은 하나로 합치고, 마지막에 한 번만 더 확인한다.
 * - 포커스가 돌아왔을 때 오래된 데이터면 조용히 다시 불러온다.
 */
export function useBriefingData({
  currentUser,
  fetchPatients,
  hasUnsavedWork,
}: UseBriefingDataInput): BriefingDataController {
  const [briefingData, setBriefingData] = useState<BriefingData>(emptyBriefingData);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [lastBriefingUpdatedAt, setLastBriefingUpdatedAt] = useState<Date | null>(null);

  const briefingRequestSeq = useRef(0);
  const briefingRefreshPromiseRef = useRef<Promise<void> | null>(null);
  const briefingRefreshQueuedRef = useRef(false);
  const briefingRefreshUserKeyRef = useRef<string | null>(null);
  const lastFullRefreshAtRef = useRef(0);
  const fullRefreshPromiseRef = useRef<Promise<void> | null>(null);
  const fullRefreshUserKeyRef = useRef<string | null>(null);

  const runBriefingFetch = useCallback(async () => {
    if (!currentUser) {
      setBriefingData(emptyBriefingData);
      return;
    }

    const requestId = briefingRequestSeq.current + 1;
    briefingRequestSeq.current = requestId;
    setBriefingLoading(true);
    setBriefingError(null);

    try {
      const nextBriefingData = await fetchBriefingData(currentUser.id, currentUser.role);
      if (briefingRequestSeq.current === requestId) {
        setBriefingData(nextBriefingData);
        setLastBriefingUpdatedAt(new Date());
      }
    } catch (error) {
      if (briefingRequestSeq.current === requestId) {
        setBriefingError(formatUserFacingError(error, 'Today 데이터를 불러오지 못했습니다.'));
      }
    } finally {
      if (briefingRequestSeq.current === requestId) {
        setBriefingLoading(false);
      }
    }
  }, [currentUser]);

  const loadBriefingData = useCallback(async () => {
    const refreshUserKey = currentUser?.id ?? 'anonymous';
    if (briefingRefreshPromiseRef.current && briefingRefreshUserKeyRef.current === refreshUserKey) {
      briefingRefreshQueuedRef.current = true;
      return briefingRefreshPromiseRef.current;
    }
    if (briefingRefreshUserKeyRef.current !== refreshUserKey) {
      briefingRefreshQueuedRef.current = false;
    }

    const refreshPromise = (async () => {
      await runBriefingFetch();
      while (briefingRefreshQueuedRef.current) {
        briefingRefreshQueuedRef.current = false;
        await runBriefingFetch();
      }
    })();

    briefingRefreshPromiseRef.current = refreshPromise;
    briefingRefreshUserKeyRef.current = refreshUserKey;
    try {
      await refreshPromise;
    } finally {
      if (briefingRefreshPromiseRef.current === refreshPromise) {
        briefingRefreshPromiseRef.current = null;
        briefingRefreshUserKeyRef.current = null;
        briefingRefreshQueuedRef.current = false;
      }
    }
  }, [currentUser, runBriefingFetch]);

  const loadData = useCallback(async () => {
    const refreshUserKey = currentUser?.id ?? 'anonymous';
    if (fullRefreshPromiseRef.current && fullRefreshUserKeyRef.current === refreshUserKey) {
      return fullRefreshPromiseRef.current;
    }

    const refreshPromise = (async () => {
      if (!currentUser) {
        await fetchPatients();
        setBriefingData(emptyBriefingData);
        lastFullRefreshAtRef.current = Date.now();
        return;
      }

      const [briefingResult] = await Promise.allSettled([loadBriefingData(), fetchPatients()]);
      lastFullRefreshAtRef.current = Date.now();
      if (briefingResult.status === 'rejected') {
        setBriefingError(
          formatUserFacingError(briefingResult.reason, 'Today 데이터를 불러오지 못했습니다.')
        );
      }
    })();

    fullRefreshPromiseRef.current = refreshPromise;
    fullRefreshUserKeyRef.current = refreshUserKey;
    try {
      await refreshPromise;
    } finally {
      if (fullRefreshPromiseRef.current === refreshPromise) {
        fullRefreshPromiseRef.current = null;
        fullRefreshUserKeyRef.current = null;
      }
    }
  }, [currentUser, fetchPatients, loadBriefingData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const refreshIfStale = () => {
      if (document.visibilityState === 'hidden') return;
      if (hasUnsavedWork) return;
      if (Date.now() - lastFullRefreshAtRef.current < STALE_REFRESH_MS) return;
      void loadData();
    };

    window.addEventListener('focus', refreshIfStale);
    document.addEventListener('visibilitychange', refreshIfStale);
    return () => {
      window.removeEventListener('focus', refreshIfStale);
      document.removeEventListener('visibilitychange', refreshIfStale);
    };
  }, [loadData, hasUnsavedWork]);

  const markLocalBriefingUpdated = useCallback(() => {
    setLastBriefingUpdatedAt(new Date());
    setBriefingError(null);
  }, []);

  return {
    briefingData,
    setBriefingData,
    briefingLoading,
    briefingError,
    setBriefingError,
    lastBriefingUpdatedAt,
    loadBriefingData,
    loadData,
    markLocalBriefingUpdated,
  };
}
