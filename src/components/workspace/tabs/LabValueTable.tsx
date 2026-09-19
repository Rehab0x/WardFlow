import { Fragment } from 'react';
import { ClinicalRow } from '@/components/clinical/ClinicalRow';
import { DataSection } from '@/components/clinical/DataSection';
import { formatDateInput } from '@/components/clinical/dateLabels';
import { Input } from '../controls';
import type { buildLabValueTable } from '../workspaceData';
import { isClinicalDateInput, isComposingKeyboardEvent } from '../workspaceInput';

type LabTable = ReturnType<typeof buildLabValueTable>;

export interface EditingCell {
  dateKey: string;
  itemName: string;
  value: string;
}

interface LabValueTableProps {
  table: LabTable;
  addingDateKey: string;
  editingCell: EditingCell | null;
  saving: boolean;
  onAddingDateKeyChange: (value: string) => void;
  onEditingCellChange: (cell: EditingCell | null) => void;
  onCommitEdit: () => void | Promise<void>;
  onDeleteDate: (dateKey: string) => void | Promise<void>;
  onShowTrend: (row: { name: string; code?: string }) => void;
}

export function LabValueTable({
  table,
  addingDateKey,
  editingCell,
  saving,
  onAddingDateKeyChange,
  onEditingCellChange,
  onCommitEdit,
  onDeleteDate,
  onShowTrend,
}: LabValueTableProps) {
  return (
    <DataSection title="Lab 수치 표" count={table.itemRows.length}>
      {table.itemRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
          <Input
            value={addingDateKey}
            type="date"
            min="1900-01-01"
            max={formatDateInput(new Date())}
            invalid={Boolean(addingDateKey) && !isClinicalDateInput(addingDateKey)}
            onChange={onAddingDateKeyChange}
          />
          {addingDateKey && isClinicalDateInput(addingDateKey) && (
            <span className="text-[11px] text-zinc-500">
              빈 칸의 + 버튼으로 {addingDateKey} 값을 추가
            </span>
          )}
          {addingDateKey && (
            <button
              type="button"
              onClick={() => onAddingDateKeyChange('')}
              className="h-8 rounded-md border border-zinc-200 px-2 text-[11px] text-zinc-500 hover:bg-zinc-50"
            >
              취소
            </button>
          )}
        </div>
      )}
      {table.itemRows.length === 0 ? (
        <ClinicalRow prefix="-" title="0" detail="저장된 Lab 수치 없음" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-[11px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-zinc-200 bg-white px-2 py-1.5 text-left font-medium text-zinc-500">
                  항목
                </th>
                {table.dates.map((date) => (
                  <th
                    key={date}
                    className="border-b border-zinc-200 px-2 py-1.5 text-right font-mono font-medium text-zinc-500"
                  >
                    <span className="inline-flex items-center justify-end gap-1">
                      <span>{date}</span>
                      {table.dateLabIds.get(date)?.length ? (
                        <button
                          type="button"
                          onClick={() => void onDeleteDate(date)}
                          disabled={saving}
                          className="inline-flex h-4 w-4 items-center justify-center rounded text-[10px] text-zinc-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed"
                          aria-label={`${date} Lab 삭제`}
                        >
                          ×
                        </button>
                      ) : null}
                    </span>
                  </th>
                ))}
                <th className="border-b border-zinc-200 px-2 py-1.5 text-left font-medium text-zinc-500">
                  참고치
                </th>
                <th className="border-b border-zinc-200 px-2 py-1.5 text-left font-medium text-zinc-500">
                  단위
                </th>
              </tr>
            </thead>
            <tbody>
              {table.itemRows.map((row, index) => {
                const previous = table.itemRows[index - 1];
                const showCategory = !previous || previous.category !== row.category;
                return (
                  <Fragment key={row.name}>
                    {showCategory && (
                      <tr>
                        <td
                          colSpan={table.dates.length + 3}
                          className="border-b border-zinc-200 bg-zinc-100 px-2 py-1.5 text-left text-[10.5px] font-semibold uppercase text-zinc-600"
                        >
                          {row.category}
                        </td>
                      </tr>
                    )}
                    <tr className="odd:bg-zinc-50/60">
                      <td className="sticky left-0 z-10 max-w-[140px] border-b border-zinc-100 bg-inherit px-2 py-1.5 font-medium text-zinc-700">
                        <button
                          type="button"
                          onClick={() => onShowTrend(row)}
                          title={`${row.name} 추이 보기`}
                          className="text-left hover:text-zinc-900 hover:underline"
                        >
                          {row.name}
                        </button>
                      </td>
                      {table.dates.map((date) => {
                        const value = row.values.get(date);
                        const isEditing =
                          editingCell?.dateKey === date && editingCell.itemName === row.name;
                        return (
                          <td
                            key={date}
                            className="border-b border-zinc-100 px-2 py-1.5 text-right font-mono tabular-nums"
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                aria-label={`${row.name} ${date} 값`}
                                value={editingCell.value}
                                onChange={(event) =>
                                  onEditingCellChange({ ...editingCell, value: event.target.value })
                                }
                                onBlur={() => void onCommitEdit()}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' && !isComposingKeyboardEvent(event)) {
                                    event.preventDefault();
                                    void onCommitEdit();
                                  }
                                  if (event.key === 'Escape') onEditingCellChange(null);
                                }}
                                className="h-7 w-20 rounded border border-zinc-300 px-1.5 text-right text-[11px] outline-none focus:ring-1 focus:ring-zinc-400"
                              />
                            ) : value ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onEditingCellChange({
                                    dateKey: date,
                                    itemName: row.name,
                                    value: String(value.value),
                                  })
                                }
                                className={
                                  value.flag
                                    ? 'font-semibold text-red-600 hover:underline'
                                    : 'text-zinc-700 hover:underline'
                                }
                              >
                                {value.value}
                                {value.flag && <span className="ml-1 text-[10px]">{value.flag}</span>}
                              </button>
                            ) : date === addingDateKey ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onEditingCellChange({ dateKey: date, itemName: row.name, value: '' })
                                }
                                className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-dashed border-zinc-300 px-1.5 text-[11px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-700"
                              >
                                +
                              </button>
                            ) : (
                              <span className="text-zinc-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="border-b border-zinc-100 px-2 py-1.5 text-zinc-400">
                        {row.referenceText}
                      </td>
                      <td className="border-b border-zinc-100 px-2 py-1.5 text-zinc-400">
                        {row.unit}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DataSection>
  );
}
