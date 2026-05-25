export type SettingsSectionId =
  | 'pin'
  | 'admin'
  | 'charting'
  | 'schedule-cat'
  | 'calendar-color'
  | 'lab-cat'
  | 'lab-ref'
  | 'lab-import'
  | 'ai'
  | 'backup';

export type SettingsSectionGroup = '계정' | '업무' | 'Lab' | '시스템';
export type SettingsSectionIconKey =
  | 'bot'
  | 'calendar'
  | 'fileText'
  | 'flask'
  | 'hardDrive'
  | 'lock'
  | 'shield'
  | 'unlock';

export interface SettingsSectionDescriptor {
  id: SettingsSectionId;
  label: string;
  icon: SettingsSectionIconKey;
  group: SettingsSectionGroup;
}

export const SETTINGS_GROUPS: SettingsSectionGroup[] = ['계정', '업무', 'Lab', '시스템'];

export const KNOWN_SETTINGS_SECTIONS: SettingsSectionId[] = [
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
];

export function isSettingsSectionId(value: string | null): value is SettingsSectionId {
  return !!value && KNOWN_SETTINGS_SECTIONS.includes(value as SettingsSectionId);
}

export function getInitialSettingsSection(value: string | null): SettingsSectionId {
  return isSettingsSectionId(value) ? value : 'pin';
}

export function buildSettingsSections(input: {
  hasPin: boolean;
  isAdmin: boolean;
  useSupabaseBackend: boolean;
}): SettingsSectionDescriptor[] {
  return [
    {
      id: 'pin',
      label: 'PIN 잠금',
      icon: input.hasPin ? 'lock' : 'unlock',
      group: '계정',
    },
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
    { id: 'calendar-color', label: '캘린더 색상', icon: 'calendar', group: '업무' },
    { id: 'lab-cat', label: 'Lab 카테고리', icon: 'flask', group: 'Lab' },
    { id: 'lab-ref', label: 'Lab 참조범위', icon: 'flask', group: 'Lab' },
    { id: 'lab-import', label: 'Lab Import', icon: 'flask', group: 'Lab' },
    { id: 'ai', label: 'AI 설정', icon: 'bot', group: '시스템' },
    {
      id: 'backup',
      label: input.useSupabaseBackend ? 'Supabase 백업' : '백업 / 복원',
      icon: 'hardDrive',
      group: '시스템',
    },
  ];
}
