import { useCallback, useEffect, useState } from 'react';
import { db } from '@/db/database';
import { useSupabaseBackend } from '@/config/backend';
import { listActiveAntibiotics } from '@/data/medications.repository';
import { listReminderNotesByAlertDate } from '@/data/notes.repository';

export interface PatientFlags {
  hasAntibiotic: boolean;
  hasReminder: boolean;
  hasAttention: boolean;
}

let _refreshCounter = 0;
let _listeners: Array<() => void> = [];

export function refreshSidebarFlags() {
  _refreshCounter++;
  _listeners.forEach((fn) => fn());
}

export function useSidebarFlags(patientIds: string[]) {
  const [flags, setFlags] = useState<Map<string, PatientFlags>>(new Map());
  const [, setRefresh] = useState(0);

  useEffect(() => {
    const handler = () => setRefresh((count) => count + 1);
    _listeners.push(handler);
    return () => {
      _listeners = _listeners.filter((fn) => fn !== handler);
    };
  }, []);

  const load = useCallback(async () => {
    if (patientIds.length === 0) {
      setFlags(new Map());
      return;
    }

    const map = new Map<string, PatientFlags>();
    for (const id of patientIds) {
      map.set(id, { hasAntibiotic: false, hasReminder: false, hasAttention: false });
    }

    if (useSupabaseBackend) {
      const [activeAntibiotics, todayNotes] = await Promise.all([
        listActiveAntibiotics(),
        listReminderNotesByAlertDate(new Date()),
      ]);

      for (const med of activeAntibiotics) {
        const flag = map.get(med.patientId);
        if (flag) flag.hasAntibiotic = true;
      }

      for (const note of todayNotes) {
        const flag = map.get(note.patientId);
        if (flag) flag.hasReminder = true;
      }

      setFlags(new Map(map));
      return;
    }

    const allMeds = await db.medications
      .filter((med) => med.category === 'antibiotic' && med.isActive)
      .toArray();

    for (const med of allMeds) {
      const flag = map.get(med.patientId);
      if (flag) flag.hasAntibiotic = true;
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const todayNotes = await db.notes
      .where('alertDate')
      .between(startOfToday, endOfToday, true, true)
      .toArray();

    for (const note of todayNotes) {
      if (note.type !== 'reminder') continue;
      const flag = map.get(note.patientId);
      if (flag) flag.hasReminder = true;
    }

    setFlags(new Map(map));
  }, [patientIds]);

  useEffect(() => {
    load();
  }, [load, _refreshCounter]); // eslint-disable-line react-hooks/exhaustive-deps

  return flags;
}

