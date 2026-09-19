import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDateInput } from '@/components/clinical/dateLabels';
import { AiActionPanel } from '@/components/ai/AiActionPanel';
import { LabParseInput } from '@/components/lab/LabParseInput';
import { generateLabSummary } from '@/services/aiService';
import type { ParsedLabItem } from '@/services/parser/labParser';
import type { LabResult } from '@/types/lab';
import { CollapsiblePanel } from '../controls';
import { CultureSection } from '../sections/CultureSection';
import { RecentLabSection } from '../sections/RecentLabSection';
import { StandardLabItemForm } from '../forms/StandardLabItemForm';
import type {
  PatientWorkspaceManualLab,
  PatientWorkspaceProps,
  WorkspaceTabBaseProps,
} from '../types';
import { buildLabValueTable, buildStandardLabItemOptions } from '../workspaceData';
import { isClinicalDateInput } from '../workspaceInput';
import { LabTrendDialog } from './LabTrendDialog';
import { LabValueTable, type EditingCell } from './LabValueTable';

interface LabTabProps extends WorkspaceTabBaseProps {
  manualLabs: PatientWorkspaceManualLab[];
  labResults: LabResult[];
  onUpdateLabValue?: PatientWorkspaceProps['onUpdateLabValue'];
  onDeleteLabDate?: PatientWorkspaceProps['onDeleteLabDate'];
  onRemoveLab?: PatientWorkspaceProps['onRemoveLab'];
  onSaveParsedLabs?: PatientWorkspaceProps['onSaveParsedLabs'];
  onLoadLabs?: PatientWorkspaceProps['onLoadLabs'];
}

export function LabTab({
  patient,
  data,
  manualLabs,
  labResults,
  onUpdateLabValue,
  onDeleteLabDate,
  onRemoveLab,
  onSaveParsedLabs,
  onLoadLabs,
  onDirtyChange,
}: LabTabProps) {
  const standardLabItems = useMemo(() => buildStandardLabItemOptions(), []);
  const standardLabCategories = useMemo(
    () => Array.from(new Set(standardLabItems.map((item) => item.category))),
    [standardLabItems]
  );
  const [newItemDraft, setNewItemDraft] = useState({
    category: standardLabCategories[0] ?? 'CBC',
    itemName: standardLabItems[0]?.name ?? '',
    value: '',
    dateKey: formatDateInput(new Date()),
  });
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [addingDateKey, setAddingDateKey] = useState('');
  const [parseOpen, setParseOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trendItem, setTrendItem] = useState<{ name: string; code?: string } | null>(null);

  const labs = useMemo(
    () => data.recentLabs.filter((item) => item.patientId === patient.id),
    [data.recentLabs, patient.id]
  );
  const visibleManualLabs = useMemo(
    () => manualLabs.filter((item) => item.patientId === patient.id),
    [manualLabs, patient.id]
  );
  const hasValidDate = isClinicalDateInput(newItemDraft.dateKey);
  const hasDraft = Boolean(newItemDraft.itemName.trim() && newItemDraft.value.trim());

  useEffect(() => {
    setNewItemDraft({
      category: standardLabCategories[0] ?? 'CBC',
      itemName: standardLabItems[0]?.name ?? '',
      value: '',
      dateKey: formatDateInput(new Date()),
    });
    setEditingCell(null);
    setAddingDateKey('');
    setParseOpen(false);
    setSaving(false);
    setTrendItem(null);
  }, [patient.id, standardLabCategories, standardLabItems]);
  useEffect(() => {
    void onLoadLabs?.(patient.id);
  }, [onLoadLabs, patient.id]);
  useEffect(() => onDirtyChange?.(hasDraft), [hasDraft, onDirtyChange]);

  const patientLabResults = useMemo(
    () => labResults.filter((lab) => lab.patientId === patient.id),
    [labResults, patient.id]
  );
  const table = useMemo(
    () =>
      buildLabValueTable(
        patientLabResults.filter((lab) => lab.category !== 'Culture'),
        isClinicalDateInput(addingDateKey) ? addingDateKey : undefined
      ),
    [addingDateKey, patientLabResults]
  );
  const cultureResults = useMemo(
    () =>
      patientLabResults
        .filter((lab) => lab.category === 'Culture')
        .sort((a, b) => b.testDate.getTime() - a.testDate.getTime()),
    [patientLabResults]
  );

  const labSummaryText = useMemo(() => buildLabSummaryText(table), [table]);

  const updateLabValue = useCallback(
    async (dateKey: string, itemName: string, value: string) => {
      const option = standardLabItems.find((item) => item.name === itemName);
      await onUpdateLabValue?.({
        dateKey,
        itemName,
        value,
        metadata: option
          ? {
              code: option.code,
              category: option.category,
              unit: option.unit,
              referenceMin: option.referenceMin,
              referenceMax: option.referenceMax,
            }
          : undefined,
      });
    },
    [onUpdateLabValue, standardLabItems]
  );

  const saveStandardLabItem = useCallback(async () => {
    if (!hasDraft || !hasValidDate || saving) return;
    setSaving(true);
    try {
      await updateLabValue(newItemDraft.dateKey, newItemDraft.itemName, newItemDraft.value);
      setNewItemDraft((current) => ({
        ...current,
        value: '',
        dateKey: formatDateInput(new Date()),
      }));
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [hasDraft, hasValidDate, newItemDraft, saving, updateLabValue]);

  const saveEditedCell = useCallback(async () => {
    if (!editingCell || saving) return;
    setSaving(true);
    try {
      await updateLabValue(editingCell.dateKey, editingCell.itemName, editingCell.value);
      setEditingCell(null);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }, [editingCell, saving, updateLabValue]);

  const deleteLabDate = useCallback(
    async (dateKey: string) => {
      if (!onDeleteLabDate || saving) return;
      if (!window.confirm(`${dateKey} Lab 결과를 삭제할까요?`)) return;
      setSaving(true);
      try {
        await onDeleteLabDate(dateKey);
      } finally {
        setSaving(false);
      }
    },
    [onDeleteLabDate, saving]
  );

  const saveParsedLabs = useCallback(
    async (items: ParsedLabItem[], testDate: Date) => {
      await onSaveParsedLabs?.(items, testDate, 'parsed');
      setParseOpen(false);
      await onLoadLabs?.(patient.id);
    },
    [onLoadLabs, onSaveParsedLabs, patient.id]
  );

  const runLabSummary = useCallback(
    () =>
      generateLabSummary({
        patientName: patient.name,
        chiefComplaint: patient.chiefComplaint,
        labData: labSummaryText,
      }),
    [labSummaryText, patient.chiefComplaint, patient.name]
  );

  return (
    <div className="space-y-3">
      <LabValueTable
        table={table}
        addingDateKey={addingDateKey}
        editingCell={editingCell}
        saving={saving}
        onAddingDateKeyChange={setAddingDateKey}
        onEditingCellChange={setEditingCell}
        onCommitEdit={saveEditedCell}
        onDeleteDate={deleteLabDate}
        onShowTrend={setTrendItem}
      />

      <AiActionPanel
        title="AI Lab 요약"
        actionLabel="Lab 요약 생성"
        resultTitle="Lab 임상 요약"
        resetKey={patient.id}
        ready={Boolean(labSummaryText)}
        readyHint="최근 Lab 수치를 임상적으로 요약합니다."
        notReadyHint="요약할 Lab 수치가 없습니다."
        run={runLabSummary}
      />

      <CultureSection results={cultureResults} />

      <RecentLabSection labs={labs} manualLabs={visibleManualLabs} onRemoveLab={onRemoveLab} />

      <CollapsiblePanel title="표준 항목 추가">
        <StandardLabItemForm
          draft={newItemDraft}
          categories={standardLabCategories}
          items={standardLabItems}
          setDraft={setNewItemDraft}
          saving={saving}
          onSave={saveStandardLabItem}
          hasValidDate={hasValidDate}
        />
      </CollapsiblePanel>

      <CollapsiblePanel title="Lab 파싱">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setParseOpen(true)}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-[12px] font-medium hover:bg-zinc-50"
            >
              OCS 붙여넣기
            </button>
          </div>
          {parseOpen && (
            <LabParseInput
              mode="paste"
              patientId={patient.id}
              registrationNumber={patient.registrationNumber}
              onSave={saveParsedLabs}
              onClose={() => setParseOpen(false)}
            />
          )}
        </div>
      </CollapsiblePanel>

      {trendItem && (
        <LabTrendDialog
          patientId={patient.id}
          itemName={trendItem.name}
          itemCode={trendItem.code}
          onClose={() => setTrendItem(null)}
        />
      )}
    </div>
  );
}

/** AI Lab 요약에 넘길 텍스트 — 최근 5개 날짜의 수치 표를 그대로 직렬화한다. */
function buildLabSummaryText(table: ReturnType<typeof buildLabValueTable>): string {
  const dates = table.dates.slice(0, 5);
  if (dates.length === 0 || table.itemRows.length === 0) return '';

  const lines = [['항목', ...dates, '참고치', '단위'].join('\t')];
  for (const row of table.itemRows) {
    const cells = dates.map((date) => {
      const value = row.values.get(date);
      if (!value) return '-';
      return `${value.value}${value.flag ? ` ${value.flag}` : ''}`;
    });
    lines.push([row.name, ...cells, row.referenceText, row.unit].join('\t'));
  }
  return lines.join('\n');
}
