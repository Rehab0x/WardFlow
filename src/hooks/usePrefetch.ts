import { useEffect, useRef } from 'react';
import { usePatientStore } from '@/stores/usePatientStore';
import { fetchBriefingData } from '@/services/briefingService';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * PIN 잠금 화면에서 백그라운드 데이터 프리페치
 * PIN 입력하는 동안 환자 목록 + briefing 데이터를 미리 로드
 * → 잠금 해제 후 첫 화면 즉시 표시
 */
export function usePrefetch(isLocked: boolean) {
  const { currentUser } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
  const prefetched = useRef(false);

  useEffect(() => {
    // 잠금 상태일 때만 프리페치, 한 번만 실행
    if (!isLocked || !currentUser || prefetched.current) return;

    prefetched.current = true;

    // 환자 목록 프리페치
    if (patients.length === 0) {
      fetchPatients();
    }

    // Briefing 데이터 프리페치 (결과는 캐시되지 않지만 DB warm-up 효과)
    fetchBriefingData(currentUser.id, currentUser.role).catch(() => {
      // silent fail - prefetch is best-effort
    });
  }, [isLocked, currentUser]);

  // 잠금 해제되면 다음 잠금 시 다시 프리페치 가능
  useEffect(() => {
    if (!isLocked) {
      prefetched.current = false;
    }
  }, [isLocked]);
}
