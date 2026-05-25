import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { AutoSaveStatus } from '@/components/settings/AutoSaveStatus';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLabReferenceStore } from '@/stores/useLabReferenceStore';

export function LabReferenceSettings() {
  const { getAllReferences, setOverride, removeOverride, resetAll } = useLabReferenceStore();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const references = getAllReferences().filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  const updateReference = (name: string, bound: 'min' | 'max', raw: string, other?: number) => {
    const parsed = parseOptionalFiniteNumber(raw);
    if (!parsed.ok) {
      toast({ title: '숫자만 입력할 수 있습니다.', variant: 'destructive' });
      return;
    }

    if (bound === 'min') {
      setOverride(name, parsed.value, other);
    } else {
      setOverride(name, other, parsed.value);
    }
  };

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Lab 참조범위</h2>
            <AutoSaveStatus settingKey="lab-references" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            비정상 Lab 표시 기준을 사용자별로 조정합니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetAll}>
          전체 초기화
        </Button>
      </div>
      <Input
        placeholder="검사항목 검색"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
        {references.map((item) => (
          <div
            key={`${item.category}-${item.name}`}
            className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_100px_100px_auto] sm:items-center"
          >
            <div>
              <div className="text-sm font-medium">{item.name}</div>
              <div className="text-xs text-muted-foreground">
                {item.category} {item.unit ? `· ${item.unit}` : ''}
              </div>
            </div>
            <Input
              type="number"
              className="h-8"
              placeholder="min"
              value={item.referenceMin ?? ''}
              onChange={(event) =>
                updateReference(item.name, 'min', event.target.value, item.referenceMax)
              }
            />
            <Input
              type="number"
              className="h-8"
              placeholder="max"
              value={item.referenceMax ?? ''}
              onChange={(event) =>
                updateReference(item.name, 'max', event.target.value, item.referenceMin)
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeOverride(item.name)}
              disabled={!item.isOverridden}
            >
              초기화
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function parseOptionalFiniteNumber(
  raw: string
): { ok: true; value: number | undefined } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: undefined };

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false };
  return { ok: true, value };
}
