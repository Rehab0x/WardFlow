import { ArrowRight, ListChecks } from 'lucide-react';
import { ClinicalRow } from '../clinical/ClinicalRow';
import { DataSection } from '../clinical/DataSection';
import { TaskFilterControl, TaskSortControl } from './TaskControls';
import {
  getTaskEmptyText,
  type TaskFilter,
  type TaskFilterOption,
  type TaskRow,
  type TaskSort,
} from './todayTasks';

interface TodayTaskListProps {
  taskRows: TaskRow[];
  visibleTaskRows: TaskRow[];
  taskFilter: TaskFilter;
  taskFilterOptions: TaskFilterOption[];
  taskSort: TaskSort;
  taskSummary: { urgent: number; lateOrSoonSchedule: number };
  onFilterChange: (filter: TaskFilter) => void;
  onSortChange: (sort: TaskSort) => void;
  onOpenPatient?: (patientId: string, tab?: string) => void;
}

export function TodayTaskList({
  taskRows,
  visibleTaskRows,
  taskFilter,
  taskFilterOptions,
  taskSort,
  taskSummary,
  onFilterChange,
  onSortChange,
  onOpenPatient,
}: TodayTaskListProps) {
  const firstTask = visibleTaskRows[0];

  return (
    <div className="mb-2">
      <DataSection
        icon={ListChecks}
        title="오늘 할 일"
        count={visibleTaskRows.length}
        action={
          <div className="flex max-w-[calc(100vw-4rem)] items-center gap-1 overflow-x-auto md:max-w-none">
            <TaskSortControl value={taskSort} onChange={onSortChange} />
            <TaskFilterControl
              value={taskFilter}
              options={taskFilterOptions}
              onChange={onFilterChange}
            />
          </div>
        }
      >
        {taskRows.length > 0 && (
          <div className="grid grid-cols-1 gap-1 border-b border-zinc-100 bg-zinc-50 px-2 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
              <span className="font-medium text-zinc-700">전체 {taskRows.length}</span>
              <span>긴급 {taskSummary.urgent}</span>
              <span>임박 일정 {taskSummary.lateOrSoonSchedule}</span>
              {firstTask && (
                <span className="min-w-0 truncate">
                  다음 {firstTask.roomBed} {firstTask.patientName} · {firstTask.detail}
                </span>
              )}
            </div>
            {firstTask && (
              <button
                type="button"
                onClick={() => onOpenPatient?.(firstTask.patientId, firstTask.tab)}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-zinc-900 px-2 text-[11px] font-medium text-white transition-colors hover:bg-zinc-700"
              >
                열기
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        {visibleTaskRows.length === 0 ? (
          <ClinicalRow prefix="-" title="0" detail={getTaskEmptyText(taskFilter)} />
        ) : (
          visibleTaskRows.map((item) => (
            <ClinicalRow
              key={item.id}
              prefix={item.roomBed}
              title={item.patientName}
              detail={item.detail}
              meta={item.meta}
              pill={item.kind}
              tone={item.tone}
              onClick={() => onOpenPatient?.(item.patientId, item.tab)}
            />
          ))
        )}
      </DataSection>
    </div>
  );
}
