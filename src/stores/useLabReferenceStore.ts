import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LAB_REFERENCES } from '@/utils/labReference';
import type { LabReference } from '@/types/lab';

interface LabReferenceStore {
  // User overrides — merged on top of defaults
  overrides: Record<string, { min?: number; max?: number }>;

  setOverride: (name: string, min?: number, max?: number) => void;
  removeOverride: (name: string) => void;
  resetAll: () => void;

  // Get effective reference for an item name
  getReference: (name: string) => { min?: number; max?: number } | undefined;

  // Get all items (defaults + overrides merged) for settings UI
  getAllReferences: () => Array<LabReference & { isOverridden: boolean }>;

  // Check if value is abnormal using overrides
  checkAbnormal: (name: string, value: number) => { isAbnormal: boolean; hlFlag?: 'H' | 'L' };
}

export const useLabReferenceStore = create<LabReferenceStore>()(
  persist(
    (set, get) => ({
      overrides: {},

      setOverride: (name, min, max) => {
        set((state) => ({
          overrides: {
            ...state.overrides,
            [name.toLowerCase()]: { min, max },
          },
        }));
      },

      removeOverride: (name) => {
        set((state) => {
          const next = { ...state.overrides };
          delete next[name.toLowerCase()];
          return { overrides: next };
        });
      },

      resetAll: () => set({ overrides: {} }),

      getReference: (name) => {
        const key = name.toLowerCase();
        const override = get().overrides[key];
        if (override) return override;

        // Fallback to default
        const def = LAB_REFERENCES.find((r) => r.name.toLowerCase() === key);
        if (def) return { min: def.referenceMin, max: def.referenceMax };

        return undefined;
      },

      getAllReferences: () => {
        const overrides = get().overrides;
        const result: Array<LabReference & { isOverridden: boolean }> = [];

        for (const def of LAB_REFERENCES) {
          const key = def.name.toLowerCase();
          const override = overrides[key];
          result.push({
            ...def,
            referenceMin: override?.min ?? def.referenceMin,
            referenceMax: override?.max ?? def.referenceMax,
            isOverridden: !!override,
          });
        }

        // Add any overrides that aren't in defaults
        for (const [key, val] of Object.entries(overrides)) {
          if (!LAB_REFERENCES.find((r) => r.name.toLowerCase() === key)) {
            result.push({
              code: '',
              name: key,
              category: 'Other' as LabReference['category'],
              unit: '',
              referenceMin: val.min,
              referenceMax: val.max,
              isOverridden: true,
            });
          }
        }

        return result;
      },

      checkAbnormal: (name, value) => {
        const ref = get().getReference(name);
        if (!ref) return { isAbnormal: false };

        if (ref.max !== undefined && value > ref.max) {
          return { isAbnormal: true, hlFlag: 'H' };
        }
        if (ref.min !== undefined && value < ref.min) {
          return { isAbnormal: true, hlFlag: 'L' };
        }
        return { isAbnormal: false };
      },
    }),
    {
      name: 'wardflow-lab-references',
    }
  )
);
