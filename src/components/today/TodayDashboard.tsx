import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Patient } from '@/types/patient';
import type { BriefingData } from '@/services/briefingService';
import { ClinicalRow } from '../clinical/ClinicalRow';
import { DataSection } from '../clinical/DataSection';
import { formatAgeYears } from '../clinical/dateLabels';
import { TodayDomainSections } from './TodayDomainSections';
import { TodayMetrics } from './TodayMetrics';
import { TodayTaskList } from './TodayTaskList';
import {
  buildTaskFilterOptions,
  buildTaskRows,
  sortTaskRows,
  summarizeTaskRows,
  type TaskFilter,
  type TaskSort,
} from './todayTasks';

interface TodayDashboardProps {
  data: BriefingData;
  date?: Date;
  subtitle?: string;
  searchResults?: Patient[];
  searchQuery?: string;
  isLoading?: boolean;
  onOpenPatient?: (patientId: string, tab?: string) => void;
}

export function TodayDashboard({
  data,
  date = new Date(),
  subtitle,
  searchResults = [],
  searchQuery,
  isLoading = false,
  onOpenPatient,
}: TodayDashboardProps) {
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [taskSort, setTaskSort] = useState<TaskSort>('priority');

  const taskRows = useMemo(() => buildTaskRows(data), [data]);
  const visibleTaskRows = useMemo(
    () =>
      sortTaskRows(
        taskFilter === 'all' ? taskRows : taskRows.filter((item) => item.kindId === taskFilter),
        taskSort
      ),
    [taskFilter, taskRows, taskSort]
  );
  const taskFilterOptions = useMemo(() => buildTaskFilterOptions(taskRows), [taskRows]);
  const taskSummary = useMemo(() => summarizeTaskRows(taskRows), [taskRows]);
  const abnormalLabCount = useMemo(
    () => data.recentLabs.filter((lab) => lab.abnormalCount > 0).length,
    [data.recentLabs]
  );
  const openScheduleCount = useMemo(
    () => data.todaySchedules.filter((item) => !item.isCompleted).length,
    [data.todaySchedules]
  );
  const hasSearch = Boolean(searchQuery?.trim());
  const dateLabel = useMemo(
    () =>
      date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }),
    [date]
  );

  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-medium leading-tight tracking-tight">오늘</h1>
          <p className="mt-0.5 text-[12px] text-zinc-400">{dateLabel}</p>
        </div>
        {(subtitle || isLoading) && (
          <div className="flex shrink-0 items-center gap-2">
            {isLoading && (
              <span className="inline-flex h-6 items-center rounded-md border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-500">
                갱신 중
              </span>
            )}
            {subtitle && <span className="text-[12px] text-zinc-400">{subtitle}</span>}
          </div>
        )}
      </div>

      {hasSearch && (
        <div className="mb-3">
          <DataSection icon={Search} title="검색 결과" count={searchResults.length}>
            {searchResults.length === 0 ? (
              <ClinicalRow prefix="-" title="0" detail="일치하는 환자 없음" />
            ) : (
              searchResults.map((patient) => (
                <ClinicalRow
                  key={patient.id}
                  prefix={patient.roomBed}
                  title={patient.name}
                  detail={`${patient.registrationNumber} - ${patient.sex}/${formatAgeYears(patient.birthDate)}`}
                  meta={patient.patientType === 'consult' ? '협진' : '입원'}
                  pill={patient.attention ? '주의' : undefined}
                  tone={patient.attention ? 'warning' : 'default'}
                  onClick={() => onOpenPatient?.(patient.id)}
                />
              ))
            )}
          </DataSection>
        </div>
      )}

      <TodayMetrics
        summary={data.patientSummary}
        taskCount={taskRows.length}
        openScheduleCount={openScheduleCount}
        reminderCount={data.reminders.length}
        antibioticCount={data.antibiotics.length}
        abnormalLabCount={abnormalLabCount}
        taskFilter={taskFilter}
        onSelectFilter={setTaskFilter}
      />

      <TodayTaskList
        taskRows={taskRows}
        visibleTaskRows={visibleTaskRows}
        taskFilter={taskFilter}
        taskFilterOptions={taskFilterOptions}
        taskSort={taskSort}
        taskSummary={taskSummary}
        onFilterChange={setTaskFilter}
        onSortChange={setTaskSort}
        onOpenPatient={onOpenPatient}
      />

      <TodayDomainSections data={data} onOpenPatient={onOpenPatient} />
    </>
  );
}
