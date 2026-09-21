import { useEffect, useMemo, useRef, useState } from 'react';
import { buildDayIndicators } from '@/features/app/patientIndexes';
import { fetchDayScopedNotes } from '@/services/briefingService';
import type { PatientRailIndicators } from '@/components/layout/PatientRail';
import type { Patient } from '@/types/patient';
import { formatUserFacingError } from '@/lib/errorMessages';
import { isToday as isTodayDate } from '@/utils/dateUtils';

/**
 * 환자 목록의 기준일.
 *
 * 기본은 오늘이고, 이때는 Today 브리핑으로 이미 받아 둔 인디케이터를 그대로 쓴다
 * (추가 쿼리 없음). 다른 날짜를 고른 순간에만 그 날짜의 메모·알림·일정을 가져온다.
 *
 * 항생제와 Lab은 "지금 상태"라 과거 날짜에 붙이지 않는다 — 그래서 기준일을 옮기면
 * 할 일 필터가 알림·일정만 보게 된다. 화면에서 그렇게 안내해야 한다.
 */
export function useRailBasisDate({
  patients,
  todayIndicators,
}: {
  patients: Patient[];
  todayIndicators: Record<string, PatientRailIndicators>;
}) {
  const [basisDate, setBasisDate] = useState<Date | null>(null);
  const [dayIndicators, setDayIndicators] = useState<Record<string, PatientRailIndicators>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const activePatients = useMemo(
    () => patients.filter((patient) => patient.status === 'active'),
    [patients]
  );
  const patientIdKey = useMemo(
    () => activePatients.map((patient) => patient.id).sort().join(','),
    [activePatients]
  );

  useEffect(() => {
    if (!basisDate) {
      setDayIndicators({});
      setError(null);
      setLoading(false);
      return;
    }

    const patientIds = patientIdKey ? patientIdKey.split(',') : [];
    if (patientIds.length === 0) {
      setDayIndicators({});
      return;
    }

    // 날짜를 빠르게 바꾸면 늦게 온 응답이 최신 것을 덮을 수 있다.
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const day = await fetchDayScopedNotes(patientIds, basisDate);
        if (requestRef.current !== requestId) return;
        setDayIndicators(
          buildDayIndicators({
            ...day,
            patientsById: new Map(activePatients.map((patient) => [patient.id, patient])),
          })
        );
      } catch (caught) {
        if (requestRef.current !== requestId) return;
        setDayIndicators({});
        setError(formatUserFacingError(caught, '그 날짜의 기록을 불러오지 못했습니다.'));
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    })();
  }, [activePatients, basisDate, patientIdKey]);

  const isToday = !basisDate || isTodayDate(basisDate);

  return {
    /** 화면에 보여줄 기준일 (오늘이면 null) */
    basisDate,
    setBasisDate: (next: Date | null) => {
      // 오늘을 고르면 추가 쿼리 없는 기본 상태로 되돌린다.
      setBasisDate(next && isTodayDate(next) ? null : next);
    },
    indicators: basisDate ? dayIndicators : todayIndicators,
    /** 오늘 기준이면 항생제·Lab 신호까지 포함된다 */
    isToday,
    loading,
    error,
  };
}
