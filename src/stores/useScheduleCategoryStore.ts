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
  replaceCategories: (categories: ScheduleCategory[]) => void;
  resetCategories: () => void;
  getLabel: (id: string) => string;
  getColor: (id: string) => string;
}

export { DEFAULT_CATEGORIES, COLOR_OPTIONS };

function normalizeColor(color: string): string {
  return COLOR_OPTIONS.includes(color as (typeof COLOR_OPTIONS)[number]) ? color : 'gray';
}

function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ');
}

function normalizeCategories(categories: ScheduleCategory[]): ScheduleCategory[] {
  const seen = new Set<string>();
  const normalized: ScheduleCategory[] = [];

  for (const category of categories) {
    const label = normalizeLabel(category.label);
    if (!label) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({
      id: category.id || `${key.replace(/\s+/g, '_')}_${Date.now()}`,
      label,
      color: normalizeColor(category.color),
    });
  }

  return normalized.length > 0 ? normalized : [...DEFAULT_CATEGORIES];
}

export const useScheduleCategoryStore = create<ScheduleCategoryStore>()(
  persist(
    (set, get) => ({
      categories: [...DEFAULT_CATEGORIES],

      addCategory: (label, color) => {
        const normalizedLabel = normalizeLabel(label);
        if (!normalizedLabel) return;
        const existing = get().categories.some((category) => category.label.toLowerCase() === normalizedLabel.toLowerCase());
        if (existing) return;

        const id = normalizedLabel.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
        set((state) => ({
          categories: [...state.categories, { id, label: normalizedLabel, color: normalizeColor(color) }],
        }));
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates, color: updates.color ? normalizeColor(updates.color) : c.color } : c
          ),
        }));
      },

      removeCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
      },

      replaceCategories: (categories) => {
        set({ categories: normalizeCategories(categories) });
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
