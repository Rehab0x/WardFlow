import { useEffect, useState, useCallback } from 'react';
import { db } from '@/db/database';

export interface PatientFlags {
  hasAntibiotic: boolean;
  hasReminder: boolean;
  hasAttention: boolean; // from patient.attention field directly
}

// Global refresh trigger — call refreshSidebarFlags() from anywhere to reload
let _refreshCounter = 0;
let _listeners: Array<() => void> = [];

export function refreshSidebarFlags() {
  _refreshCounter++;
  _listeners.forEach((fn) => fn());
}

/**
 * 사이드바 플래그 데이터를 전체 환자 대상으로 한번에 조회
 * 환자별 조회가 아닌 bulk 쿼리로 성능 최적화
 */
export function useSidebarFlags(patientIds: string[]) {
  const [flags, setFlags] = useState<Map<string, PatientFlags>>(new Map());
  const [, setRefresh] = useState(0);

  // Subscribe to global refresh trigger
  useEffect(() => {
    const handler = () => setRefresh((c) => c + 1);
    _listeners.push(handler);
    return () => { _listeners = _listeners.filter((fn) => fn !== handler); };
  }, []);

  const load = useCallback(async () => {
    if (patientIds.length === 0) return;
      const map = new Map<string, PatientFlags>();

      // 초기화
      for (const id of patientIds) {
        map.set(id, { hasAntibiotic: false, hasReminder: false, hasAttention: false });
      }

      // 1. 활성 항생제 환자 조회
      const allMeds = await db.medications
        .filter(med => med.category === 'antibiotic' && med.isActive)
        .toArray();

      for (const med of allMeds) {
        const f = map.get(med.patientId);
        if (f) f.hasAntibiotic = true;
      }

      // 2. 오늘 알림 메모 조회
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const todayNotes = await db.notes
        .where('alertDate')
        .between(startOfToday, endOfToday, true, true)
        .toArray();

      for (const note of todayNotes) {
        if (note.type !== 'reminder') continue;
        const f = map.get(note.patientId);
        if (f) f.hasReminder = true;
      }

      setFlags(new Map(map));
  }, [patientIds]);

  useEffect(() => {
    load();
  }, [load, _refreshCounter]); // eslint-disable-line react-hooks/exhaustive-deps

  return flags;
}
