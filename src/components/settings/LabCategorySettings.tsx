import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FlaskConical,
  GripVertical,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { LabDisplayCategory } from '@/db/database';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_LAB_CATEGORIES, labCategoryService } from '@/services/labCategoryService';

export function LabCategorySettings() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<LabDisplayCategory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    labCategoryService
      .getAll()
      .then((items) => {
        if (cancelled) return;
        setCategories(items);
        setDirty(false);
        setError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setError(message);
        toast({ title: 'Lab 카테고리 로드 실패', description: message, variant: 'destructive' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, [toast]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const normalized = categories
        .map((category, index) => ({
          ...category,
          name: category.name.trim(),
          order: index,
          items: Array.from(new Set(category.items.map((item) => item.trim()).filter(Boolean))),
        }))
        .filter((category) => category.name);
      await labCategoryService.saveAll(normalized);
      setCategories(normalized);
      setDirty(false);
      setError(null);
      setSaved(true);
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
      toast({ title: 'Lab 카테고리 저장 실패', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('Lab 카테고리를 기본값으로 초기화하시겠습니까?')) return;
    setSaving(true);
    try {
      await labCategoryService.resetToDefaults();
      setCategories(DEFAULT_LAB_CATEGORIES);
      setExpandedId(null);
      setNewItemInputs({});
      setDirty(false);
      setError(null);
      toast({ title: 'Lab 카테고리 초기화 완료', description: '기본 표시 묶음으로 되돌렸습니다.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
      toast({ title: 'Lab 카테고리 초기화 실패', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const move = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setCategories(next);
    setDirty(true);
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some((category) => category.name.trim().toLowerCase() === name.toLowerCase())) {
      toast({ title: '이미 있는 카테고리입니다.', variant: 'destructive' });
      return;
    }
    setCategories((current) => [
      ...current,
      { id: crypto.randomUUID(), name, order: current.length, items: [] },
    ]);
    setNewCategoryName('');
    setDirty(true);
  };

  const addItem = (categoryId: string) => {
    const value = newItemInputs[categoryId]?.trim();
    if (!value) return;
    const category = categories.find((item) => item.id === categoryId);
    if (category?.items.some((item) => item.trim().toLowerCase() === value.toLowerCase())) {
      toast({ title: '이미 있는 항목입니다.', variant: 'destructive' });
      return;
    }
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId ? { ...category, items: [...category.items, value] } : category
      )
    );
    setNewItemInputs((current) => ({ ...current, [categoryId]: '' }));
    setDirty(true);
  };

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Lab 카테고리</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} disabled={loading || saving}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            기본값
          </Button>
          <Button size="sm" onClick={save} disabled={loading || saving || !dirty}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? '저장 중' : saved ? '저장됨' : dirty ? '저장' : '변경 없음'}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Lab 결과 표시 순서와 묶음을 조정합니다. Supabase 모드에서는 사용자별 설정으로 저장됩니다.
      </p>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {dirty && !error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          저장하지 않은 Lab 카테고리 변경이 있습니다.
        </div>
      )}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Lab 카테고리를 불러오는 중입니다.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {categories.map((category, index) => (
              <Card key={category.id} className="overflow-hidden p-0">
                <div className="flex items-center gap-2 bg-muted/30 px-3 py-2">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    className="h-7 flex-1 border-transparent bg-transparent px-1 text-sm font-medium shadow-none focus-visible:border-input focus-visible:bg-background"
                    value={category.name}
                    aria-label={`${category.name} 카테고리 이름`}
                    onChange={(event) => {
                      const name = event.target.value;
                      setCategories((current) =>
                        current.map((item) => (item.id === category.id ? { ...item, name } : item))
                      );
                      setDirty(true);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {category.items.length}개 항목
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => move(index, 'up')}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => move(index, 'down')}
                    disabled={index === categories.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setExpandedId(expandedId === category.id ? null : category.id)}
                  >
                    {expandedId === category.id ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => {
                      setCategories((current) => current.filter((item) => item.id !== category.id));
                      setDirty(true);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {expandedId === category.id && (
                  <div className="space-y-2 border-t p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {category.items.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs"
                        >
                          {item}
                          <button
                            aria-label={`${item} 항목 삭제`}
                            onClick={() => {
                              setCategories((current) =>
                                current.map((cat) =>
                                  cat.id === category.id
                                    ? { ...cat, items: cat.items.filter((name) => name !== item) }
                                    : cat
                                )
                              );
                              setDirty(true);
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        className="h-7 flex-1 text-xs"
                        placeholder="항목명 추가"
                        value={newItemInputs[category.id] ?? ''}
                        onChange={(event) =>
                          setNewItemInputs((current) => ({
                            ...current,
                            [category.id]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => event.key === 'Enter' && addItem(category.id)}
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => addItem(category.id)}
                      >
                        추가
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              className="h-8 text-sm"
              placeholder="새 카테고리 이름"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && addCategory()}
            />
            <Button size="sm" onClick={addCategory}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              추가
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
