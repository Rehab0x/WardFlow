import { useEffect, useRef } from 'react';
import { useSupabaseBackend } from '@/config/backend';
import { getUserSetting, setUserSetting } from '@/data/settings.repository';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCalendarColorStore } from '@/stores/useCalendarColorStore';
import { useChartingSettingsStore } from '@/stores/useChartingSettingsStore';
import { useLabReferenceStore } from '@/stores/useLabReferenceStore';
import { useScheduleCategoryStore } from '@/stores/useScheduleCategoryStore';
import type { Json } from '@/types/supabase';

type ChartingSettingsPayload = {
  problemListStyle?: 'numbered' | 'numbered_simple' | 'bulleted' | 'plain';
  includeFieldNames?: boolean;
  excludeEmptySections?: boolean;
  sectionSeparator?: string;
  sectionNames?: Partial<ReturnType<typeof useChartingSettingsStore.getState>['sectionNames']>;
};

type ScheduleCategoriesPayload = {
  categories?: ReturnType<typeof useScheduleCategoryStore.getState>['categories'];
};

type CalendarColorsPayload = {
  colors?: ReturnType<typeof useCalendarColorStore.getState>['colors'];
};

type LabReferencesPayload = {
  overrides?: ReturnType<typeof useLabReferenceStore.getState>['overrides'];
};

export function useSupabaseUserSettingsSync() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const hydratedRef = useRef(false);
  const saveTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!useSupabaseBackend || !currentUser) return;

    let cancelled = false;
    hydratedRef.current = false;

    const hydrate = async () => {
      try {
        const [chartingRaw, scheduleCategoriesRaw, calendarColorsRaw, labReferencesRaw] = await Promise.all([
          getUserSetting<Json>('charting-settings'),
          getUserSetting<Json>('schedule-categories'),
          getUserSetting<Json>('calendar-colors'),
          getUserSetting<Json>('lab-references'),
        ]);

        if (cancelled) return;

        const charting = chartingRaw as ChartingSettingsPayload | null;
        const scheduleCategories = scheduleCategoriesRaw as ScheduleCategoriesPayload | null;
        const calendarColors = calendarColorsRaw as CalendarColorsPayload | null;
        const labReferences = labReferencesRaw as LabReferencesPayload | null;

        if (charting) {
          useChartingSettingsStore.setState((state) => ({
            problemListStyle: charting.problemListStyle ?? state.problemListStyle,
            includeFieldNames: charting.includeFieldNames ?? state.includeFieldNames,
            excludeEmptySections: charting.excludeEmptySections ?? state.excludeEmptySections,
            sectionSeparator: charting.sectionSeparator ?? state.sectionSeparator,
            sectionNames: charting.sectionNames
              ? { ...state.sectionNames, ...charting.sectionNames }
              : state.sectionNames,
          }));
        }

        if (scheduleCategories?.categories) {
          useScheduleCategoryStore.setState({ categories: scheduleCategories.categories });
        }

        if (calendarColors?.colors) {
          useCalendarColorStore.setState({ colors: calendarColors.colors });
        }

        if (labReferences?.overrides) {
          useLabReferenceStore.setState({ overrides: labReferences.overrides });
        }
      } catch (error) {
        console.error('Failed to hydrate Supabase user settings:', error);
      } finally {
        if (!cancelled) hydratedRef.current = true;
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!useSupabaseBackend || !currentUser) return;

    const scheduleSave = (key: string, value: unknown) => {
      if (!hydratedRef.current) return;

      const timers = saveTimersRef.current;
      if (timers[key]) window.clearTimeout(timers[key]);

      timers[key] = window.setTimeout(() => {
        setUserSetting(key, value as Json).catch((error) => {
          console.error(`Failed to save setting ${key}:`, error);
        });
      }, 500);
    };

    const unsubCharting = useChartingSettingsStore.subscribe((state) => {
      scheduleSave('charting-settings', {
        problemListStyle: state.problemListStyle,
        includeFieldNames: state.includeFieldNames,
        excludeEmptySections: state.excludeEmptySections,
        sectionSeparator: state.sectionSeparator,
        sectionNames: state.sectionNames,
      });
    });

    const unsubSchedule = useScheduleCategoryStore.subscribe((state) => {
      scheduleSave('schedule-categories', { categories: state.categories });
    });

    const unsubCalendar = useCalendarColorStore.subscribe((state) => {
      scheduleSave('calendar-colors', { colors: state.colors });
    });

    const unsubLabReferences = useLabReferenceStore.subscribe((state) => {
      scheduleSave('lab-references', { overrides: state.overrides });
    });

    return () => {
      unsubCharting();
      unsubSchedule();
      unsubCalendar();
      unsubLabReferences();
      Object.values(saveTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      saveTimersRef.current = {};
    };
  }, [currentUser]);
}
