import { describe, expect, it } from 'vitest';
import {
  KNOWN_SETTINGS_SECTIONS,
  SETTINGS_GROUPS,
  buildSettingsSections,
  getInitialSettingsSection,
  isSettingsSectionId,
} from './settingsNavigation';

describe('settingsNavigation', () => {
  it('recognizes known settings section ids', () => {
    expect(isSettingsSectionId('pin')).toBe(true);
    expect(isSettingsSectionId('backup')).toBe(true);
    expect(isSettingsSectionId('unknown')).toBe(false);
    expect(isSettingsSectionId(null)).toBe(false);
  });

  it('falls back to the pin section for invalid route params', () => {
    expect(getInitialSettingsSection('lab-ref')).toBe('lab-ref');
    expect(getInitialSettingsSection('bad-section')).toBe('pin');
    expect(getInitialSettingsSection(null)).toBe('pin');
  });

  it('keeps section ids and group order stable', () => {
    expect(KNOWN_SETTINGS_SECTIONS).toEqual([
      'pin',
      'admin',
      'charting',
      'schedule-cat',
      'calendar-color',
      'lab-cat',
      'lab-ref',
      'lab-import',
      'ai',
      'backup',
    ]);
    expect(SETTINGS_GROUPS).toEqual(['계정', '업무', 'Lab', '시스템']);
  });

  it('builds visible sections from auth/backend state', () => {
    const adminSupabase = buildSettingsSections({
      hasPin: true,
      isAdmin: true,
      useSupabaseBackend: true,
    });

    expect(adminSupabase.map((section) => section.id)).toContain('admin');
    expect(adminSupabase.find((section) => section.id === 'pin')).toMatchObject({ icon: 'lock' });
    expect(adminSupabase.find((section) => section.id === 'backup')).toMatchObject({
      label: 'Supabase 백업',
    });

    const memberLegacy = buildSettingsSections({
      hasPin: false,
      isAdmin: false,
      useSupabaseBackend: false,
    });

    expect(memberLegacy.map((section) => section.id)).not.toContain('admin');
    expect(memberLegacy.find((section) => section.id === 'pin')).toMatchObject({
      icon: 'unlock',
    });
    expect(memberLegacy.find((section) => section.id === 'backup')).toMatchObject({
      label: '백업 / 복원',
    });
  });
});
