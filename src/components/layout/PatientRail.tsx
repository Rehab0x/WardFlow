import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import type { Patient } from '@/types/patient';
import { cn } from '@/lib/utils';
import { formatAgeYears, formatDetailedAge } from '../clinical/dateLabels';
import { PatientRow } from './PatientRow';

type RailFilter = 'all' | 'attention' | 'tasks' | 'notes';

export interface PatientRailIndicators {
  /** 오늘 작성된 경과기록(메모)이 있다 — SOAP을 이미 남겼는지 보는 용도 */
  note?: boolean;
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
  /** 할 일·메모 필터의 기준일. null이면 오늘 */
  basisDate?: Date | null;
  basisLoading?: boolean;
  basisError?: string | null;
  onBasisDateChange?: (date: Date | null) => void;
  onPatientSelect?: (patientId: string) => void;
  onAddPatient?: () => boolean | void;
  className?: string;
}

export function PatientRail({
  patients,
  selectedPatientId,
  patientIndicators = {},
  basisDate = null,
  basisLoading = false,
  basisError = null,
  onBasisDateChange,
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
  const showNotes = useCallback(() => setFilter('notes'), []);
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
    noteCount,
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
      let noteCount = 0;
      let selectedDischarged = false;

      for (const patient of patients) {
        if (patient.id === selectedPatientId && patient.status === 'discharged') {
          selectedDischarged = true;
        }
        if (normalized && !patientSearchTextById.get(patient.id)?.includes(normalized)) continue;

        totalCount++;
        const patientHasTask = hasTask(patient);
        const patientHasNote = Boolean(patientIndicators[patient.id]?.note);
        if (patient.attention) attentionCount++;
        if (patientHasTask) taskCount++;
        if (patientHasNote) noteCount++;

        if (filter === 'attention' && !patient.attention) continue;
        if (filter === 'tasks' && !patientHasTask) continue;
        if (filter === 'notes' && !patientHasNote) continue;

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
        noteCount,
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
      // 오늘 메모(경과기록)를 남긴 환자 — 회진 중 SOAP을 어디까지 적었는지 짚어 볼 때 쓴다
      { value: 'notes' as const, label: '메모', count: noteCount, onClick: showNotes },
    ],
    [
      attentionCount,
      noteCount,
      showAll,
      showAttention,
      showNotes,
      showTasks,
      taskCount,
      totalCount,
    ]
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
        <div className="grid grid-cols-4 rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
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
        {onBasisDateChange && (
          <BasisDateRow
            basisDate={basisDate}
            loading={basisLoading}
            error={basisError}
            onChange={onBasisDateChange}
          />
        )}
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
          pinToBottom
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
  pinToBottom,
}: {
  title: string;
  patients: Patient[];
  selectedPatientId?: string;
  patientIndicators: Record<string, PatientRailIndicators>;
  onPatientSelect?: (patientId: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  /** 명단이 길어도 머리줄이 목록 바닥에 붙어 보이게 한다 (퇴원 그룹) */
  pinToBottom?: boolean;
}) {
  const ToggleIcon = collapsed ? ChevronRight : ChevronDown;
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    onToggle?.();
    // 바닥에 붙은 머리줄을 눌러 펼치면 목록이 화면 밖에 열린다 — 머리줄 위치로 스크롤해 보여준다
    if (pinToBottom && collapsed) {
      requestAnimationFrame(() =>
        anchorRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
      );
    }
  }, [collapsed, onToggle, pinToBottom]);

  return (
    // pinToBottom일 때 section은 상자를 만들지 않아(contents) 머리줄의 sticky 기준이 스크롤 영역이 된다
    <section className={pinToBottom ? 'contents' : 'mb-3'}>
      {pinToBottom && <div ref={anchorRef} aria-hidden="true" />}
      <div
        className={cn(
          'mb-1 flex h-6 items-center justify-between px-1',
          pinToBottom &&
            'sticky bottom-0 z-10 -mx-2 mb-0 h-10 border-t border-zinc-200 bg-white px-3 md:h-9'
        )}
      >
        {onToggle ? (
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={!collapsed}
            className={cn(
              'inline-flex min-w-0 items-center gap-1 rounded text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-900',
              pinToBottom && 'h-full flex-1 text-[12px]'
            )}
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
      note={patient.status === 'discharged' ? false : indicators?.note}
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

/** 기준일 한 줄 — 할 일·메모를 어느 날짜로 볼지 고른다. */
function BasisDateRow({
  basisDate,
  loading,
  error,
  onChange,
}: {
  basisDate: Date | null;
  loading: boolean;
  error?: string | null;
  onChange: (date: Date | null) => void;
}) {
  const active = basisDate !== null;
  const value = toDateInputValue(basisDate ?? new Date());

  const shift = (days: number) => {
    const base = basisDate ?? new Date();
    onChange(new Date(base.getFullYear(), base.getMonth(), base.getDate() + days));
  };

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-1">
        <CalendarDays className={cn('h-3.5 w-3.5', active ? 'text-amber-600' : 'text-zinc-400')} />
        <button
          type="button"
          aria-label="하루 전"
          onClick={() => shift(-1)}
          className="inline-flex h-6 w-5 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <input
          type="date"
          aria-label="기준일"
          value={value}
          onChange={(event) => {
            const next = fromDateInputValue(event.target.value);
            onChange(next);
          }}
          className={cn(
            'h-6 min-w-0 flex-1 rounded border px-1 font-mono text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-400',
            active ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-zinc-200 text-zinc-600'
          )}
        />
        <button
          type="button"
          aria-label="하루 후"
          onClick={() => shift(1)}
          className="inline-flex h-6 w-5 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="h-6 shrink-0 rounded px-1.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            오늘
          </button>
        )}
      </div>
      {active && (
        <p
          className={cn(
            'px-0.5 text-[10.5px] leading-4',
            error ? 'text-red-600' : 'text-amber-700'
          )}
        >
          {error ??
            (loading
              ? '그 날짜 기록을 불러오는 중…'
              : '이 날짜의 메모·알림·일정 기준입니다 (항생제·Lab 제외)')}
        </p>
      )}
    </div>
  );
}

function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 날짜 입력은 비어 있을 수 있다 — 그때는 오늘로 되돌린다. */
function fromDateInputValue(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
