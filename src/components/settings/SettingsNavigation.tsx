import {
  Bot,
  Calendar,
  FileText,
  FlaskConical,
  HardDrive,
  Lock,
  Shield,
  Unlock,
} from 'lucide-react';
import {
  SETTINGS_GROUPS,
  type SettingsSectionDescriptor,
  type SettingsSectionIconKey,
  type SettingsSectionId,
} from '@/lib/settingsNavigation';
import { cn } from '@/utils/cn';

const SECTION_ICONS: Record<SettingsSectionIconKey, React.ComponentType<{ className?: string }>> = {
  bot: Bot,
  calendar: Calendar,
  fileText: FileText,
  flask: FlaskConical,
  hardDrive: HardDrive,
  lock: Lock,
  shield: Shield,
  unlock: Unlock,
};

export function SettingsSidebar({
  sections,
  activeSection,
  userName,
  backendLabel,
  onSelect,
}: {
  sections: SettingsSectionDescriptor[];
  activeSection: SettingsSectionId;
  userName: string;
  backendLabel: string;
  onSelect: (id: SettingsSectionId) => void;
}) {
  return (
    <nav className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3 md:block xl:w-60">
      <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <div className="text-xs font-medium text-zinc-500">현재 사용자</div>
        <div className="mt-1 truncate text-sm font-semibold text-zinc-950">{userName}</div>
        <div className="mt-0.5 text-xs text-zinc-500">{backendLabel} 모드</div>
      </div>
      {SETTINGS_GROUPS.map((group) => {
        const items = sections.filter((section) => section.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="mb-4">
            <h2 className="mb-1.5 px-2 text-[11px] font-semibold text-zinc-400">{group}</h2>
            <div className="space-y-1">
              {items.map((section) => (
                <SettingsNavButton
                  key={section.id}
                  section={section}
                  active={activeSection === section.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function SettingsMobileNav({
  sections,
  activeSection,
  onSelect,
}: {
  sections: SettingsSectionDescriptor[];
  activeSection: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
}) {
  return (
    <div className="fixed left-0 right-0 top-14 z-20 overflow-x-auto border-b border-zinc-200 bg-white md:hidden">
      <div className="flex min-w-max gap-1 p-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs whitespace-nowrap transition-colors',
              activeSection === section.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsNavButton({
  section,
  active,
  onSelect,
}: {
  section: SettingsSectionDescriptor;
  active: boolean;
  onSelect: (id: SettingsSectionId) => void;
}) {
  const Icon = SECTION_ICONS[section.icon];
  return (
    <button
      onClick={() => onSelect(section.id)}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        active
          ? 'bg-zinc-900 font-medium text-white'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{section.label}</span>
    </button>
  );
}
