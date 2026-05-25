import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_COLORS, useCalendarColorStore } from './useCalendarColorStore';

describe('useCalendarColorStore', () => {
  beforeEach(() => {
    useCalendarColorStore.setState({ colors: { ...DEFAULT_COLORS } });
  });

  it('replaces only valid color keys and preserves fallbacks', () => {
    useCalendarColorStore.getState().replaceColors({
      schedule: 'red',
      global_alert: 'not-a-color',
      reminder: 123,
    });

    expect(useCalendarColorStore.getState().colors).toEqual({
      schedule: 'red',
      global_alert: DEFAULT_COLORS.global_alert,
      reminder: DEFAULT_COLORS.reminder,
    });
  });
});

