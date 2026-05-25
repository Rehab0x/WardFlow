import type { ReactNode } from 'react';
import { FileText, RotateCcw } from 'lucide-react';
import { AutoSaveStatus } from '@/components/settings/AutoSaveStatus';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useChartingSettingsStore } from '@/stores/useChartingSettingsStore';

export function ChartingSettings() {
  const {
    problemListStyle,
    setProblemListStyle,
    includeFieldNames,
    setIncludeFieldNames,
    excludeEmptySections,
    setExcludeEmptySections,
    sectionSeparator,
    setSectionSeparator,
    sectionNames,
    setSectionName,
    resetSectionNames,
  } = useChartingSettingsStore();

  return (
    <Card className="space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">차팅 복사 설정</h2>
        <AutoSaveStatus settingKey="charting-settings" />
      </div>
      <SettingRow label="Problem List 형식">
        <select
          value={problemListStyle}
          onChange={(event) =>
            setProblemListStyle(
              event.target.value as 'numbered' | 'numbered_simple' | 'bulleted' | 'plain'
            )
          }
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          <option value="numbered_simple">#. 기본</option>
          <option value="numbered">#1. #2. #3.</option>
          <option value="bulleted">bullet</option>
          <option value="plain">표시 없음</option>
        </select>
      </SettingRow>
      <SettingRow label="섹션 간격">
        <select
          value={sectionSeparator === '\n\n' ? '2' : '1'}
          onChange={(event) => setSectionSeparator(event.target.value === '2' ? '\n\n' : '\n')}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          <option value="2">빈 줄 포함</option>
          <option value="1">줄바꿈만</option>
        </select>
      </SettingRow>
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={includeFieldNames}
            onChange={(event) => setIncludeFieldNames(event.target.checked)}
          />
          <span className="text-sm">필드명 포함</span>
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={excludeEmptySections}
            onChange={(event) => setExcludeEmptySections(event.target.checked)}
          />
          <span className="text-sm">빈 섹션 제외</span>
        </label>
      </div>
      {includeFieldNames && (
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">섹션 이름</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetSectionNames}>
              <RotateCcw className="mr-1 h-3 w-3" />
              기본값
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.entries(sectionNames) as [keyof typeof sectionNames, string][]).map(
              ([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
                    {key}
                  </span>
                  <Input
                    className="h-7 text-xs"
                    value={value}
                    onChange={(event) => setSectionName(key, event.target.value)}
                  />
                </div>
              )
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-40 shrink-0 text-sm">{label}</span>
      {children}
    </div>
  );
}
