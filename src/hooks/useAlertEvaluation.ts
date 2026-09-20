import { useEffect, useRef } from 'react';
import { listActiveAntibioticsByPatientIds } from '@/data/medications.repository';
import { listLabValuesByPatientIdsSince } from '@/data/labs.repository';
import { fromDomainMedication } from '@/mappers/clinicalView.mapper';
import { useAlertStore } from '@/stores/useAlertStore';
import type { Patient } from '@/types/patient';

/** 규칙 평가에 쓸 Lab 조회 범위 — 최근 것만 본다. */
const LAB_LOOKBACK_DAYS = 14;

/**
 * 알림 규칙을 불러오고, 활성 환자 데이터에 대해 주기적으로 평가한다.
 *
 * 서버 크론이 없으므로 "앱을 열 때/환자 목록이 바뀔 때 다시 판정"하는 모델이다.
 * 같은 근거로 반복 판정돼도 `dedupeKey` 유니크 제약이 중복 저장을 막는다.
 *
 * 규칙이 하나도 없으면 추가 쿼리를 아예 실행하지 않는다.
 */
export function useAlertEvaluation({
  ownerId,
  patients,
  enabled,
  refreshKey,
}: {
  ownerId: string | undefined;
  patients: Patient[];
  /** 인증 등 준비가 끝났을 때만 실행 */
  enabled: boolean;
  /**
   * 값이 바뀌면 다시 평가한다. Today 브리핑 갱신 시각을 넘겨,
   * Lab을 새로 입력한 뒤에도 "지금도 열린 위반"이 최신으로 유지되게 한다.
   */
  refreshKey?: string | number;
}) {
  const fetchRules = useAlertStore((store) => store.fetchRules);
  const fetchEvents = useAlertStore((store) => store.fetchEvents);
  const evaluate = useAlertStore((store) => store.evaluate);
  const rules = useAlertStore((store) => store.rules);
  const lastRunKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !ownerId) return;
    void fetchRules();
    void fetchEvents();
  }, [enabled, ownerId, fetchRules, fetchEvents]);

  useEffect(() => {
    if (!enabled || !ownerId) return;
    if (rules.filter((rule) => rule.isEnabled).length === 0) return;

    const activePatients = patients.filter((patient) => patient.status === 'active');
    if (activePatients.length === 0) return;

    // 같은 환자 집합·같은 규칙 구성에 대해 중복 실행하지 않는다.
    const runKey = [
      ownerId,
      activePatients.map((patient) => patient.id).sort().join(','),
      rules.map((rule) => `${rule.id}:${rule.updatedAt.getTime()}`).join(','),
      refreshKey ?? '',
    ].join('|');
    if (lastRunKeyRef.current === runKey) return;
    lastRunKeyRef.current = runKey;

    const patientIds = activePatients.map((patient) => patient.id);
    const since = new Date();
    since.setDate(since.getDate() - LAB_LOOKBACK_DAYS);

    void (async () => {
      try {
        const [labResults, antibiotics] = await Promise.all([
          listLabValuesByPatientIdsSince(patientIds, since),
          listActiveAntibioticsByPatientIds(patientIds),
        ]);

        await evaluate({
          ownerId,
          patients: activePatients,
          labResults,
          medications: antibiotics.map(fromDomainMedication),
        });
      } catch {
        // 평가 실패가 Today 로딩을 막지 않도록 조용히 지나간다.
        // 사용자에게 보여줄 오류는 스토어 error로 이미 다뤄진다.
        lastRunKeyRef.current = null;
      }
    })();
  }, [enabled, ownerId, patients, rules, evaluate, refreshKey]);
}
