import { create } from 'zustand';
import type { Schedule } from '@/types/schedule';
import { useAuthStore } from './useAuthStore';
import {
  createSchedule,
  listSchedulesByDate,
  listSchedulesByPatient,
  softDeleteSchedule,
  updateSchedule as updateScheduleRow,
} from '@/data/schedules.repository';
import { fromDomainSchedule } from '@/mappers/clinicalView.mapper';
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

const byScheduledDate = (a: Schedule, b: Schedule) =>
  a.scheduledDate.getTime() - b.scheduledDate.getTime();

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  isLoading: false,
  error: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const schedules = (await listSchedulesByDate(new Date())).map(fromDomainSchedule);
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
      const schedules = (await listSchedulesByPatient(patientId)).map(fromDomainSchedule);
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
      const { currentUser } = useAuthStore.getState();
      if (!currentUser) throw new Error('로그인이 필요합니다.');
      const schedule = await createSchedule({
        patientId: data.patientId,
        title: data.title,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        category: data.category,
        isCompleted: data.isCompleted,
        notes: data.notes,
        createdBy: currentUser.id,
      });
      const viewSchedule = fromDomainSchedule(schedule);
      set((state) => ({
        schedules: upsertById(state.schedules, viewSchedule, 'append').sort(byScheduledDate),
      }));
      return viewSchedule.id;
    } catch (error) {
      set({ error: formatUserFacingError(error, '일정을 추가하지 못했습니다.') });
      throw error;
    }
  },

  updateSchedule: async (id, updates) => {
    try {
      const schedule = await updateScheduleRow(id, {
        title: updates.title,
        scheduledDate: updates.scheduledDate,
        scheduledTime: updates.scheduledTime,
        category: updates.category,
        isCompleted: updates.isCompleted,
        notes: updates.notes,
      });
      set((state) => ({
        schedules: replaceById(state.schedules, id, fromDomainSchedule(schedule)).sort(
          byScheduledDate
        ),
      }));
    } catch (error) {
      set({ error: formatUserFacingError(error, '일정을 수정하지 못했습니다.') });
      throw error;
    }
  },

  deleteSchedule: async (id) => {
    try {
      await softDeleteSchedule(id);
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
      const updated = await updateScheduleRow(id, { isCompleted: !schedule.isCompleted });
      set((state) => ({
        schedules: replaceById(state.schedules, id, fromDomainSchedule(updated)),
      }));
    } catch (error) {
      set({ error: formatUserFacingError(error, '일정 상태를 변경하지 못했습니다.') });
      throw error;
    }
  },
}));
