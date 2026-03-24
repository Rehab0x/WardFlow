import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Bell, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { usePatientStore } from '@/stores/usePatientStore';
import { db } from '@/db/database';
import type { Note } from '@/types/note';

interface CalendarEvent {
  id: string;
  type: 'schedule' | 'reminder';
  title: string;
  patientId: string;
  patientName: string;
  roomBed?: string;
  category?: string;
  time?: string;
  isCompleted?: boolean;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const SchedulePage = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { schedules, fetchAll } = useScheduleStore();
  const { patients } = usePatientStore();
  const [reminders, setReminders] = useState<Note[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch all schedules and reminders
  useEffect(() => {
    fetchAll();
    // Fetch all reminders
    db.notes
      .where('type')
      .equals('reminder')
      .toArray()
      .then(setReminders)
      .catch(() => {});
  }, [fetchAll]);

  // Build patient lookup
  const patientMap = useMemo(() => {
    const map = new Map<string, { name: string; roomBed: string }>();
    patients.forEach((p) => map.set(p.id, { name: p.name, roomBed: p.roomBed }));
    return map;
  }, [patients]);

  // Build events map: dateKey -> CalendarEvent[]
  const eventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    const addEvent = (dateKey: string, event: CalendarEvent) => {
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(event);
    };

    // Schedules
    for (const s of schedules) {
      const d = new Date(s.scheduledDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const patient = patientMap.get(s.patientId);
      addEvent(key, {
        id: s.id,
        type: 'schedule',
        title: s.title,
        patientId: s.patientId,
        patientName: patient?.name ?? '?',
        roomBed: patient?.roomBed,
        category: s.category,
        time: s.scheduledTime,
        isCompleted: s.isCompleted,
      });
    }

    // Reminders
    for (const n of reminders) {
      if (!n.alertDate) continue;
      const d = new Date(n.alertDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const patient = patientMap.get(n.patientId);
      addEvent(key, {
        id: n.id,
        type: 'reminder',
        title: n.content,
        patientId: n.patientId,
        patientName: patient?.name ?? '?',
        roomBed: patient?.roomBed,
      });
    }

    return map;
  }, [schedules, reminders, patientMap]);

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const getDateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const selectedEvents = selectedDate ? eventsMap.get(selectedDate) ?? [] : [];

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          일정 캘린더
        </h1>
        <Button size="sm" variant="outline" onClick={goToday}>
          오늘
        </Button>
      </div>

      {/* Month Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button size="icon" variant="ghost" onClick={prevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">
            {year}년 {month + 1}월
          </h2>
          <Button size="icon" variant="ghost" onClick={nextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={cn(
                'text-center text-xs font-medium py-1',
                i === 0 && 'text-red-500',
                i === 6 && 'text-blue-500'
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="bg-background min-h-[60px] sm:min-h-[80px]" />;
            }
            const dateKey = getDateKey(day);
            const events = eventsMap.get(dateKey) ?? [];
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDate;
            const dayOfWeek = (firstDay + day - 1) % 7;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                className={cn(
                  'bg-background min-h-[60px] sm:min-h-[80px] p-1 text-left transition-colors hover:bg-muted/50 relative',
                  isSelected && 'ring-2 ring-primary ring-inset bg-primary/5',
                  isToday && 'bg-primary/5'
                )}
              >
                <span
                  className={cn(
                    'text-xs sm:text-sm inline-flex items-center justify-center w-6 h-6 rounded-full',
                    isToday && 'bg-primary text-primary-foreground font-bold',
                    dayOfWeek === 0 && !isToday && 'text-red-500',
                    dayOfWeek === 6 && !isToday && 'text-blue-500'
                  )}
                >
                  {day}
                </span>

                {/* Event dots */}
                {events.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {events.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full sm:hidden',
                          e.type === 'schedule' ? 'bg-violet-500' : 'bg-blue-500',
                          e.isCompleted && 'opacity-40'
                        )}
                      />
                    ))}
                    {/* Desktop: show short titles */}
                    <div className="hidden sm:block w-full space-y-0.5">
                      {events.slice(0, 2).map((e) => (
                        <div
                          key={e.id}
                          className={cn(
                            'text-[10px] leading-tight px-1 py-0.5 rounded truncate',
                            e.type === 'schedule'
                              ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                            e.isCompleted && 'opacity-50 line-through'
                          )}
                        >
                          {e.patientName}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <span className="text-[10px] text-muted-foreground px-1">
                          +{events.length - 2}
                        </span>
                      )}
                    </div>
                    {events.length > 3 && (
                      <span className="text-[10px] text-muted-foreground sm:hidden">
                        +{events.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected date events */}
      {selectedDate && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            {selectedDate.replace(/-/g, '.')}
            <Badge variant="secondary">{selectedEvents.length}건</Badge>
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">이 날짜에 등록된 일정이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors',
                    event.isCompleted && 'opacity-50'
                  )}
                  onClick={() => navigate(`/patients/${event.patientId}?tab=overview`)}
                >
                  <div className={cn(
                    'mt-0.5 p-1.5 rounded-full shrink-0',
                    event.type === 'schedule'
                      ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  )}>
                    {event.type === 'schedule' ? <Clock className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      {event.roomBed && (
                        <Badge variant="outline" className="text-[10px] shrink-0">{event.roomBed}</Badge>
                      )}
                      <span className="text-sm font-medium">{event.patientName}</span>
                      {event.time && (
                        <span className="text-xs text-muted-foreground">{event.time}</span>
                      )}
                      {event.category && (
                        <Badge className="text-[10px]" variant="secondary">{event.category}</Badge>
                      )}
                    </div>
                    <p className={cn(
                      'text-sm text-muted-foreground truncate',
                      event.isCompleted && 'line-through'
                    )}>
                      {event.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
          일정
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          알림 메모
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
