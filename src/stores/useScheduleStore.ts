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
import { formatUserFacingError } from '@/lib/errorMessages';
import { removeById, replaceById, upsertById } from './storeUtils';

interface ScheduleStore {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  fetchByPatient: (patientId: string) => Promise<void>;
  addSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt'>) => Promise<string>;
  updateSchedule: (id: string, updates: Partial<Schedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  isLoading: false,
  error: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      if (useSupabaseBackend) {
        const schedules = (await listSchedulesByDate(new Date())).map(fromDomainSchedule);
        set({ schedules, isLoading: false });
        return;
      }

      const schedules = await db.schedules.orderBy('scheduledDate').toArray();
      set({ schedules, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: formatUserFacingError(error, '일정을 불러오지 못했습니다.'),
      });
    }
  },

  fetchByPatient: async (patientId: string) => {
    set({ isLoading: true, error: null });
    try {
      if (useSupabaseBackend) {
        const schedules = (await listSchedulesByPatient(patientId)).map(fromDomainSchedule);
        set({ schedules, isLoading: false });
        return;
      }

      const schedules = await db.schedules
        .where('patientId')
        .equals(patientId)
        .sortBy('scheduledDate');
      set({ schedules, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: formatUserFacingError(error, '일정을 불러오지 못했습니다.'),
      });
    }
  },

  addSchedule: async (data) => {
    try {
      if (useSupabaseBackend) {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) throw new Error('로그인이 필요합니다.');
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
          schedules: upsertById(state.schedules, legacySchedule, 'append').sort(
            (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()
          ),
        }));
        return legacySchedule.id;
      }

      const schedule: Schedule = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };
      await db.schedules.add(schedule);
      set((state) => ({
        schedules: upsertById(state.schedules, schedule, 'append').sort(
          (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()
        ),
      }));
      return schedule.id;
    } catch (error) {
      set({ error: formatUserFacingError(error, '일정을 추가하지 못했습니다.') });
      throw error;
    }
  },

  updateSchedule: async (id, updates) => {
    try {
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
          schedules: replaceById(state.schedules, id, legacySchedule)
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
    } catch (error) {
      set({ error: formatUserFacingError(error, '일정을 수정하지 못했습니다.') });
      throw error;
    }
  },

  deleteSchedule: async (id) => {
    try {
      if (useSupabaseBackend) {
        await softDeleteSchedule(id);
        set((state) => ({
          schedules: removeById(state.schedules, id),
        }));
        return;
      }

      await db.schedules.delete(id);
      set((state) => ({
        schedules: removeById(state.schedules, id),
      }));
    } catch (error) {
      set({ error: formatUserFacingError(error, '일정을 삭제하지 못했습니다.') });
      throw error;
    }
  },

  toggleComplete: async (id) => {
    try {
      const schedule = get().schedules.find((s) => s.id === id);
      if (!schedule) return;
      const isCompleted = !schedule.isCompleted;
      if (useSupabaseBackend) {
        const updated = await updateSupabaseSchedule(id, { isCompleted });
        const legacySchedule = fromDomainSchedule(updated);
        set((state) => ({
          schedules: replaceById(state.schedules, id, legacySchedule),
        }));
        return;
      }

      await db.schedules.update(id, { isCompleted });
      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === id ? { ...s, isCompleted } : s
        ),
      }));
    } catch (error) {
      set({ error: formatUserFacingError(error, '일정 상태를 변경하지 못했습니다.') });
      throw error;
    }
  },
}));
