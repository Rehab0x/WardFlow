import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { AutoSaveStatus } from '@/components/settings/AutoSaveStatus';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  COLOR_OPTIONS,
  DEFAULT_CATEGORIES,
  useScheduleCategoryStore,
  type ScheduleCategory,
} from '@/stores/useScheduleCategoryStore';

export function ScheduleCategorySettings() {
  const store = useScheduleCategoryStore();
  const { toast } = useToast();
  const [draftCategories, setDraftCategories] = useState<ScheduleCategory[]>(
    () => store.categories
  );
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('gray');
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!dirty) setDraftCategories(store.categories);
  }, [dirty, store.categories]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  const validation = useMemo(() => validateScheduleCategories(draftCategories), [draftCategories]);

  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };

  const updateDraft = (id: string, updates: Partial<Omit<ScheduleCategory, 'id'>>) => {
    setDraftCategories((current) =>
      current.map((category) => (category.id === id ? { ...category, ...updates } : category))
    );
    markDirty();
  };

  const add = () => {
    const nextLabel = normalizeSettingText(label);
    if (!nextLabel) return;
    if (
      draftCategories.some(
        (category) => normalizeSettingText(category.label).toLowerCase() === nextLabel.toLowerCase()
      )
    ) {
      toast({ title: '이미 있는 일정 카테고리입니다.', variant: 'destructive' });
      return;
    }
    setDraftCategories((current) => [
      ...current,
      {
        id: `${nextLabel.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
        label: nextLabel,
        color,
      },
    ]);
    setLabel('');
    markDirty();
  };

  const save = () => {
    if (validation.errors.length > 0) {
      toast({
        title: '일정 카테고리를 저장할 수 없습니다.',
        description: validation.errors[0],
        variant: 'destructive',
      });
      return;
    }
    store.replaceCategories(draftCategories);
    setDraftCategories(validation.normalized);
    setDirty(false);
    setSaved(true);
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => {
    setDraftCategories([...DEFAULT_CATEGORIES]);
    store.resetCategories();
    setDirty(false);
    setSaved(false);
  };

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">일정 카테고리</h2>
          <AutoSaveStatus settingKey="schedule-categories" />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>
            <RotateCcw className="mr-1 h-3 w-3" />
            기본값
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={save}
            disabled={!dirty || validation.errors.length > 0}
          >
            <Save className="mr-1 h-3 w-3" />
            {saved ? '저장됨' : dirty ? '저장' : '변경 없음'}
          </Button>
        </div>
      </div>
      {validation.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {validation.errors[0]}
        </div>
      )}
      {dirty && validation.errors.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          저장하지 않은 일정 카테고리 변경이 있습니다.
        </div>
      )}
      <div className="space-y-2">
        {draftCategories.map((category) => (
          <div key={category.id} className="flex items-center gap-2">
            <select
              value={category.color}
              onChange={(event) => updateDraft(category.id, { color: event.target.value })}
              className="w-24 rounded-md border bg-background px-1.5 py-1 text-xs"
            >
              {COLOR_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Input
              className="h-8 flex-1 text-sm"
              value={category.label}
              aria-label={`${category.label || '일정'} 카테고리 이름`}
              onChange={(event) => updateDraft(category.id, { label: event.target.value })}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => {
                setDraftCategories((current) => current.filter((item) => item.id !== category.id));
                markDirty();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <select
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="w-24 rounded-md border bg-background px-1.5 py-1 text-xs"
        >
          {COLOR_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <Input
          className="h-8 flex-1 text-sm"
          placeholder="새 카테고리 이름"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && add()}
        />
        <Button size="sm" className="h-8" onClick={add}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          추가
        </Button>
      </div>
    </Card>
  );
}

export function normalizeSettingText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validateScheduleCategories(categories: ScheduleCategory[]): {
  errors: string[];
  normalized: ScheduleCategory[];
} {
  const errors: string[] = [];
  const normalized: ScheduleCategory[] = [];
  const seen = new Set<string>();

  for (const category of categories) {
    const label = normalizeSettingText(category.label);
    if (!label) {
      errors.push('비어 있는 일정 카테고리 이름이 있습니다.');
      continue;
    }

    const key = label.toLowerCase();
    if (seen.has(key)) {
      errors.push(`중복된 일정 카테고리 이름이 있습니다: ${label}`);
      continue;
    }
    seen.add(key);

    normalized.push({
      ...category,
      label,
      color: COLOR_OPTIONS.includes(category.color as (typeof COLOR_OPTIONS)[number])
        ? category.color
        : 'gray',
    });
  }

  if (normalized.length === 0) {
    errors.push('일정 카테고리는 하나 이상 필요합니다.');
  }

  return { errors, normalized };
}
