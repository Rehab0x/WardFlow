import { Home, Settings, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Patient } from '@/db/database';
import { cn } from '@/lib/utils';
import { formatDetailedAge } from '../clinical/dateLabels';
import { PatientRail, type PatientRailIndicators } from './PatientRail';
import { TopBar } from './TopBar';

interface AppShellV2Props {
  patients: Patient[];
  userName?: string;
  selectedPatientId?: string;
  patientIndicators?: Record<string, PatientRailIndicators>;
  searchValue?: string;
  activeMobileAction?: 'today' | 'patients' | 'settings';
  children: ReactNode;
  onSearchChange?: (value: string) => void;
  onAddPatient?: () => boolean | void;
  onOpenLabImport?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  onPatientSelect?: (patientId: string) => boolean | void;
  onToday?: () => boolean | void;
}

export function AppShellV2({
  patients,
  userName,
  selectedPatientId,
  patientIndicators,
  searchValue,
  activeMobileAction,
  children,
  onSearchChange,
  onAddPatient,
  onOpenLabImport,
  onSettings,
  onLogout,
  onPatientSelect,
  onToday,
}: AppShellV2Props) {
  const [patientsOpen, setPatientsOpen] = useState(false);
  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId),
    [patients, selectedPatientId]
  );
  const openPatients = useCallback(() => setPatientsOpen(true), []);
  const closePatients = useCallback(() => setPatientsOpen(false), []);

  useEffect(() => {
    if (!patientsOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPatientsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [patientsOpen]);

  const handlePatientSelect = useCallback(
    (patientId: string) => {
      const shouldClose = onPatientSelect?.(patientId);
      if (shouldClose === false) return;
      setPatientsOpen(false);
    },
    [onPatientSelect]
  );

  const handleToday = useCallback(() => {
    const shouldClose = onToday?.();
    if (shouldClose === false) return;
    setPatientsOpen(false);
  }, [onToday]);

  const handleSettings = useCallback(() => {
    setPatientsOpen(false);
    onSettings?.();
  }, [onSettings]);

  const handleAddPatient = useCallback(() => {
    const shouldClose = onAddPatient?.();
    if (shouldClose === false) return;
    setPatientsOpen(false);
  }, [onAddPatient]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 text-zinc-900">
      <TopBar
        userName={userName}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onAddPatient={handleAddPatient}
        onOpenLabImport={onOpenLabImport}
        onToday={handleToday}
        onSettings={handleSettings}
        onLogout={onLogout}
        onTogglePatients={openPatients}
      />

      <div className="flex min-h-0 flex-1 pb-12 md:pb-0">
        <PatientRail
          patients={patients}
          selectedPatientId={selectedPatientId}
          patientIndicators={patientIndicators}
          onPatientSelect={handlePatientSelect}
          onAddPatient={handleAddPatient}
          className="hidden md:flex"
        />

        <div
          className={cn(
            'fixed inset-0 z-40 transition-opacity duration-200 md:hidden',
            patientsOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          aria-hidden={!patientsOpen}
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/35"
            aria-label="환자 목록 닫기"
            onClick={closePatients}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="환자 목록"
            className={cn(
              'relative flex h-full w-[min(20rem,88vw)] flex-col bg-white shadow-2xl transition-transform duration-200 ease-out',
              patientsOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <div className="flex h-12 items-center justify-between border-b border-zinc-200 px-3">
              <span className="text-[13px] font-medium text-zinc-900">환자 목록</span>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="환자 목록 닫기"
                onClick={closePatients}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <PatientRail
              patients={patients}
              selectedPatientId={selectedPatientId}
              patientIndicators={patientIndicators}
              onPatientSelect={handlePatientSelect}
              onAddPatient={handleAddPatient}
              className="min-h-0 w-full border-r-0"
            />
          </div>
        </div>

        {selectedPatient && (
          <div className="fixed inset-x-0 top-12 z-20 border-b border-zinc-200 bg-white/95 px-3 py-1.5 backdrop-blur-md md:hidden">
            <button
              type="button"
              onClick={openPatients}
              aria-label={`${selectedPatient.roomBed} ${selectedPatient.name} 환자 목록 열기`}
              className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-left"
            >
              <span className="font-mono text-[11px] text-zinc-400">{selectedPatient.roomBed}</span>
              <span className="min-w-0 truncate text-[12px] font-medium text-zinc-900">
                {selectedPatient.name}
                <span className="ml-1.5 font-mono text-[10.5px] font-normal text-zinc-400">
                  {selectedPatient.sex}/{formatDetailedAge(selectedPatient.birthDate)}
                </span>
              </span>
              <span className="text-[11px] font-medium text-zinc-500">목록</span>
            </button>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 md:px-6 md:py-5">
          <div className={selectedPatient ? 'pt-8 md:pt-0' : undefined}>{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-12 grid-cols-3 border-t border-zinc-200 bg-white/95 backdrop-blur-md md:hidden">
        <BottomAction label="오늘" active={activeMobileAction === 'today'} onClick={handleToday}>
          <Home className="h-4 w-4" />
        </BottomAction>
        <BottomAction
          label="환자"
          active={activeMobileAction === 'patients'}
          onClick={openPatients}
        >
          <Users className="h-4 w-4" />
        </BottomAction>
        <BottomAction
          label="설정"
          active={activeMobileAction === 'settings'}
          onClick={handleSettings}
        >
          <Settings className="h-4 w-4" />
        </BottomAction>
      </nav>
    </div>
  );
}

function BottomAction({
  label,
  active,
  children,
  onClick,
}: {
  label: string;
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors hover:bg-zinc-100 hover:text-zinc-900',
        active ? 'text-zinc-900' : 'text-zinc-500'
      )}
    >
      {children}
      <span className="truncate">{label}</span>
    </button>
  );
}
