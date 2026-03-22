import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useScheduleCategoryStore } from '@/stores/useScheduleCategoryStore';
import { formatDate, parseLocalDate } from '@/utils/dateUtils';
import type { Schedule } from '@/db/database';

const COLOR_MAP: Record<string, string> = {
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

interface ScheduleSectionProps {
  patientId: string;
}

export function ScheduleSection({ patientId }: ScheduleSectionProps) {
  const { schedules, fetchByPatient, addSchedule, toggleComplete, deleteSchedule } = useScheduleStore();
  const { categories } = useScheduleCategoryStore();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState(() => formatDate(new Date()));
  const [timeStr, setTimeStr] = useState('');
  const [category, setCategory] = useState(categories[0]?.id ?? 'other');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchByPatient(patientId);
  }, [patientId, fetchByPatient]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    await addSchedule({
      patientId,
      title: title.trim(),
      scheduledDate: parseLocalDate(dateStr),
      scheduledTime: timeStr || undefined,
      category,
      isCompleted: false,
      notes: notes.trim() || undefined,
    });
    setTitle('');
    setTimeStr('');
    setNotes('');
    setShowForm(false);
  };

  const today = formatDate(new Date());
  const upcoming = schedules.filter((s) => !s.isCompleted && formatDate(s.scheduledDate) >= today);
  const completed = schedules.filter((s) => s.isCompleted);
  const past = schedules.filter((s) => !s.isCompleted && formatDate(s.scheduledDate) < today);

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">일정</h3>
          {upcoming.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {upcoming.length}건
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          추가
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="space-y-2 mb-3 p-3 rounded-lg border bg-muted/20">
          <Input
            className="h-8 text-sm"
            placeholder="일정 제목 (예: 신경과 외진)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-2">
            <Input
              type="date"
              className="h-8 text-sm flex-1"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
            />
            <Input
              type="time"
              className="h-8 text-sm w-28"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              placeholder="시간"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Schedule['category'])}
              className="rounded-md border px-2 py-1 text-sm bg-background flex-1 h-8"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
            <Input
              className="h-8 text-sm flex-1"
              placeholder="메모 (선택)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>취소</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!title.trim()}>추가</Button>
          </div>
        </div>
      )}

      {/* Past (overdue) */}
      {past.length > 0 && (
        <div className="space-y-1 mb-2">
          {past.map((s) => (
            <ScheduleItem key={s.id} schedule={s} isOverdue onToggle={toggleComplete} onDelete={deleteSchedule} />
          ))}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 ? (
        <div className="space-y-1">
          {upcoming.map((s) => (
            <ScheduleItem key={s.id} schedule={s} onToggle={toggleComplete} onDelete={deleteSchedule} />
          ))}
        </div>
      ) : (
        !showForm && past.length === 0 && completed.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">등록된 일정이 없습니다.</p>
        )
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            완료 {completed.length}건
          </summary>
          <div className="mt-1 space-y-1">
            {completed.map((s) => (
              <ScheduleItem key={s.id} schedule={s} onToggle={toggleComplete} onDelete={deleteSchedule} />
            ))}
          </div>
        </details>
      )}
    </Card>
  );
}

function ScheduleItem({
  schedule,
  isOverdue,
  onToggle,
  onDelete,
}: {
  schedule: Schedule;
  isOverdue?: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { getLabel, getColor } = useScheduleCategoryStore();
  const dateLabel = formatDate(schedule.scheduledDate);
  const today = formatDate(new Date());
  const isToday = dateLabel === today;
  const colorClass = COLOR_MAP[getColor(schedule.category)] || COLOR_MAP.gray;

  return (
    <div className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded group ${
      schedule.isCompleted ? 'opacity-50' : isOverdue ? 'bg-red-50 dark:bg-red-950/20' : ''
    }`}>
      <button
        onClick={() => onToggle(schedule.id)}
        className={`shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${
          schedule.isCompleted
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-muted-foreground/30 hover:border-primary'
        }`}
      >
        {schedule.isCompleted && <Check className="h-3 w-3" />}
      </button>

      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 shrink-0 ${colorClass}`}>
        {getLabel(schedule.category)}
      </Badge>

      <span className={`text-xs shrink-0 ${isToday ? 'text-primary font-medium' : isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
        {isToday ? '오늘' : dateLabel.slice(5)}
        {schedule.scheduledTime && ` ${schedule.scheduledTime}`}
      </span>

      <span className={`flex-1 truncate ${schedule.isCompleted ? 'line-through' : ''}`}>
        {schedule.title}
      </span>

      {schedule.notes && (
        <span className="text-xs text-muted-foreground truncate max-w-20 hidden sm:inline">
          {schedule.notes}
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-destructive"
        onClick={() => onDelete(schedule.id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
