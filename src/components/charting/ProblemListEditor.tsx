import { useState } from 'react';
import { X, Plus, List, AlignLeft, Pencil, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResizableTextArea } from './ResizableTextArea';
import { cn } from '@/utils/cn';
import type { ProblemListMode } from '@/types/charting';

export interface ProblemListEditorProps {
  value: string[];
  textValue?: string;
  onChange: (value: string[]) => void;
  onTextChange?: (value: string) => void;
  mode?: ProblemListMode;
  onModeChange?: (mode: ProblemListMode) => void;
  className?: string;
}

/**
 * ProblemListEditor - Problem List 편집기
 *
 * 두 가지 모드:
 * 1. 리스트 모드: 항목별로 입력 (배열)
 * 2. 텍스트 모드: 자유롭게 텍스트로 입력 (긴 텍스트)
 *
 * 모드 전환 시 자동 변환:
 * - 리스트 → 텍스트: 줄바꿈으로 연결
 * - 텍스트 → 리스트: 줄바꿈으로 분리
 */
export const ProblemListEditor = ({
  value,
  textValue = '',
  onChange,
  onTextChange,
  mode: controlledMode,
  onModeChange,
  className,
}: ProblemListEditorProps) => {
  const [localMode, setLocalMode] = useState<ProblemListMode>('list');
  const [newProblem, setNewProblem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const mode = controlledMode ?? localMode;

  const handleModeChange = (newMode: ProblemListMode) => {
    if (newMode === mode) return;

    // 모드 전환 시 데이터 변환
    if (newMode === 'text') {
      // 리스트 → 텍스트
      const text = value.join('\n');
      onTextChange?.(text);
    } else {
      // 텍스트 → 리스트
      const list = textValue.split('\n').filter((line) => line.trim() !== '');
      onChange(list);
    }

    if (onModeChange) {
      onModeChange(newMode);
    } else {
      setLocalMode(newMode);
    }
  };

  const handleAddProblem = () => {
    if (newProblem.trim() === '') return;
    onChange([...value, newProblem.trim()]);
    setNewProblem('');
  };

  const handleRemoveProblem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleMoveProblem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= value.length) return;
    const newList = [...value];
    [newList[index], newList[newIndex]] = [newList[newIndex]!, newList[index]!];
    onChange(newList);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(value[index] ?? '');
  };

  const handleFinishEdit = () => {
    if (editingIndex === null) return;
    if (editingText.trim() === '') {
      handleRemoveProblem(editingIndex);
    } else {
      const newList = [...value];
      newList[editingIndex] = editingText.trim();
      onChange(newList);
    }
    setEditingIndex(null);
    setEditingText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddProblem();
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={mode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleModeChange('list')}
          className="h-8"
        >
          <List className="mr-1 h-4 w-4" />
          리스트
        </Button>
        <Button
          type="button"
          variant={mode === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleModeChange('text')}
          className="h-8"
        >
          <AlignLeft className="mr-1 h-4 w-4" />
          텍스트
        </Button>
      </div>

      {/* List Mode */}
      {mode === 'list' && (
        <div className="space-y-2">
          {/* Existing Problems */}
          {value.length > 0 && (
            <div className="space-y-2">
              {value.map((problem, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1.5"
                >
                  <span className="text-sm font-medium text-muted-foreground w-5 text-center shrink-0">
                    {index + 1}.
                  </span>
                  {editingIndex === index ? (
                    <>
                      <Input
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFinishEdit(); } }}
                        className="flex-1 h-7 text-sm"
                        autoFocus
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleFinishEdit}>
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{problem}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleMoveProblem(index, 'up')} disabled={index === 0}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleMoveProblem(index, 'down')} disabled={index === value.length - 1}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleStartEdit(index)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveProblem(index)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add New Problem */}
          <div className="flex gap-2">
            <Input
              value={newProblem}
              onChange={(e) => setNewProblem(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="새 문제 추가..."
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleAddProblem}
              size="icon"
              className="flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Text Mode */}
      {mode === 'text' && (
        <ResizableTextArea
          value={textValue}
          onChange={(e) => onTextChange?.(e.target.value)}
          placeholder="문제 목록을 자유롭게 입력하세요..."
          minRows={4}
          maxRows={15}
        />
      )}
    </div>
  );
};
