import { Calendar } from 'lucide-react';
import { AutoSaveStatus } from '@/components/settings/AutoSaveStatus';
import { Card } from '@/components/ui/card';
import {
  COLOR_PRESETS,
  PRESET_KEYS,
  type CalendarEventType,
  useCalendarColorStore,
} from '@/stores/useCalendarColorStore';
import { cn } from '@/utils/cn';

export function CalendarColorSettings() {
  const { colors, setColor } = useCalendarColorStore();
  const rows: { type: CalendarEventType; label: string }[] = [
    { type: 'schedule', label: '일정' },
    { type: 'global_alert', label: '전체 알림' },
    { type: 'reminder', label: '리마인더' },
  ];

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">캘린더 색상</h2>
        <AutoSaveStatus settingKey="calendar-colors" />
      </div>
      <p className="text-sm text-muted-foreground">
        캘린더와 오늘 화면에서 표시되는 이벤트 색상을 조정합니다.
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.type}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <span className="text-sm font-medium">{row.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_KEYS.map((key) => (
                <button
                  key={key}
                  title={COLOR_PRESETS[key]?.name ?? key}
                  onClick={() => setColor(row.type, key)}
                  className={cn(
                    'h-6 w-6 rounded-full border-2',
                    COLOR_PRESETS[key]?.dot,
                    colors[row.type] === key ? 'border-zinc-950' : 'border-transparent'
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
