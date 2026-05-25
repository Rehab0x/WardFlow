import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CalendarEventType = 'schedule' | 'global_alert' | 'reminder';

export interface CalendarColorOption {
  name: string;
  dot: string;      // bg-{color}-500
  bg: string;       // bg-{color}-100
  text: string;     // text-{color}-700
  darkBg: string;   // dark:bg-{color}-900/30
  darkText: string;  // dark:text-{color}-300
  iconBg: string;   // bg-{color}-100 for icon circle
  iconText: string;  // text-{color}-600 for icon
}

export const COLOR_PRESETS: Record<string, CalendarColorOption> = {
  violet: { name: '보라', dot: 'bg-violet-500', bg: 'bg-violet-100', text: 'text-violet-700', darkBg: 'dark:bg-violet-900/30', darkText: 'dark:text-violet-300', iconBg: 'bg-violet-100', iconText: 'text-violet-600' },
  blue: { name: '파랑', dot: 'bg-blue-500', bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-300', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
  amber: { name: '주황', dot: 'bg-amber-500', bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-300', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
  green: { name: '초록', dot: 'bg-green-500', bg: 'bg-green-100', text: 'text-green-700', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-300', iconBg: 'bg-green-100', iconText: 'text-green-600' },
  red: { name: '빨강', dot: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-700', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-300', iconBg: 'bg-red-100', iconText: 'text-red-600' },
  pink: { name: '분홍', dot: 'bg-pink-500', bg: 'bg-pink-100', text: 'text-pink-700', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-300', iconBg: 'bg-pink-100', iconText: 'text-pink-600' },
  teal: { name: '청록', dot: 'bg-teal-500', bg: 'bg-teal-100', text: 'text-teal-700', darkBg: 'dark:bg-teal-900/30', darkText: 'dark:text-teal-300', iconBg: 'bg-teal-100', iconText: 'text-teal-600' },
  indigo: { name: '남색', dot: 'bg-indigo-500', bg: 'bg-indigo-100', text: 'text-indigo-700', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-300', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600' },
  orange: { name: '오렌지', dot: 'bg-orange-500', bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-300', iconBg: 'bg-orange-100', iconText: 'text-orange-600' },
  slate: { name: '회색', dot: 'bg-slate-500', bg: 'bg-slate-100', text: 'text-slate-700', darkBg: 'dark:bg-slate-900/30', darkText: 'dark:text-slate-300', iconBg: 'bg-slate-100', iconText: 'text-slate-600' },
};

const PRESET_KEYS = Object.keys(COLOR_PRESETS);
const DEFAULT_COLORS: Record<CalendarEventType, string> = {
  schedule: 'violet',
  global_alert: 'amber',
  reminder: 'blue',
};

interface CalendarColorStore {
  colors: Record<CalendarEventType, string>; // color key from COLOR_PRESETS
  setColor: (type: CalendarEventType, colorKey: string) => void;
  replaceColors: (colors: Partial<Record<CalendarEventType, unknown>>) => void;
  getColor: (type: CalendarEventType) => CalendarColorOption;
}

function normalizeColorKey(value: unknown, fallback: string): string {
  return typeof value === 'string' && COLOR_PRESETS[value] ? value : fallback;
}

export const useCalendarColorStore = create<CalendarColorStore>()(
  persist(
    (set, get) => ({
      colors: { ...DEFAULT_COLORS },

      setColor: (type, colorKey) => {
        if (!COLOR_PRESETS[colorKey]) return;
        set((state) => ({
          colors: { ...state.colors, [type]: colorKey },
        }));
      },

      replaceColors: (colors) => {
        set((state) => ({
          colors: {
            schedule: normalizeColorKey(colors.schedule, state.colors.schedule ?? DEFAULT_COLORS.schedule),
            global_alert: normalizeColorKey(colors.global_alert, state.colors.global_alert ?? DEFAULT_COLORS.global_alert),
            reminder: normalizeColorKey(colors.reminder, state.colors.reminder ?? DEFAULT_COLORS.reminder),
          },
        }));
      },

      getColor: (type) => {
        const key = get().colors[type] || 'slate';
        return COLOR_PRESETS[key] || COLOR_PRESETS['slate']!;
      },
    }),
    {
      name: 'wardflow-calendar-colors',
    }
  )
);

export { DEFAULT_COLORS, PRESET_KEYS };
