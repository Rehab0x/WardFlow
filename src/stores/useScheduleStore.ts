import { create } from 'zustand';
import { db } from '@/db/database';
import type { Schedule } from '@/db/database';

interface ScheduleStore {
  schedules: Schedule[];
  isLoading: boolean;

  fetchByPatient: (patientId: string) => Promise<void>;
  addSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt'>) => Promise<void>;
  updateSchedule: (id: string, updates: Partial<Schedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  isLoading: false,

  fetchByPatient: async (patientId: string) => {
    set({ isLoading: true });
    try {
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
    await db.schedules.update(id, updates);
    set((state) => ({
      schedules: state.schedules
        .map((s) => (s.id === id ? { ...s, ...updates } : s))
        .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()),
    }));
  },

  deleteSchedule: async (id) => {
    await db.schedules.delete(id);
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== id),
    }));
  },

  toggleComplete: async (id) => {
    const schedule = get().schedules.find((s) => s.id === id);
    if (!schedule) return;
    const isCompleted = !schedule.isCompleted;
    await db.schedules.update(id, { isCompleted });
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id ? { ...s, isCompleted } : s
      ),
    }));
  },
}));
