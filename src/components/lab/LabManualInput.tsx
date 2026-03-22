import { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LabItem } from '@/types/lab';
import { LAB_CATEGORIES } from '@/types/lab';
import { getLabReference, isValueNormal, getHLFlag } from '@/utils/labReference';
import { parseLocalDate, getLocalToday } from '@/utils/dateUtils';

interface LabManualInputProps {
  patientId: string;
  onSave: (category: string, items: LabItem[], testDate: Date) => Promise<void>;
  onCancel: () => void;
}

export function LabManualInput({ patientId: _patientId, onSave, onCancel }: LabManualInputProps) {
  const [testDate, setTestDate] = useState<string>(() => {
    const t = getLocalToday();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  });
  const [category, setCategory] = useState<string>('Chemistry');
  const [items, setItems] = useState<LabItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Current item being added
  const [currentItem, setCurrentItem] = useState<Partial<LabItem>>({
    code: '',
    name: '',
    value: '',
    unit: '',
  });

  const handleAddItem = () => {
    if (!currentItem.name || currentItem.value === undefined || currentItem.value === '') {
      return;
    }

    // Try to find reference data
    const reference = currentItem.code
      ? getLabReference(currentItem.code)
      : undefined;

    // Parse value as number if possible
    const numericValue = Number(currentItem.value);
    const finalValue = isNaN(numericValue) ? currentItem.value : numericValue;

    const newItem: LabItem = {
      code: currentItem.code || '',
      name: currentItem.name,
      value: finalValue,
      unit: currentItem.unit || reference?.unit || '',
      referenceMin: reference?.referenceMin,
      referenceMax: reference?.referenceMax,
      isAbnormal: false,
      hlFlag: undefined,
    };

    // Determine if abnormal (only for numeric values)
    if (typeof finalValue === 'number' && reference) {
      newItem.isAbnormal = !isValueNormal(finalValue, reference);
      newItem.hlFlag = getHLFlag(finalValue, reference);
    }

    setItems([...items, newItem]);

    // Reset current item
    setCurrentItem({
      code: '',
      name: '',
      value: '',
      unit: '',
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (items.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const date = parseLocalDate(testDate);
      await onSave(category, items, date);
    } catch (error) {
      console.error('Failed to save lab results:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCodeChange = (code: string) => {
    setCurrentItem({ ...currentItem, code });

    // Auto-fill from reference if code matches
    const reference = getLabReference(code);
    if (reference) {
      setCurrentItem({
        code,
        name: reference.name,
        value: currentItem.value,
        unit: reference.unit,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Lab 결과 수동 입력</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Test Date and Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="testDate">검사 날짜</Label>
          <Input
            id="testDate"
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="category">카테고리</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LAB_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Item Form */}
      <Card className="p-4">
        <h4 className="mb-3 text-sm font-medium">항목 추가</h4>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-1">
            <Label htmlFor="code" className="text-xs">
              검사코드
            </Label>
            <Input
              id="code"
              placeholder="B2730"
              value={currentItem.code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="name" className="text-xs">
              항목명 *
            </Label>
            <Input
              id="name"
              placeholder="BUN"
              value={currentItem.name}
              onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="value" className="text-xs">
              결과값 *
            </Label>
            <Input
              id="value"
              placeholder="18.5"
              value={currentItem.value}
              onChange={(e) => setCurrentItem({ ...currentItem, value: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="unit" className="text-xs">
              단위
            </Label>
            <Input
              id="unit"
              placeholder="mg/dL"
              value={currentItem.unit}
              onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={handleAddItem}>
            <Plus className="mr-2 h-4 w-4" />
            항목 추가
          </Button>
        </div>
      </Card>

      {/* Items List */}
      {items.length > 0 && (
        <Card className="p-4">
          <h4 className="mb-3 text-sm font-medium">입력된 항목 ({items.length})</h4>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded border p-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  {item.code && (
                    <span className="text-xs text-muted-foreground">{item.code}</span>
                  )}
                  <span className="font-medium">{item.name}</span>
                  <span
                    className={
                      item.isAbnormal
                        ? 'font-semibold text-red-600'
                        : 'text-foreground'
                    }
                  >
                    {item.value}
                  </span>
                  {item.unit && <span className="text-muted-foreground">{item.unit}</span>}
                  {item.hlFlag && (
                    <Badge
                      variant={item.hlFlag === 'H' ? 'destructive' : 'secondary'}
                      className="h-5 px-1.5 text-xs"
                    >
                      {item.hlFlag}
                    </Badge>
                  )}
                  {item.referenceMin !== undefined || item.referenceMax !== undefined ? (
                    <span className="text-xs text-muted-foreground">
                      (
                      {item.referenceMin !== undefined && item.referenceMax !== undefined
                        ? `${item.referenceMin} ~ ${item.referenceMax}`
                        : item.referenceMax !== undefined
                        ? `≤${item.referenceMax}`
                        : `≥${item.referenceMin}`}
                      )
                    </span>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRemoveItem(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={handleSave} disabled={items.length === 0 || isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  );
}
