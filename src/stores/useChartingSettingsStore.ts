import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_COPY_FORMAT } from '@/types/charting';
import type { ChartingCopyFormat } from '@/types/charting';

type ProblemListStyle = 'numbered' | 'numbered_simple' | 'bulleted' | 'plain';

interface SectionNames {
  chiefComplaint: string;
  onset: string;
  presentIllness: string;
  pastHistory: string;
  reviewOfSystem: string;
  physicalExam: string;
  problemList: string;
  plan: string;
  guardianExplanation: string;
  etc: string;
}

interface ChartingSettingsStore {
  problemListStyle: ProblemListStyle;
  includeFieldNames: boolean;
  excludeEmptySections: boolean;
  sectionSeparator: string;
  sectionNames: SectionNames;

  setProblemListStyle: (style: ProblemListStyle) => void;
  setIncludeFieldNames: (v: boolean) => void;
  setExcludeEmptySections: (v: boolean) => void;
  setSectionSeparator: (v: string) => void;
  setSectionName: (key: keyof SectionNames, value: string) => void;
  replaceSettings: (settings: Partial<{
    problemListStyle: unknown;
    includeFieldNames: unknown;
    excludeEmptySections: unknown;
    sectionSeparator: unknown;
    sectionNames: Partial<Record<keyof SectionNames, unknown>>;
  }>) => void;
  resetSectionNames: () => void;

  // 전체 CopyFormat 반환
  getCopyFormat: () => ChartingCopyFormat;
}

const PROBLEM_LIST_STYLES: ProblemListStyle[] = ['numbered', 'numbered_simple', 'bulleted', 'plain'];
const SECTION_NAME_KEYS = Object.keys(DEFAULT_COPY_FORMAT.sectionNames) as Array<keyof SectionNames>;

function normalizeProblemListStyle(value: unknown, fallback: ProblemListStyle): ProblemListStyle {
  return PROBLEM_LIST_STYLES.includes(value as ProblemListStyle) ? value as ProblemListStyle : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeSectionSeparator(value: unknown, fallback: string): string {
  return value === '\n' || value === '\n\n' ? value : fallback;
}

function normalizeSectionNames(
  value: Partial<Record<keyof SectionNames, unknown>> | undefined,
  fallback: SectionNames
): SectionNames {
  if (!value || typeof value !== 'object') return fallback;

  const next = { ...fallback };
  for (const key of SECTION_NAME_KEYS) {
    const label = value[key];
    if (typeof label === 'string' && label.trim()) {
      next[key] = label.trim();
    }
  }
  return next;
}

export const useChartingSettingsStore = create<ChartingSettingsStore>()(
  persist(
    (set, get) => ({
      problemListStyle: 'numbered_simple',
      includeFieldNames: true,
      excludeEmptySections: true,
      sectionSeparator: '\n\n',
      sectionNames: { ...DEFAULT_COPY_FORMAT.sectionNames },

      setProblemListStyle: (style) => set({ problemListStyle: style }),
      setIncludeFieldNames: (v) => set({ includeFieldNames: v }),
      setExcludeEmptySections: (v) => set({ excludeEmptySections: v }),
      setSectionSeparator: (v) => set({ sectionSeparator: v }),
      setSectionName: (key, value) =>
        set((state) => ({
          sectionNames: { ...state.sectionNames, [key]: value },
        })),
      replaceSettings: (settings) =>
        set((state) => ({
          problemListStyle: normalizeProblemListStyle(settings.problemListStyle, state.problemListStyle),
          includeFieldNames: normalizeBoolean(settings.includeFieldNames, state.includeFieldNames),
          excludeEmptySections: normalizeBoolean(settings.excludeEmptySections, state.excludeEmptySections),
          sectionSeparator: normalizeSectionSeparator(settings.sectionSeparator, state.sectionSeparator),
          sectionNames: normalizeSectionNames(settings.sectionNames, state.sectionNames),
        })),
      resetSectionNames: () =>
        set({ sectionNames: { ...DEFAULT_COPY_FORMAT.sectionNames } }),

      getCopyFormat: () => {
        const s = get();
        return {
          sectionSeparator: s.sectionSeparator,
          fieldSeparator: DEFAULT_COPY_FORMAT.fieldSeparator,
          includeFieldNames: s.includeFieldNames,
          excludeEmptySections: s.excludeEmptySections,
          problemListStyle: s.problemListStyle,
          sectionNames: s.sectionNames,
        };
      },
    }),
    {
      name: 'wardflow-charting-settings',
    }
  )
);
