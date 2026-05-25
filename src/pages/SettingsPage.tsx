import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AdminSettings } from '@/components/settings/AdminSettings';
import { BackupSettings } from '@/components/settings/BackupSettings';
import { PinSettings } from '@/components/settings/PinSettings';
import { SettingsMobileNav, SettingsSidebar } from '@/components/settings/SettingsNavigation';
import {
  LabCategorySettings,
  LabImportSettings,
  LabReferenceSettings,
} from '@/components/settings/LabSettings';
import {
  AISettings,
  CalendarColorSettings,
  ChartingSettings,
  ScheduleCategorySettings,
} from '@/components/settings/WorkSettings';
import { useSupabaseBackend } from '@/config/backend';
import { usePinLockStore } from '@/hooks/usePinLock';
import {
  buildSettingsSections,
  getInitialSettingsSection,
  isSettingsSectionId,
  type SettingsSectionId,
} from '@/lib/settingsNavigation';
import { useAuthStore } from '@/stores/useAuthStore';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuthStore();
  const hasPin = usePinLockStore((state) => state.hasPin);
  const isAdmin = currentUser?.role === 'admin';
  const requestedSection = searchParams.get('section');
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(
    getInitialSettingsSection(requestedSection)
  );

  const sections = useMemo(
    () => buildSettingsSections({ hasPin, isAdmin, useSupabaseBackend }),
    [hasPin, isAdmin, useSupabaseBackend]
  );
  const sectionPanels = useMemo(
    () =>
      ({
        pin: <PinSettings />,
        admin: isAdmin ? (
          <AdminSettings />
        ) : (
          <EmptySection title="사용자 관리" message="관리자 계정에서만 접근할 수 있습니다." />
        ),
        charting: <ChartingSettings />,
        'schedule-cat': <ScheduleCategorySettings />,
        'calendar-color': <CalendarColorSettings />,
        'lab-cat': <LabCategorySettings />,
        'lab-ref': <LabReferenceSettings />,
        'lab-import': <LabImportSettings />,
        ai: <AISettings />,
        backup: <BackupSettings />,
      }) satisfies Record<SettingsSectionId, React.ReactNode>,
    [isAdmin]
  );

  useEffect(() => {
    if (isSettingsSectionId(requestedSection) && requestedSection !== activeSection) {
      setActiveSection(requestedSection);
    }
  }, [activeSection, requestedSection]);

  const selectSection = (id: SettingsSectionId) => {
    setActiveSection(id);
    setSearchParams({ section: id }, { replace: true });
  };

  const sectionClass = (id: SettingsSectionId) => (activeSection === id ? 'block' : 'hidden');

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-zinc-950">WardFlow 설정</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {useSupabaseBackend ? 'Supabase v2 환경' : 'Legacy IndexedDB 환경'}
            </p>
          </div>
        </div>
        <Badge variant={useSupabaseBackend ? 'default' : 'outline'} className="text-[11px]">
          {useSupabaseBackend ? 'Supabase' : 'Legacy'}
        </Badge>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <SettingsSidebar
          sections={sections}
          activeSection={activeSection}
          userName={currentUser?.name ?? '-'}
          backendLabel={useSupabaseBackend ? 'Supabase' : 'Legacy'}
          onSelect={selectSection}
        />
        <SettingsMobileNav
          sections={sections}
          activeSection={activeSection}
          onSelect={selectSection}
        />

        <main className="min-w-0 flex-1 p-3 pt-16 sm:p-6 sm:pt-20 md:pt-6">
          <div className="mx-auto max-w-3xl space-y-4">
            {Object.entries(sectionPanels).map(([id, panel]) => (
              <div key={id} className={sectionClass(id as SettingsSectionId)}>
                {panel}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

function EmptySection({ title, message }: { title: string; message: string }) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </Card>
  );
}

export default SettingsPage;
