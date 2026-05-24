import {
  CalendarDays,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  NotebookText,
  Pill,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkspaceTabId =
  | 'overview'
  | 'charting'
  | 'lab'
  | 'medications'
  | 'notes'
  | 'schedule';

const tabs: Array<{ id: WorkspaceTabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: '요약', icon: LayoutDashboard },
  { id: 'charting', label: '차팅', icon: FileText },
  { id: 'lab', label: 'Lab', icon: FlaskConical },
  { id: 'medications', label: '약제', icon: Pill },
  { id: 'notes', label: '메모', icon: NotebookText },
  { id: 'schedule', label: '일정', icon: CalendarDays },
];

interface WorkspaceTabsProps {
  value: WorkspaceTabId;
  unsavedTabs?: WorkspaceTabId[];
  tabBadges?: Partial<Record<WorkspaceTabId, number>>;
  onChange: (value: WorkspaceTabId) => void;
}

export function WorkspaceTabs({
  value,
  unsavedTabs = [],
  tabBadges = {},
  onChange,
}: WorkspaceTabsProps) {
  const unsavedCount = unsavedTabs.length;

  return (
    <div className="flex h-10 items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-3">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = value === tab.id;
        const unsaved = unsavedTabs.includes(tab.id);
        const badge = tabBadges[tab.id] ?? 0;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors',
              active
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
            {badge > 0 && (
              <span
                className={cn(
                  'inline-flex h-4 min-w-4 items-center justify-center rounded border px-1 font-mono text-[9.5px] tabular-nums',
                  active
                    ? 'border-white/20 bg-white/10 text-white'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-500'
                )}
              >
                {badge}
              </span>
            )}
            {unsaved && (
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  active ? 'bg-amber-200' : 'bg-amber-500'
                )}
                aria-label="미저장 변경"
              />
            )}
          </button>
        );
      })}
      <div className="ml-auto hidden shrink-0 items-center gap-1 text-[11px] text-zinc-400 md:flex">
        <ClipboardList className="h-3.5 w-3.5" />
        {unsavedCount > 0 ? `미저장 ${unsavedCount}` : 'OCS 복사 준비'}
      </div>
    </div>
  );
}
