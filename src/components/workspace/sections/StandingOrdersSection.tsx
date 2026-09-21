import { useEffect, useState } from 'react';
import { CopyBar } from '@/components/clinical/CopyBar';
import { DataSection } from '@/components/clinical/DataSection';
import { formatClockTime } from '@/components/clinical/dateLabels';
import { TemplatePopup } from '@/components/charting/TemplatePopup';
import { ChartField } from '../controls';

/**
 * 지시오더 — 처방할 때마다 다시 적어 넣는 간호 지시 묶음.
 *
 * 환자를 열면 가장 먼저 보이는 요약 탭에 둔다. 내용은 매번 통째로 갈아 끼우다시피 하므로
 * 차팅과 같은 템플릿 팝업을 붙여 붙여넣기로 채울 수 있게 했다.
 */
export function StandingOrdersSection({
  value,
  onSave,
  onDirtyChange,
}: {
  value: string;
  onSave?: (text: string) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const isDirty = draft !== value;

  // 환자를 바꾸거나 서버 값이 갱신되면 편집 중이던 내용을 서버 값으로 되돌린다.
  useEffect(() => {
    setDraft(value);
    setSavedAt(null);
  }, [value]);

  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);
  // 탭을 벗어날 때 미저장 플래그를 내려놓지 않으면 다른 탭이 물려받는다.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const save = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await onSave?.(draft);
      setSavedAt(new Date());
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {templateOpen && (
        <TemplatePopup
          open
          field="standingOrders"
          fieldLabel="지시오더"
          currentContent={draft}
          onClose={() => setTemplateOpen(false)}
          onApply={setDraft}
        />
      )}
      <DataSection
        title="지시오더"
        action={
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className={isDirty ? 'text-amber-600' : 'text-zinc-400'}>
              {isDirty ? '미저장' : '저장됨'}
            </span>
            {savedAt && (
              <span className="font-mono tabular-nums">저장 {formatClockTime(savedAt)}</span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!isDirty || saving}
              className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white disabled:bg-zinc-300"
            >
              {saving ? '저장 중' : '저장'}
            </button>
          </div>
        }
      >
        <div
          className="grid gap-2 p-2"
          onKeyDown={(event) => {
            if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
            event.preventDefault();
            save();
          }}
        >
          <ChartField
            label="지시오더"
            value={draft}
            rows={6}
            placeholder="처방과 함께 넣을 지시 내용 (템플릿에서 불러올 수 있습니다)"
            onChange={setDraft}
            onTemplate={() => setTemplateOpen(true)}
          />
          <CopyBar title="지시오더 복사" text={draft} emptyText="복사할 지시오더 없음" />
        </div>
      </DataSection>
    </>
  );
}
