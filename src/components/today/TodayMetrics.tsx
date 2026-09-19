import { MetricTile } from '../clinical/MetricTile';
import type { BriefingData } from '@/services/briefingService';
import type { TaskFilter } from './todayTasks';

interface TodayMetricsProps {
  summary: BriefingData['patientSummary'];
  taskCount: number;
  openScheduleCount: number;
  reminderCount: number;
  antibioticCount: number;
  abnormalLabCount: number;
  taskFilter: TaskFilter;
  onSelectFilter: (filter: TaskFilter) => void;
}

export function TodayMetrics({
  summary,
  taskCount,
  openScheduleCount,
  reminderCount,
  antibioticCount,
  abnormalLabCount,
  taskFilter,
  onSelectFilter,
}: TodayMetricsProps) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
      <MetricTile label="입원" value={summary.admitted} />
      <MetricTile label="협진" value={summary.consult} />
      <MetricTile
        label="할 일"
        value={taskCount}
        tone={taskCount > 0 ? 'warning' : 'default'}
        selected={taskFilter === 'all'}
        onClick={() => onSelectFilter('all')}
      />
      <MetricTile
        label="일정"
        value={openScheduleCount}
        tone={openScheduleCount > 0 ? 'warning' : 'default'}
        selected={taskFilter === 'schedule'}
        onClick={() => onSelectFilter('schedule')}
      />
      <MetricTile
        label="알림"
        value={reminderCount}
        tone={reminderCount > 0 ? 'warning' : 'default'}
        selected={taskFilter === 'reminder'}
        onClick={() => onSelectFilter('reminder')}
      />
      <MetricTile
        label="항생제"
        value={antibioticCount}
        tone={antibioticCount > 0 ? 'warning' : 'default'}
        selected={taskFilter === 'antibiotic'}
        onClick={() => onSelectFilter('antibiotic')}
      />
      <MetricTile
        label="비정상 Lab"
        value={abnormalLabCount}
        tone={abnormalLabCount > 0 ? 'danger' : 'default'}
        selected={taskFilter === 'lab'}
        onClick={() => onSelectFilter('lab')}
      />
    </div>
  );
}
