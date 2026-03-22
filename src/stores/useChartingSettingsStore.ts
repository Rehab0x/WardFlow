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
  resetSectionNames: () => void;

  // 전체 CopyFormat 반환
  getCopyFormat: () => ChartingCopyFormat;
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
