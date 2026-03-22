import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ScheduleCategory {
  id: string;
  label: string;
  color: string; // tailwind bg class e.g. 'violet', 'green', 'blue', 'gray'
}

const DEFAULT_CATEGORIES: ScheduleCategory[] = [
  { id: 'consultation', label: '외진', color: 'violet' },
  { id: 'rehabilitation', label: '재활', color: 'green' },
  { id: 'test', label: '검사', color: 'blue' },
  { id: 'other', label: '기타', color: 'gray' },
];

const COLOR_OPTIONS = ['violet', 'green', 'blue', 'gray', 'red', 'amber', 'cyan', 'pink', 'indigo', 'emerald'] as const;

interface ScheduleCategoryStore {
  categories: ScheduleCategory[];
  addCategory: (label: string, color: string) => void;
  updateCategory: (id: string, updates: Partial<Omit<ScheduleCategory, 'id'>>) => void;
  removeCategory: (id: string) => void;
  resetCategories: () => void;
  getLabel: (id: string) => string;
  getColor: (id: string) => string;
}

export { DEFAULT_CATEGORIES, COLOR_OPTIONS };

export const useScheduleCategoryStore = create<ScheduleCategoryStore>()(
  persist(
    (set, get) => ({
      categories: [...DEFAULT_CATEGORIES],

      addCategory: (label, color) => {
        const id = label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
        set((state) => ({
          categories: [...state.categories, { id, label, color }],
        }));
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      removeCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
      },

      resetCategories: () => {
        set({ categories: [...DEFAULT_CATEGORIES] });
      },

      getLabel: (id) => {
        return get().categories.find((c) => c.id === id)?.label ?? id;
      },

      getColor: (id) => {
        return get().categories.find((c) => c.id === id)?.color ?? 'gray';
      },
    }),
    {
      name: 'wardflow-schedule-categories',
    }
  )
);
