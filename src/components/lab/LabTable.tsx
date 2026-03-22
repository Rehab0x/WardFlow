import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { LabResult, LabItem } from '@/types/lab';
import { formatDate } from '@/utils/dateUtils';
import { labCategoryService } from '@/services/labCategoryService';
import type { LabDisplayCategory } from '@/db/database';

interface LabTableProps {
  results: LabResult[];
  categories?: LabDisplayCategory[];
  onItemClick?: (itemCode: string, itemName: string) => void;
  onCellClick?: (date: string, itemName: string, currentValue: string | number) => void;
  onAddCulture?: () => void;
  onEditCulture?: (resultId: string, date: string, name: string, value: string) => void;
  onDeleteCulture?: (resultId: string) => void;
}

interface LabItemWithDates {
  name: string;
  code: string | undefined;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  values: Map<string, LabItem>; // date -> item
  displayOrder: number;
  category: string;
}

export function LabTable({ results, categories: categoriesProp, onItemClick, onCellClick, onAddCulture, onEditCulture, onDeleteCulture }: LabTableProps) {
  const [categories, setCategories] = useState<LabDisplayCategory[]>(categoriesProp ?? []);

  useEffect(() => {
    if (categoriesProp) {
      setCategories(categoriesProp);
    } else {
      labCategoryService.getAll().then(setCategories);
    }
  }, [categoriesProp]);

  if (results.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Lab 결과가 없습니다.</p>
      </Card>
    );
  }

  // Separate culture results
  const cultureResults = results.filter((r) => r.category === 'Culture');
  const labResults = results.filter((r) => r.category !== 'Culture');

  // Get all unique dates (sorted, most recent first)
  const allDates = Array.from(
    new Set(labResults.map((r) => formatDate(r.testDate)))
  )
    .sort()
    .reverse();

  // Build display order map from categories
  const displayOrderMap = labCategoryService.buildDisplayOrderMap(categories);

  // Build item map: itemName -> { dates -> values }
  const itemMap = new Map<string, LabItemWithDates>();

  labResults.forEach((result) => {
    const dateStr = formatDate(result.testDate);

    result.items.forEach((item) => {
      if (!itemMap.has(item.name)) {
        const orderEntry = displayOrderMap.get(item.name.toLowerCase());
        itemMap.set(item.name, {
          name: item.name,
          code: item.code,
          unit: item.unit,
          referenceMin: item.referenceMin,
          referenceMax: item.referenceMax,
          values: new Map(),
          displayOrder: orderEntry?.order ?? 99999,
          category: orderEntry?.category ?? 'Other',
        });
      }

      const itemData = itemMap.get(item.name)!;
      itemData.values.set(dateStr, item);

      // Update reference range if not set
      if (itemData.referenceMin === undefined && item.referenceMin !== undefined) {
        itemData.referenceMin = item.referenceMin;
      }
      if (itemData.referenceMax === undefined && item.referenceMax !== undefined) {
        itemData.referenceMax = item.referenceMax;
      }
    });
  });

  // Sort items by display order
  const sortedItems = Array.from(itemMap.values()).sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  // UA 정성 결과: "-", "neg", "negative", "음성" 외의 값은 비정상으로 표시
  // pH, S.G, Color는 정량/정성이 아닌 항목이므로 제외
  const UA_NUMERIC_ITEMS = new Set(['ph (ua)', 's.g', 'color']);
  const isUaAbnormal = (category: string, itemName: string, value: string): boolean => {
    if (category !== 'UA') return false;
    if (UA_NUMERIC_ITEMS.has(itemName.toLowerCase())) return false;
    const v = value.trim().toLowerCase();
    return v !== '-' && v !== 'neg' && v !== 'negative' && v !== '음성' && v !== '';
  };

  const handleItemClick = (itemCode: string | undefined, itemName: string) => {
    if (onItemClick && itemCode) {
      onItemClick(itemCode, itemName);
    }
  };

  // Build rows with category section headers inserted
  const tableRows: Array<{ type: 'header'; category: string } | { type: 'item'; item: LabItemWithDates }> = [];
  let lastCategory: string | null = null;

  for (const item of sortedItems) {
    if (item.category !== lastCategory) {
      tableRows.push({ type: 'header', category: item.category });
      lastCategory = item.category;
    }
    tableRows.push({ type: 'item', item });
  }

  return (
    <div className="space-y-4">
      {/* Main Lab Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted/30 sticky top-0">
              <tr>
                <th className="border-r bg-background px-3 py-2 text-left font-semibold sticky left-0 z-10 min-w-[120px]">
                  항목
                </th>
                {allDates.map((date) => (
                  <th
                    key={date}
                    className="border-r px-3 py-2 text-center font-medium whitespace-nowrap min-w-[100px]"
                  >
                    {formatDate(new Date(date))}
                  </th>
                ))}
                <th className="bg-background px-3 py-2 text-left font-medium sticky right-0 z-10 min-w-[100px]">
                  참조범위
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => {
                if (row.type === 'header') {
                  return (
                    <tr key={`header-${row.category}-${idx}`}>
                      <td className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 z-10 bg-muted/50 border-t">
                        {row.category}
                      </td>
                      {allDates.map((date) => (
                        <td key={date} className="bg-muted/40 border-t" />
                      ))}
                      <td className="sticky right-0 z-10 bg-muted/40 border-t" />
                    </tr>
                  );
                }

                const item = row.item;
                return (
                  <tr
                    key={item.name}
                    className="border-b hover:bg-muted/5 transition-colors"
                  >
                    {/* Item Name (Sticky Left) - Click for trend chart */}
                    <td
                      className="border-r bg-background px-3 py-2 font-medium sticky left-0 z-10 cursor-pointer hover:bg-muted/30"
                      onClick={() => handleItemClick(item.code, item.name)}
                      title="클릭하여 추이 차트 보기"
                    >
                      <div className="font-semibold">{item.name}</div>
                    </td>

                    {/* Values by Date - Click to edit */}
                    {allDates.map((date) => {
                      const labItem = item.values.get(date);
                      if (!labItem) {
                        return (
                          <td
                            key={date}
                            className="border-r px-3 py-2 text-center text-muted-foreground cursor-pointer hover:bg-muted/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCellClick?.(date, item.name, '');
                            }}
                            title="클릭하여 값 입력"
                          >
                            -
                          </td>
                        );
                      }

                      return (
                        <td
                          key={date}
                          className={cn(
                            'border-r px-3 py-2 text-center font-semibold cursor-pointer hover:opacity-70 transition-opacity',
                            labItem.isAbnormal && labItem.hlFlag === 'H' && 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400',
                            labItem.isAbnormal && labItem.hlFlag === 'L' && 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400',
                            isUaAbnormal(item.category, item.name, String(labItem.value)) && 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCellClick?.(date, item.name, labItem.value);
                          }}
                          title="클릭하여 값 수정"
                        >
                          {labItem.value}
                        </td>
                      );
                    })}

                    {/* Reference Range (Sticky Right) */}
                    <td className="bg-background px-3 py-2 text-xs text-muted-foreground sticky right-0 z-10">
                      {item.referenceMin !== undefined && item.referenceMax !== undefined
                        ? `${item.referenceMin}-${item.referenceMax}`
                        : item.referenceMax !== undefined
                        ? `≤${item.referenceMax}`
                        : item.referenceMin !== undefined
                        ? `≥${item.referenceMin}`
                        : '-'}
                      {item.unit && (
                        <div className="text-[10px] text-muted-foreground/60">
                          {item.unit}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Culture Results Section */}
      {(cultureResults.length > 0 || onAddCulture) && (
        <CultureResultsSection
          results={cultureResults}
          onAdd={onAddCulture}
          onEdit={onEditCulture}
          onDelete={onDeleteCulture}
        />
      )}
    </div>
  );
}

/**
 * Culture Results Section Component
 * Shows culture results with date tabs for selection
 */
function CultureResultsSection({
  results,
  onAdd,
  onEdit,
  onDelete,
}: {
  results: LabResult[];
  onAdd?: () => void;
  onEdit?: (resultId: string, date: string, name: string, value: string) => void;
  onDelete?: (resultId: string) => void;
}) {
  // Sort by date (most recent first)
  const sortedResults = [...results].sort(
    (a, b) => b.testDate.getTime() - a.testDate.getTime()
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedResult = sortedResults[selectedIndex];

  // date string helper: YYYY-MM-DD
  const toDateStr = (d: Date) => {
    const dt = d instanceof Date ? d : new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Culture 결과</h3>
        {onAdd && (
          <Button size="sm" variant="outline" onClick={onAdd} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            추가
          </Button>
        )}
      </div>

      {sortedResults.length === 0 && (
        <p className="text-sm text-muted-foreground">Culture 결과가 없습니다.</p>
      )}

      {/* Date Tabs */}
      {sortedResults.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {sortedResults.map((result, idx) => (
            <button
              key={result.id}
              onClick={() => setSelectedIndex(idx)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md border transition-colors',
                selectedIndex === idx
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-border'
              )}
            >
              {formatDate(result.testDate)}
            </button>
          ))}
        </div>
      )}

      {/* Selected Culture Result */}
      {selectedResult && (
        <div className="rounded border p-3 bg-muted/30">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              {formatDate(selectedResult.testDate)}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {selectedResult.source === 'manual' && '수동 입력'}
                {selectedResult.source === 'xls' && 'XLS 파싱'}
                {selectedResult.source === 'parsed' && '붙여넣기'}
                {selectedResult.source === 'csv' && 'CSV 파일'}
              </Badge>
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => onDelete(selectedResult.id)}
                  title="이 Culture 결과 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {selectedResult.items.map((item, idx) => (
              <div key={idx} className="text-sm group relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{item.name}</span>
                  {onEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() =>
                        onEdit(
                          selectedResult.id,
                          toDateStr(selectedResult.testDate),
                          item.name,
                          String(item.value)
                        )
                      }
                      title="수정"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="text-muted-foreground whitespace-pre-line font-mono text-xs pl-2">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
