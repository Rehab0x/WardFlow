import { Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { Patient } from '@/types/patient';
import type { BriefingData } from '@/services/briefingService';
import { ClinicalRow } from '../clinical/ClinicalRow';
import { DataSection } from '../clinical/DataSection';
import { formatAgeYears } from '../clinical/dateLabels';
import { AiActionPanel } from '@/components/ai/AiActionPanel';
import { analyzeBriefing } from '@/services/aiService';
import { useAlertStore } from '@/stores/useAlertStore';
import { SEVERITY_LABEL } from '@/services/alertEngine';
import { AlertSection } from './AlertSection';
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
  const alertEvents = useAlertStore((store) => store.events);

  const openAlerts = useMemo(
    () => alertEvents.filter((event) => !event.acknowledgedAt),
    [alertEvents]
  );
  const runBriefingAnalysis = useCallback(
    () =>
      analyzeBriefing({
        patientSummary: `입원 ${data.patientSummary.admitted}명, 협진 ${data.patientSummary.consult}명`,
        alerts: openAlerts
          .map((event) => `[${SEVERITY_LABEL[event.severity]}] ${event.message}`)
          .join('\n'),
        tasks: taskRows.map((row) => `${row.roomBed} ${row.patientName} · ${row.kind} · ${row.detail}`).join('\n'),
        antibiotics: data.antibiotics
          .map((item) => `${item.roomBed} ${item.patientName} ${item.drugName} D+${item.dDay}`)
          .join('\n'),
        abnormalLabs: data.recentLabs
          .filter((lab) => lab.abnormalCount > 0)
          .map((lab) => `${lab.roomBed} ${lab.patientName} ${lab.dateKey} ${lab.abnormalItems.join(', ')}`)
          .join('\n'),
      }),
    [data, openAlerts, taskRows]
  );
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

      <AlertSection onOpenPatient={onOpenPatient} />

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

      <AiActionPanel
        title="AI 오늘 브리핑"
        actionLabel="오늘 우선순위 정리"
        resultTitle="오늘 먼저 볼 것"
        ready={taskRows.length > 0 || openAlerts.length > 0}
        readyHint="알림·할 일·항생제·Lab을 묶어 먼저 볼 환자를 정리합니다."
        notReadyHint="정리할 오늘 항목이 없습니다."
        run={runBriefingAnalysis}
      />

      <TodayDomainSections data={data} onOpenPatient={onOpenPatient} />
    </>
  );
}
