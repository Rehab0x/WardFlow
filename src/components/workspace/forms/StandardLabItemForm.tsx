import type { Dispatch, SetStateAction } from 'react';
import { DataSection } from '@/components/clinical/DataSection';
import { formatDateInput } from '@/components/clinical/dateLabels';
import { Input, SaveButton } from '../controls';
import type { StandardLabItemOption } from '../workspaceData';
import { isComposingKeyboardEvent } from '../workspaceInput';

export interface StandardLabItemDraft {
  category: string;
  itemName: string;
  value: string;
  dateKey: string;
}

export function StandardLabItemForm({
  draft,
  categories,
  items,
  setDraft,
  saving,
  hasValidDate,
  onSave,
}: {
  draft: StandardLabItemDraft;
  categories: string[];
  items: StandardLabItemOption[];
  setDraft: Dispatch<SetStateAction<StandardLabItemDraft>>;
  saving: boolean;
  hasValidDate: boolean;
  onSave: () => void | Promise<void>;
}) {
  const filteredItems = items.filter((item) => item.category === draft.category);

  return (
    <DataSection title="표준 항목 추가">
      <div
        className="grid gap-2 p-2 sm:grid-cols-[140px_130px_minmax(0,1fr)_100px_auto]"
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || isComposingKeyboardEvent(event)) return;
          event.preventDefault();
          onSave();
        }}
      >
        <Input
          value={draft.dateKey}
          type="date"
          min="1900-01-01"
          max={formatDateInput(new Date())}
          invalid={!hasValidDate}
          onChange={(value) => setDraft((current) => ({ ...current, dateKey: value }))}
        />
        <select
          aria-label="Lab 카테고리"
          value={draft.category}
          onChange={(event) => {
            const category = event.target.value;
            const firstItem = items.find((item) => item.category === category);
            setDraft((current) => ({ ...current, category, itemName: firstItem?.name ?? '' }));
          }}
          className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          aria-label="Lab 항목"
          value={draft.itemName}
          onChange={(event) => setDraft((current) => ({ ...current, itemName: event.target.value }))}
          className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px]"
        >
          {filteredItems.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
              {item.unit ? ` (${item.unit})` : ''}
            </option>
          ))}
        </select>
        <Input
          value={draft.value}
          placeholder="값"
          onChange={(value) => setDraft((current) => ({ ...current, value }))}
        />
        <SaveButton
          disabled={!draft.itemName.trim() || !draft.value.trim() || !hasValidDate}
          pending={saving}
          onClick={onSave}
        >
          저장
        </SaveButton>
      </div>
      {draft.dateKey && !hasValidDate && (
        <div className="px-2 pb-2 text-[11px] text-red-600">
          Lab 날짜는 1900년부터 오늘 사이로 입력해주세요.
        </div>
      )}
    </DataSection>
  );
}
