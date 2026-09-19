import { useEffect, useRef } from 'react';
import { getUserSetting, setUserSetting } from '@/data/settings.repository';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChartingSettingsStore } from '@/stores/useChartingSettingsStore';
import { useLabReferenceStore } from '@/stores/useLabReferenceStore';
import { useScheduleCategoryStore } from '@/stores/useScheduleCategoryStore';
import { useSettingsSyncStatusStore } from '@/stores/useSettingsSyncStatusStore';
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

type LabReferencesPayload = {
  overrides?: ReturnType<typeof useLabReferenceStore.getState>['overrides'];
};

export function useSupabaseUserSettingsSync() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const hydratedRef = useRef(false);
  const saveTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;
    hydratedRef.current = false;
    useSettingsSyncStatusStore.getState().clearAll();

    const hydrate = async () => {
      try {
        const [chartingRaw, scheduleCategoriesRaw, labReferencesRaw] = await Promise.all([
          getUserSetting<Json>('charting-settings'),
          getUserSetting<Json>('schedule-categories'),
          getUserSetting<Json>('lab-references'),
        ]);

        if (cancelled) return;

        const charting = chartingRaw as ChartingSettingsPayload | null;
        const scheduleCategories = scheduleCategoriesRaw as ScheduleCategoriesPayload | null;
        const labReferences = labReferencesRaw as LabReferencesPayload | null;

        if (charting) {
          useChartingSettingsStore.getState().replaceSettings(charting);
        }

        if (scheduleCategories?.categories) {
          useScheduleCategoryStore.getState().replaceCategories(scheduleCategories.categories);
        }

        if (labReferences?.overrides) {
          useLabReferenceStore.getState().replaceOverrides(labReferences.overrides);
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
      useSettingsSyncStatusStore.getState().clearAll();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const scheduleSave = (key: string, value: unknown) => {
      if (!hydratedRef.current) return;

      const { markPending, markSaved, markError } = useSettingsSyncStatusStore.getState();
      const timers = saveTimersRef.current;
      if (timers[key]) window.clearTimeout(timers[key]);
      const version = markPending(key);

      timers[key] = window.setTimeout(() => {
        setUserSetting(key, value as Json)
          .then(() => markSaved(key, version))
          .catch((error) => {
            markError(key, error, version);
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

    const unsubLabReferences = useLabReferenceStore.subscribe((state) => {
      scheduleSave('lab-references', { overrides: state.overrides });
    });

    return () => {
      unsubCharting();
      unsubSchedule();
      unsubLabReferences();
      Object.values(saveTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      saveTimersRef.current = {};
    };
  }, [currentUser]);
}
