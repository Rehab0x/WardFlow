export type SettingsSectionId =
  | 'admin'
  | 'charting'
  | 'schedule-cat'
  | 'alert-rules'
  | 'lab-cat'
  | 'lab-ref'
  | 'lab-import'
  | 'ai'
  | 'backup';

export type SettingsSectionGroup = '계정' | '업무' | 'Lab' | '시스템';
export type SettingsSectionIconKey =
  | 'bell'
  | 'bot'
  | 'calendar'
  | 'fileText'
  | 'flask'
  | 'hardDrive'
  | 'shield';

export interface SettingsSectionDescriptor {
  id: SettingsSectionId;
  label: string;
  icon: SettingsSectionIconKey;
  group: SettingsSectionGroup;
}

export const SETTINGS_GROUPS: SettingsSectionGroup[] = ['계정', '업무', 'Lab', '시스템'];

export const KNOWN_SETTINGS_SECTIONS: SettingsSectionId[] = [
  'admin',
  'charting',
  'schedule-cat',
  'alert-rules',
  'lab-cat',
  'lab-ref',
  'lab-import',
  'ai',
  'backup',
];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'charting';

export function isSettingsSectionId(value: string | null): value is SettingsSectionId {
  return !!value && KNOWN_SETTINGS_SECTIONS.includes(value as SettingsSectionId);
}

export function getInitialSettingsSection(value: string | null): SettingsSectionId {
  return isSettingsSectionId(value) ? value : DEFAULT_SETTINGS_SECTION;
}

export function buildSettingsSections(input: { isAdmin: boolean }): SettingsSectionDescriptor[] {
  return [
    ...(input.isAdmin
      ? [
          {
            id: 'admin' as const,
            label: '사용자 관리',
            icon: 'shield' as const,
            group: '계정' as const,
          },
        ]
      : []),
    { id: 'charting', label: '차팅 설정', icon: 'fileText', group: '업무' },
    { id: 'schedule-cat', label: '일정 카테고리', icon: 'calendar', group: '업무' },
    { id: 'alert-rules', label: '알림 규칙', icon: 'bell', group: '업무' },
    { id: 'lab-cat', label: 'Lab 카테고리', icon: 'flask', group: 'Lab' },
    { id: 'lab-ref', label: 'Lab 참조범위', icon: 'flask', group: 'Lab' },
    { id: 'lab-import', label: 'Lab Import', icon: 'flask', group: 'Lab' },
    { id: 'ai', label: 'AI 설정', icon: 'bot', group: '시스템' },
    { id: 'backup', label: '백업 스냅샷', icon: 'hardDrive', group: '시스템' },
  ];
}
