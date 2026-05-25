import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_COPY_FORMAT } from '@/types/charting';
import { useChartingSettingsStore } from './useChartingSettingsStore';

describe('useChartingSettingsStore', () => {
  beforeEach(() => {
    useChartingSettingsStore.setState({
      problemListStyle: 'numbered_simple',
      includeFieldNames: true,
      excludeEmptySections: true,
      sectionSeparator: '\n\n',
      sectionNames: { ...DEFAULT_COPY_FORMAT.sectionNames },
    });
  });

  it('normalizes hydrated charting settings', () => {
    useChartingSettingsStore.getState().replaceSettings({
      problemListStyle: 'plain',
      includeFieldNames: false,
      excludeEmptySections: 'nope',
      sectionSeparator: '---',
      sectionNames: {
        chiefComplaint: '  C/C  ',
        plan: '',
      },
    });

    const state = useChartingSettingsStore.getState();
    expect(state.problemListStyle).toBe('plain');
    expect(state.includeFieldNames).toBe(false);
    expect(state.excludeEmptySections).toBe(true);
    expect(state.sectionSeparator).toBe('\n\n');
    expect(state.sectionNames.chiefComplaint).toBe('C/C');
    expect(state.sectionNames.plan).toBe(DEFAULT_COPY_FORMAT.sectionNames.plan);
  });
});

