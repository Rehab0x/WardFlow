import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import type { Patient } from '@/db/database';
import { cn } from '@/lib/utils';
import { formatAgeYears, formatDetailedAge } from '../clinical/dateLabels';
import { PatientRow } from './PatientRow';

type RailFilter = 'all' | 'attention' | 'tasks';

export interface PatientRailIndicators {
  reminder?: boolean;
  schedule?: boolean;
  antibiotic?: boolean;
  lab?: boolean;
  changed?: boolean;
  changedDetail?: string;
}

interface PatientRailProps {
  patients: Patient[];
  selectedPatientId?: string;
  patientIndicators?: Record<string, PatientRailIndicators>;
  onPatientSelect?: (patientId: string) => void;
  onAddPatient?: () => boolean | void;
  className?: string;
}

export function PatientRail({
  patients,
  selectedPatientId,
  patientIndicators = {},
  onPatientSelect,
  onAddPatient,
  className,
}: PatientRailProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RailFilter>('all');
  const [dischargedOpen, setDischargedOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const patientSearchTextById = useMemo(() => buildPatientSearchTextById(patients), [patients]);
  const clearQuery = useCallback(() => setQuery(''), []);
  const showAll = useCallback(() => setFilter('all'), []);
  const showAttention = useCallback(() => setFilter('attention'), []);
  const showTasks = useCallback(() => setFilter('tasks'), []);
  const resetFilters = useCallback(() => {
    setQuery('');
    setFilter('all');
  }, []);
  const toggleDischarged = useCallback(() => setDischargedOpen((current) => !current), []);

  const {
    admitted,
    consult,
    discharged,
    visibleCount,
    totalCount,
    attentionCount,
    taskCount,
    selectedDischarged,
  } = useMemo(() => {
      const normalized = deferredQuery.trim().toLowerCase();
      const hasTask = (patient: Patient) => {
        const indicators = patientIndicators[patient.id];
        return Boolean(
          indicators?.reminder || indicators?.schedule || indicators?.antibiotic || indicators?.lab
        );
      };

      const byRoom = (a: Patient, b: Patient) =>
        a.roomBed.localeCompare(b.roomBed, 'ko-KR', { numeric: true });
      const admittedPatients: Patient[] = [];
      const consultPatients: Patient[] = [];
      const dischargedPatients: Patient[] = [];
      let visibleCount = 0;
      let totalCount = 0;
      let attentionCount = 0;
      let taskCount = 0;
      let selectedDischarged = false;

      for (const patient of patients) {
        if (patient.id === selectedPatientId && patient.status === 'discharged') {
          selectedDischarged = true;
        }
        if (normalized && !patientSearchTextById.get(patient.id)?.includes(normalized)) continue;

        totalCount++;
        const patientHasTask = hasTask(patient);
        if (patient.attention) attentionCount++;
        if (patientHasTask) taskCount++;

        if (filter === 'attention' && !patient.attention) continue;
        if (filter === 'tasks' && !patientHasTask) continue;

        visibleCount++;
        if (patient.status === 'discharged') {
          dischargedPatients.push(patient);
        } else if (patient.patientType === 'consult') {
          consultPatients.push(patient);
        } else {
          admittedPatients.push(patient);
        }
      }

      return {
        admitted: admittedPatients.sort(byRoom),
        consult: consultPatients.sort(byRoom),
        discharged: dischargedPatients.sort(
          (a, b) => (b.dischargeDate?.getTime() ?? 0) - (a.dischargeDate?.getTime() ?? 0)
        ),
        visibleCount,
        totalCount,
        attentionCount,
        taskCount,
        selectedDischarged,
      };
    }, [patients, patientIndicators, patientSearchTextById, deferredQuery, filter, selectedPatientId]);
  const showDischarged =
    dischargedOpen || selectedDischarged || Boolean(deferredQuery.trim()) || filter !== 'all';
  const filterOptions = useMemo(
    () => [
      { value: 'all' as const, label: '전체', count: totalCount, onClick: showAll },
      { value: 'attention' as const, label: '주의', count: attentionCount, onClick: showAttention },
      { value: 'tasks' as const, label: '할 일', count: taskCount, onClick: showTasks },
    ],
    [attentionCount, showAll, showAttention, showTasks, taskCount, totalCount]
  );

  return (
    <aside
      className={cn(
        'flex h-full w-72 shrink-0 flex-col border-r border-zinc-200 bg-white',
        className
      )}
    >
      <div className="border-b border-zinc-200 p-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              className="h-8 w-full rounded-md border border-zinc-200 px-2 pr-8 text-[12px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="병실, 이름, 등록번호"
              type="search"
            />
            {query && (
              <button
                type="button"
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="검색어 지우기"
                onClick={clearQuery}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onAddPatient}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="환자 추가"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
          {filterOptions.map(({ value, label, count, onClick }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={onClick}
              className={cn(
                'inline-flex h-6 items-center justify-center gap-1 rounded text-[11px] font-medium transition-colors',
                filter === value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
              )}
            >
              <span>{label}</span>
              <span className="font-mono text-[10px] tabular-nums">{count}</span>
            </button>
          ))}
        </div>
        {(query || filter !== 'all') && (
          <div className="mt-2 flex h-5 items-center justify-between px-0.5 text-[11px] text-zinc-400">
            <span>표시 {visibleCount}</span>
            <button
              type="button"
              className="font-medium text-zinc-500 transition-colors hover:text-zinc-900"
              onClick={resetFilters}
            >
              초기화
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <PatientGroup
          title="입원"
          patients={admitted}
          selectedPatientId={selectedPatientId}
          patientIndicators={patientIndicators}
          onPatientSelect={onPatientSelect}
        />
        <PatientGroup
          title="협진"
          patients={consult}
          selectedPatientId={selectedPatientId}
          patientIndicators={patientIndicators}
          onPatientSelect={onPatientSelect}
        />
        <PatientGroup
          title="퇴원"
          patients={discharged}
          selectedPatientId={selectedPatientId}
          patientIndicators={patientIndicators}
          onPatientSelect={onPatientSelect}
          collapsed={!showDischarged}
          onToggle={toggleDischarged}
        />
      </div>
    </aside>
  );
}

function buildPatientSearchTextById(patients: Patient[]) {
  const searchTextById = new Map<string, string>();
  for (const patient of patients) {
    searchTextById.set(
      patient.id,
      [
        patient.roomBed,
        patient.name,
        patient.registrationNumber,
        patient.chiefComplaint,
        patient.attendingPhysician,
        ...(patient.tags ?? []),
      ]
        .join(' ')
        .toLowerCase()
    );
  }
  return searchTextById;
}

const PatientGroup = memo(function PatientGroup({
  title,
  patients,
  selectedPatientId,
  patientIndicators,
  onPatientSelect,
  collapsed,
  onToggle,
}: {
  title: string;
  patients: Patient[];
  selectedPatientId?: string;
  patientIndicators: Record<string, PatientRailIndicators>;
  onPatientSelect?: (patientId: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const ToggleIcon = collapsed ? ChevronRight : ChevronDown;

  return (
    <section className="mb-3">
      <div className="mb-1 flex h-6 items-center justify-between px-1">
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            className="inline-flex min-w-0 items-center gap-1 rounded text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-900"
          >
            <ToggleIcon className="h-3 w-3" />
            <span>{title}</span>
          </button>
        ) : (
          <h2 className="text-[11px] font-medium text-zinc-500">{title}</h2>
        )}
        <span className="font-mono text-[10.5px] text-zinc-400 tabular-nums">
          {patients.length}
        </span>
      </div>
      {!collapsed && (
        <div className="space-y-0.5">
          {patients.map((patient) => (
            <PatientRowItem
              key={patient.id}
              patient={patient}
              indicators={patientIndicators[patient.id]}
              selected={patient.id === selectedPatientId}
              onPatientSelect={onPatientSelect}
            />
          ))}
          {patients.length === 0 && (
            <div className="h-8 rounded-md px-2 py-2 text-[12px] text-zinc-400">0</div>
          )}
        </div>
      )}
    </section>
  );
});

const PatientRowItem = memo(function PatientRowItem({
  patient,
  indicators,
  selected,
  onPatientSelect,
}: {
  patient: Patient;
  indicators?: PatientRailIndicators;
  selected: boolean;
  onPatientSelect?: (patientId: string) => void;
}) {
  const handleClick = useCallback(() => onPatientSelect?.(patient.id), [onPatientSelect, patient.id]);

  return (
    <PatientRow
      roomBed={patient.roomBed}
      name={patient.name}
      sexAge={`${patient.sex}/${formatAgeYears(patient.birthDate)}`}
      fullAge={formatDetailedAge(patient.birthDate)}
      chiefComplaint={patient.chiefComplaint}
      selected={selected}
      attention={patient.status === 'discharged' ? false : patient.attention}
      reminder={patient.status === 'discharged' ? false : indicators?.reminder}
      schedule={patient.status === 'discharged' ? false : indicators?.schedule}
      antibiotic={patient.status === 'discharged' ? false : indicators?.antibiotic}
      lab={patient.status === 'discharged' ? false : indicators?.lab}
      changed={patient.status === 'discharged' ? false : indicators?.changed}
      changedDetail={patient.status === 'discharged' ? undefined : indicators?.changedDetail}
      rightLabel={
        patient.status === 'discharged' && patient.dischargeDate
          ? formatRailDate(patient.dischargeDate)
          : undefined
      }
      onClick={handleClick}
    />
  );
});

function formatRailDate(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}
