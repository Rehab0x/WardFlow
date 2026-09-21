import { useEffect, useState } from 'react';
import { CopyBar } from '@/components/clinical/CopyBar';
import { DataSection } from '@/components/clinical/DataSection';
import { formatClockTime } from '@/components/clinical/dateLabels';
import { TemplatePopup } from '@/components/charting/TemplatePopup';
import type { TemplateField } from '@/services/templateService';
import { ChartField } from '../controls';

/**
 * 환자당 글 한 덩어리를 두는 요약 탭 박스 (중요사항 · 지시오더).
 *
 * 저장 방식은 차팅과 같다 — 고치면 미저장 표시가 뜨고 저장 버튼을 눌러야 반영된다.
 * 템플릿과 복사는 필요한 박스에서만 켠다(`templateField`, `copyTitle`).
 */
export function PatientTextSection({
  title,
  value,
  placeholder,
  rows = 6,
  templateField,
  copyTitle,
  onSave,
  onDirtyChange,
}: {
  title: string;
  value: string;
  placeholder?: string;
  rows?: number;
  /** 지정하면 템플릿 팝업 버튼이 붙는다 */
  templateField?: TemplateField;
  /** 지정하면 복사 바가 붙는다 */
  copyTitle?: string;
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
      {templateField && templateOpen && (
        <TemplatePopup
          open
          field={templateField}
          fieldLabel={title}
          currentContent={draft}
          onClose={() => setTemplateOpen(false)}
          onApply={setDraft}
        />
      )}
      <DataSection
        title={title}
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
        {/*
          grid-cols-1은 minmax(0,1fr)이라 열이 내용 너비를 따라 늘어나지 않는다.
          클래스 없이 grid만 쓰면 암묵 열이 auto가 되어 긴 줄에 밀려 옆으로 넘친다.
        */}
        <div
          className="grid min-w-0 grid-cols-1 gap-2 p-2"
          onKeyDown={(event) => {
            if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
            event.preventDefault();
            save();
          }}
        >
          <ChartField
            label={title}
            value={draft}
            rows={rows}
            placeholder={placeholder}
            onChange={setDraft}
            onTemplate={templateField ? () => setTemplateOpen(true) : undefined}
          />
          {copyTitle && <CopyBar title={copyTitle} text={draft} emptyText="복사할 내용 없음" />}
        </div>
      </DataSection>
    </>
  );
}
