import { useEffect, useMemo, useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { AlertComparator, AlertRuleKind, AlertSeverity } from '@/domain/alert';
import { SEVERITY_LABEL, SUGGESTED_RULES, describeRule } from '@/services/alertEngine';
import { useAlertStore } from '@/stores/useAlertStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/utils/cn';

interface RuleDraft {
  name: string;
  kind: AlertRuleKind;
  labItem: string;
  comparator: AlertComparator;
  threshold: string;
  dayThreshold: string;
  severity: AlertSeverity;
}

const emptyDraft = (): RuleDraft => ({
  name: '',
  kind: 'lab_threshold',
  labItem: '',
  comparator: 'lt',
  threshold: '',
  dayThreshold: '14',
  severity: 'warning',
});

const COMPARATORS: Array<{ value: AlertComparator; label: string }> = [
  { value: 'lt', label: '< 미만' },
  { value: 'lte', label: '≤ 이하' },
  { value: 'gt', label: '> 초과' },
  { value: 'gte', label: '≥ 이상' },
  { value: 'abnormal', label: '참조범위 이탈' },
];

export function AlertRuleSettings() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const { rules, error, fetchRules, addRule, editRule, removeRule } = useAlertStore();
  const { toast } = useToast();
  const [draft, setDraft] = useState<RuleDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  const canSubmit = useMemo(() => {
    if (!draft.name.trim()) return false;
    if (draft.kind === 'antibiotic_duration') return Number(draft.dayThreshold) > 0;
    if (!draft.labItem.trim()) return false;
    return draft.comparator === 'abnormal' || Number.isFinite(Number(draft.threshold));
  }, [draft]);

  const submit = async () => {
    if (!canSubmit || !currentUser || saving) return;
    setSaving(true);
    try {
      await addRule(
        draft.kind === 'antibiotic_duration'
          ? {
              name: draft.name.trim(),
              kind: 'antibiotic_duration',
              dayThreshold: Number(draft.dayThreshold),
              severity: draft.severity,
              isEnabled: true,
            }
          : {
              name: draft.name.trim(),
              kind: 'lab_threshold',
              labItem: draft.labItem.trim(),
              comparator: draft.comparator,
              threshold:
                draft.comparator === 'abnormal' ? undefined : Number(draft.threshold),
              severity: draft.severity,
              isEnabled: true,
            },
        currentUser.id
      );
      setDraft(emptyDraft());
      toast({ title: '알림 규칙을 추가했습니다.' });
    } catch {
      // 오류는 스토어 error로 표시된다
    } finally {
      setSaving(false);
    }
  };

  const addSuggested = async () => {
    if (!currentUser || saving) return;
    setSaving(true);
    try {
      const existing = new Set(rules.map((rule) => rule.name));
      const missing = SUGGESTED_RULES.filter((rule) => !existing.has(rule.name));
      for (const rule of missing) {
        await addRule(rule, currentUser.id);
      }
      toast({
        title: missing.length > 0 ? `${missing.length}개 규칙을 추가했습니다.` : '이미 모두 있습니다.',
      });
    } catch {
      // 스토어 error로 표시
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">알림 규칙</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Lab 수치나 항생제 사용 일수가 조건에 걸리면 Today에 알림으로 뜹니다. 규칙은 본인에게만
        적용됩니다.
      </p>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-center">
          <p className="text-sm text-muted-foreground">아직 규칙이 없습니다.</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={addSuggested} disabled={saving}>
            자주 쓰는 규칙 4개 추가
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                role="switch"
                aria-checked={rule.isEnabled}
                aria-label={`${rule.name} 사용`}
                onClick={() => void editRule(rule.id, { isEnabled: !rule.isEnabled })}
                className={cn(
                  'h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors',
                  rule.isEnabled ? 'bg-zinc-900' : 'bg-zinc-300'
                )}
              >
                <span
                  className={cn(
                    'block h-4 w-4 rounded-full bg-white transition-transform',
                    rule.isEnabled && 'translate-x-4'
                  )}
                />
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm', !rule.isEnabled && 'text-muted-foreground')}>
                  {rule.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {describeRule(rule)} · {SEVERITY_LABEL[rule.severity]}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                aria-label={`${rule.name} 삭제`}
                onClick={() => void removeRule(rule.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
        <h3 className="text-sm font-medium">규칙 추가</h3>
        <Input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder="규칙 이름 (예: 저나트륨혈증)"
          aria-label="규칙 이름"
        />
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="규칙 종류"
            value={draft.kind}
            onChange={(event) =>
              setDraft({ ...draft, kind: event.target.value as AlertRuleKind })
            }
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="lab_threshold">Lab 수치</option>
            <option value="antibiotic_duration">항생제 사용 일수</option>
          </select>

          {draft.kind === 'lab_threshold' ? (
            <>
              <Input
                value={draft.labItem}
                onChange={(event) => setDraft({ ...draft, labItem: event.target.value })}
                placeholder="항목 (예: Na)"
                aria-label="검사 항목"
                className="w-28"
              />
              <select
                aria-label="비교 조건"
                value={draft.comparator}
                onChange={(event) =>
                  setDraft({ ...draft, comparator: event.target.value as AlertComparator })
                }
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {COMPARATORS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {draft.comparator !== 'abnormal' && (
                <Input
                  value={draft.threshold}
                  onChange={(event) => setDraft({ ...draft, threshold: event.target.value })}
                  placeholder="기준값"
                  aria-label="기준값"
                  inputMode="decimal"
                  className="w-24"
                />
              )}
            </>
          ) : (
            <Input
              value={draft.dayThreshold}
              onChange={(event) => setDraft({ ...draft, dayThreshold: event.target.value })}
              placeholder="일수"
              aria-label="사용 일수"
              inputMode="numeric"
              className="w-24"
            />
          )}

          <select
            aria-label="심각도"
            value={draft.severity}
            onChange={(event) =>
              setDraft({ ...draft, severity: event.target.value as AlertSeverity })
            }
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="info">정보</option>
            <option value="warning">주의</option>
            <option value="critical">위험</option>
          </select>

          <Button size="sm" onClick={submit} disabled={!canSubmit || saving}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            추가
          </Button>
        </div>
      </div>
    </Card>
  );
}
