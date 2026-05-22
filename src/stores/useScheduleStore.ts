import { create } from 'zustand';
import { db } from '@/db/database';
import type { Schedule } from '@/db/database';
import { useSupabaseBackend } from '@/config/backend';
import { useAuthStore } from './useAuthStore';
import {
  createSchedule as createSupabaseSchedule,
  listSchedulesByDate,
  listSchedulesByPatient,
  softDeleteSchedule,
  updateSchedule as updateSupabaseSchedule,
} from '@/data/schedules.repository';
import { fromDomainSchedule } from '@/mappers/legacyClinical.mapper';

interface ScheduleStore {
  schedules: Schedule[];
  isLoading: boolean;

  fetchAll: () => Promise<void>;
  fetchByPatient: (patientId: string) => Promise<void>;
  addSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt'>) => Promise<void>;
  updateSchedule: (id: string, updates: Partial<Schedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  isLoading: false,

  fetchAll: async () => {
    set({ isLoading: true });
    try {
      if (useSupabaseBackend) {
        const schedules = await listSchedulesByDate(new Date());
        set({ schedules: schedules.map(fromDomainSchedule), isLoading: false });
        return;
      }

      const schedules = await db.schedules.orderBy('scheduledDate').toArray();
      set({ schedules, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchByPatient: async (patientId: string) => {
    set({ isLoading: true });
    try {
      if (useSupabaseBackend) {
        const schedules = await listSchedulesByPatient(patientId);
        set({ schedules: schedules.map(fromDomainSchedule), isLoading: false });
        return;
      }

      const schedules = await db.schedules
        .where('patientId')
        .equals(patientId)
        .sortBy('scheduledDate');
      set({ schedules, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addSchedule: async (data) => {
    if (useSupabaseBackend) {
      const { currentUser } = useAuthStore.getState();
      if (!currentUser) throw new Error('User not authenticated');
      const schedule = await createSupabaseSchedule({
        patientId: data.patientId,
        title: data.title,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        category: data.category,
        isCompleted: data.isCompleted,
        notes: data.notes,
        createdBy: currentUser.id,
      });
      const legacySchedule = fromDomainSchedule(schedule);
      set((state) => ({
        schedules: [...state.schedules, legacySchedule].sort(
          (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()
        ),
      }));
      return;
    }

    const schedule: Schedule = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    await db.schedules.add(schedule);
    set((state) => ({
      schedules: [...state.schedules, schedule].sort(
        (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()
      ),
    }));
  },

  updateSchedule: async (id, updates) => {
    if (useSupabaseBackend) {
      const schedule = await updateSupabaseSchedule(id, {
        title: updates.title,
        scheduledDate: updates.scheduledDate,
        scheduledTime: updates.scheduledTime,
        category: updates.category,
        isCompleted: updates.isCompleted,
        notes: updates.notes,
      });
      const legacySchedule = fromDomainSchedule(schedule);
      set((state) => ({
        schedules: state.schedules
          .map((s) => (s.id === id ? legacySchedule : s))
          .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()),
      }));
      return;
    }

    await db.schedules.update(id, updates);
    set((state) => ({
      schedules: state.schedules
        .map((s) => (s.id === id ? { ...s, ...updates } : s))
        .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()),
    }));
  },

  deleteSchedule: async (id) => {
    if (useSupabaseBackend) {
      await softDeleteSchedule(id);
      set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== id),
      }));
      return;
    }

    await db.schedules.delete(id);
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== id),
    }));
  },

  toggleComplete: async (id) => {
    const schedule = get().schedules.find((s) => s.id === id);
    if (!schedule) return;
    const isCompleted = !schedule.isCompleted;
    if (useSupabaseBackend) {
      const updated = await updateSupabaseSchedule(id, { isCompleted });
      const legacySchedule = fromDomainSchedule(updated);
      set((state) => ({
        schedules: state.schedules.map((s) => (s.id === id ? legacySchedule : s)),
      }));
      return;
    }

    await db.schedules.update(id, { isCompleted });
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id ? { ...s, isCompleted } : s
      ),
    }));
  },
}));
