import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsSyncStatusStore } from './useSettingsSyncStatusStore';

describe('useSettingsSyncStatusStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T00:00:00Z'));
    useSettingsSyncStatusStore.getState().clearAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tracks pending, saved, and error states with timestamps', () => {
    const store = useSettingsSyncStatusStore.getState();

    const version = store.markPending(' charting-settings ');
    expect(useSettingsSyncStatusStore.getState().statuses['charting-settings']).toMatchObject({
      state: 'pending',
      error: null,
      updatedAt: Date.now(),
      version,
    });

    store.markSaved('charting-settings', version);
    expect(useSettingsSyncStatusStore.getState().statuses['charting-settings']).toMatchObject({
      state: 'saved',
      error: null,
      version,
    });

    const errorVersion = store.markPending('charting-settings');
    store.markError('charting-settings', new Error('Supabase timeout'), errorVersion);
    expect(useSettingsSyncStatusStore.getState().statuses['charting-settings']).toMatchObject({
      state: 'error',
      error: 'Supabase timeout',
      version: errorVersion,
    });
  });

  it('ignores stale completions from older saves', () => {
    const store = useSettingsSyncStatusStore.getState();
    const firstVersion = store.markPending('schedule-categories');
    const secondVersion = store.markPending('schedule-categories');

    store.markSaved('schedule-categories', firstVersion);
    expect(useSettingsSyncStatusStore.getState().statuses['schedule-categories']).toMatchObject({
      state: 'pending',
      version: secondVersion,
    });

    store.markError('schedule-categories', 'late failure', firstVersion);
    expect(useSettingsSyncStatusStore.getState().statuses['schedule-categories']).toMatchObject({
      state: 'pending',
      error: null,
      version: secondVersion,
    });

    store.markSaved('schedule-categories', secondVersion);
    expect(useSettingsSyncStatusStore.getState().statuses['schedule-categories']).toMatchObject({
      state: 'saved',
      version: secondVersion,
    });
  });

  it('clears one status or every status', () => {
    const store = useSettingsSyncStatusStore.getState();
    store.markPending('lab-references');
    store.markPending('calendar-colors');

    store.clearStatus(' lab-references ');
    expect(useSettingsSyncStatusStore.getState().statuses).not.toHaveProperty('lab-references');
    expect(useSettingsSyncStatusStore.getState().statuses).toHaveProperty('calendar-colors');

    store.clearAll();
    expect(useSettingsSyncStatusStore.getState().statuses).toEqual({});
  });
});
