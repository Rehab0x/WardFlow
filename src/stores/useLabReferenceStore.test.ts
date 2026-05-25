import { beforeEach, describe, expect, it } from 'vitest';
import { useLabReferenceStore } from './useLabReferenceStore';

describe('useLabReferenceStore', () => {
  beforeEach(() => {
    useLabReferenceStore.setState({ overrides: {} });
  });

  it('stores only finite numeric overrides', () => {
    useLabReferenceStore.getState().setOverride('WBC', Number.NaN, 10);

    expect(useLabReferenceStore.getState().overrides.wbc).toEqual({ min: undefined, max: 10 });
  });

  it('removes an override when both bounds are cleared or invalid', () => {
    useLabReferenceStore.getState().setOverride('CRP', 0, 0.5);
    useLabReferenceStore.getState().setOverride('CRP', Number.NaN, Number.POSITIVE_INFINITY);

    expect(useLabReferenceStore.getState().overrides.crp).toBeUndefined();
  });

  it('normalizes hydrated overrides', () => {
    useLabReferenceStore.getState().replaceOverrides({
      ' WBC ': { min: 1, max: Number.POSITIVE_INFINITY },
      CRP: { min: 'bad', max: 0.5 },
      empty: { min: Number.NaN, max: undefined },
      nope: null,
    });

    expect(useLabReferenceStore.getState().overrides).toEqual({
      wbc: { min: 1, max: undefined },
      crp: { min: undefined, max: 0.5 },
    });
  });
});
