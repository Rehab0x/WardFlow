import { useEffect, useMemo, useState } from 'react';
import { CopyBar } from '@/components/clinical/CopyBar';
import { DataSection } from '@/components/clinical/DataSection';
import { formatClockTime } from '@/components/clinical/dateLabels';
import { TemplatePopup } from '@/components/charting/TemplatePopup';
import type { TemplateField } from '@/services/templateService';
import { useChartingSettingsStore } from '@/stores/useChartingSettingsStore';
import { ChartField } from '../controls';
import type { ChartingDraft } from '../types';
import { buildChartingCopy } from '../workspaceData';
import { areDraftsEqual } from '../workspaceInput';

const CHART_FIELDS: Array<{
  key: keyof ChartingDraft;
  label: string;
  rows: number;
  placeholder?: string;
  /** 템플릿 팝업을 지원하지 않는 필드는 생략 */
  template?: TemplateField;
}> = [
  { key: 'chiefComplaint', label: 'C/C', rows: 2, template: 'chiefComplaint' },
  {
    key: 'onset',
    label: 'Onset',
    rows: 1,
    placeholder: 'YYYY-MM-DD 또는 자유 입력',
    template: 'onset',
  },
  { key: 'presentIllness', label: 'P/I', rows: 4, template: 'presentIllness' },
  { key: 'pastHistory', label: 'P/H', rows: 3, template: 'pastHistory' },
  { key: 'reviewOfSystem', label: 'ROS', rows: 3, template: 'reviewOfSystem' },
  { key: 'physicalExam', label: 'P/Ex', rows: 3, template: 'physicalExam' },
  { key: 'problemListText', label: 'Problem', rows: 4, placeholder: '한 줄에 하나씩 입력' },
  { key: 'plan', label: 'Plan', rows: 4, template: 'plan' },
  {
    key: 'guardianExplanation',
    label: '보호자설명',
    rows: 3,
    template: 'guardianExplanation',
  },
  { key: 'etc', label: 'Etc', rows: 3, template: 'etc' },
];

export function ChartingTab({
  initialDraft,
  onSave,
  onDirtyChange,
}: {
  initialDraft: ChartingDraft;
  onSave?: (draft: ChartingDraft) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [templatePopup, setTemplatePopup] = useState<{
    field: TemplateField;
    label: string;
    key: keyof ChartingDraft;
  } | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const copyFormat = useChartingSettingsStore((state) => state.getCopyFormat());
  const isDirty = !areDraftsEqual(draft, initialDraft);
  const copyText = useMemo(() => buildChartingCopy(draft, copyFormat), [draft, copyFormat]);

  useEffect(() => setDraft(initialDraft), [initialDraft]);
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  const update = (field: keyof ChartingDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

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
    <div className="space-y-3">
      <CopyBar title="OCS 복사" text={copyText} emptyText="복사할 차팅 내용 없음" />
      {templatePopup && (
        <TemplatePopup
          open
          field={templatePopup.field}
          fieldLabel={templatePopup.label}
          currentContent={String(draft[templatePopup.key] ?? '')}
          onClose={() => setTemplatePopup(null)}
          onApply={(content) => update(templatePopup.key, content)}
        />
      )}
      <DataSection
        title="차팅"
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
          className="grid gap-2 p-2 lg:grid-cols-2"
          onKeyDown={(event) => {
            if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
            event.preventDefault();
            save();
          }}
        >
          {CHART_FIELDS.map((field) => (
            <ChartField
              key={field.key}
              label={field.label}
              value={draft[field.key]}
              rows={field.rows}
              placeholder={field.placeholder}
              onChange={(value) => update(field.key, value)}
              onTemplate={
                field.template
                  ? () =>
                      setTemplatePopup({
                        field: field.template!,
                        label: field.label,
                        key: field.key,
                      })
                  : undefined
              }
            />
          ))}
        </div>
      </DataSection>
    </div>
  );
}
