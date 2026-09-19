import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS_SECTION,
  KNOWN_SETTINGS_SECTIONS,
  SETTINGS_GROUPS,
  buildSettingsSections,
  getInitialSettingsSection,
  isSettingsSectionId,
} from './settingsNavigation';

describe('settingsNavigation', () => {
  it('recognizes known settings section ids', () => {
    expect(isSettingsSectionId('charting')).toBe(true);
    expect(isSettingsSectionId('backup')).toBe(true);
    expect(isSettingsSectionId('unknown')).toBe(false);
    expect(isSettingsSectionId(null)).toBe(false);
  });

  it('no longer recognizes removed sections', () => {
    expect(isSettingsSectionId('pin')).toBe(false);
    expect(isSettingsSectionId('calendar-color')).toBe(false);
  });

  it('falls back to the default section for invalid route params', () => {
    expect(getInitialSettingsSection('lab-ref')).toBe('lab-ref');
    expect(getInitialSettingsSection('bad-section')).toBe(DEFAULT_SETTINGS_SECTION);
    expect(getInitialSettingsSection(null)).toBe(DEFAULT_SETTINGS_SECTION);
  });

  it('keeps section ids and group order stable', () => {
    expect(KNOWN_SETTINGS_SECTIONS).toEqual([
      'admin',
      'charting',
      'schedule-cat',
      'lab-cat',
      'lab-ref',
      'lab-import',
      'ai',
      'backup',
    ]);
    expect(SETTINGS_GROUPS).toEqual(['계정', '업무', 'Lab', '시스템']);
  });

  it('shows the admin section only to admins', () => {
    const admin = buildSettingsSections({ isAdmin: true });
    expect(admin.map((section) => section.id)).toContain('admin');

    const member = buildSettingsSections({ isAdmin: false });
    expect(member.map((section) => section.id)).not.toContain('admin');
    expect(member[0]?.id).toBe(DEFAULT_SETTINGS_SECTION);
  });
});
