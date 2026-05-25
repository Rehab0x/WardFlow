import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES, useScheduleCategoryStore } from './useScheduleCategoryStore';

describe('useScheduleCategoryStore', () => {
  beforeEach(() => {
    useScheduleCategoryStore.setState({ categories: [...DEFAULT_CATEGORIES] });
  });

  it('normalizes categories when replacing settings', () => {
    useScheduleCategoryStore.getState().replaceCategories([
      { id: 'one', label: '  외진  ', color: 'red' },
      { id: 'duplicate', label: '외진', color: 'blue' },
      { id: 'blank', label: '   ', color: 'green' },
      { id: 'bad-color', label: '새 일정', color: 'not-a-color' },
    ]);

    expect(useScheduleCategoryStore.getState().categories).toEqual([
      { id: 'one', label: '외진', color: 'red' },
      { id: 'bad-color', label: '새 일정', color: 'gray' },
    ]);
  });

  it('keeps at least the default categories after an empty replace', () => {
    useScheduleCategoryStore.getState().replaceCategories([]);

    expect(useScheduleCategoryStore.getState().categories).toEqual(DEFAULT_CATEGORIES);
  });
});

