import { describe, expect, it } from 'vitest';
import { normalizeSettingText, validateScheduleCategories } from './WorkSettings';

describe('WorkSettings helpers', () => {
  it('normalizes compact setting labels', () => {
    expect(normalizeSettingText('  MRI   follow  up  ')).toBe('MRI follow up');
  });

  it('validates schedule categories before saving drafts', () => {
    expect(
      validateScheduleCategories([
        { id: 'one', label: '  외래  ', color: 'blue' },
        { id: 'two', label: '검사', color: 'not-a-color' },
      ])
    ).toEqual({
      errors: [],
      normalized: [
        { id: 'one', label: '외래', color: 'blue' },
        { id: 'two', label: '검사', color: 'gray' },
      ],
    });

    expect(
      validateScheduleCategories([
        { id: 'one', label: '외래', color: 'blue' },
        { id: 'two', label: ' 외래 ', color: 'red' },
      ]).errors[0]
    ).toContain('중복');

    expect(validateScheduleCategories([]).errors[0]).toContain('하나 이상');
  });
});
