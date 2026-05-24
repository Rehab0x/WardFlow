import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/db/database';
import { useSupabaseBackend } from '@/config/backend';
import { listActiveAntibioticsByPatientIds } from '@/data/medications.repository';
import { listReminderNotesByPatientIdsAndAlertDate } from '@/data/notes.repository';

export interface PatientFlags {
  hasAntibiotic: boolean;
  hasReminder: boolean;
  hasAttention: boolean;
}

let _refreshCounter = 0;
let _listeners: Array<() => void> = [];
let _refreshTimer: number | null = null;

export function refreshSidebarFlags() {
  if (_listeners.length === 0) return;
  if (_refreshTimer) return;
  _refreshTimer = window.setTimeout(() => {
    _refreshTimer = null;
    _refreshCounter++;
    _listeners.forEach((fn) => fn());
  }, 100);
}

export function useSidebarFlags(patientIds: string[]) {
  const [flags, setFlags] = useState<Map<string, PatientFlags>>(new Map());
  const [, setRefresh] = useState(0);
  const loadSeqRef = useRef(0);
  const patientIdsKey = patientIds.join('\u001f');
  const stablePatientIds = useMemo(() => patientIds, [patientIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = () => setRefresh((count) => count + 1);
    _listeners.push(handler);
    return () => {
      _listeners = _listeners.filter((fn) => fn !== handler);
      if (_listeners.length === 0 && _refreshTimer) {
        window.clearTimeout(_refreshTimer);
        _refreshTimer = null;
      }
    };
  }, []);

  const load = useCallback(async () => {
    const loadSeq = loadSeqRef.current + 1;
    loadSeqRef.current = loadSeq;

    if (stablePatientIds.length === 0) {
      setFlags(new Map());
      return;
    }

    const map = new Map<string, PatientFlags>();
    for (const id of stablePatientIds) {
      map.set(id, { hasAntibiotic: false, hasReminder: false, hasAttention: false });
    }

    if (useSupabaseBackend) {
      const [activeAntibiotics, todayNotes] = await Promise.all([
        listActiveAntibioticsByPatientIds(stablePatientIds),
        listReminderNotesByPatientIdsAndAlertDate(stablePatientIds, new Date()),
      ]);

      for (const med of activeAntibiotics) {
        const flag = map.get(med.patientId);
        if (flag) flag.hasAntibiotic = true;
      }

      for (const note of todayNotes) {
        const flag = map.get(note.patientId);
        if (flag) flag.hasReminder = true;
      }

      if (loadSeqRef.current === loadSeq) {
        setFlags(new Map(map));
      }
      return;
    }

    const patientIdSet = new Set(stablePatientIds);
    const allMeds = await db.medications
      .where('patientId')
      .anyOf(stablePatientIds)
      .filter((med) => patientIdSet.has(med.patientId) && med.category === 'antibiotic' && med.isActive)
      .toArray();

    for (const med of allMeds) {
      const flag = map.get(med.patientId);
      if (flag) flag.hasAntibiotic = true;
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const todayNotes = await db.notes
      .where('patientId')
      .anyOf(stablePatientIds)
      .filter((note) => {
        if (note.type !== 'reminder' || !note.alertDate) return false;
        const alertDate = new Date(note.alertDate);
        return alertDate >= startOfToday && alertDate <= endOfToday;
      })
      .toArray();

    for (const note of todayNotes) {
      const flag = map.get(note.patientId);
      if (flag) flag.hasReminder = true;
    }

    if (loadSeqRef.current === loadSeq) {
      setFlags(new Map(map));
    }
  }, [stablePatientIds]);

  useEffect(() => {
    void load().catch(() => {
      setFlags(new Map());
    });
  }, [load, _refreshCounter]); // eslint-disable-line react-hooks/exhaustive-deps

  return flags;
}

