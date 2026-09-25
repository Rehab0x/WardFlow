import type { LabItem } from '@/types/lab';
import { cn } from '@/utils/cn';
import {
  isCompactCultureResult,
  parseCultureText,
  type CultureLine,
  type SusceptibilityInterpretation,
} from '../cultureText';

const INTERPRETATION_CLASS: Record<SusceptibilityInterpretation, string> = {
  S: 'text-zinc-700',
  I: 'font-semibold text-amber-600',
  R: 'font-semibold text-red-600',
};

interface CultureResultItemProps {
  item: LabItem;
}

export function CultureResultItem({ item }: CultureResultItemProps) {
  const lines = parseCultureText(String(item.value));

  if (isCompactCultureResult(lines)) {
    return (
      <div className="flex min-w-0 items-baseline justify-between gap-2 border-b border-zinc-100 py-1 last:border-b-0">
        <span className="truncate text-zinc-600">{item.name}</span>
        <span className={item.hlFlag ? 'font-semibold text-red-600' : 'font-mono text-zinc-800'}>
          {item.value}
          {item.unit && <span className="ml-1 text-zinc-400">{item.unit}</span>}
          {item.hlFlag && <span className="ml-1 text-[10px]">{item.hlFlag}</span>}
        </span>
      </div>
    );
  }

  // 균이 동정된 결과는 길어서 옆에 붙이면 검사명이 잘린다 — 이름을 위에 두고 결과를 아래로 편다
  return (
    <div className="border-b border-zinc-100 py-1.5 last:border-b-0 sm:col-span-2">
      <div className="mb-1 font-medium text-zinc-700">{item.name}</div>
      <div className="max-w-md space-y-0.5 pl-2">{renderLines(lines)}</div>
    </div>
  );
}

function renderLines(lines: CultureLine[]) {
  return lines.map((line, index) => {
    const key = `${line.kind}-${index}`;
    if (line.kind === 'heading') {
      return (
        <div key={key} className={cn('text-zinc-800', index > 0 && 'pt-1')}>
          <span className="text-[11px] text-zinc-400">&lt;{line.label}&gt;</span>
          {line.text && <span className="ml-1.5 font-semibold italic">{line.text}</span>}
        </div>
      );
    }
    if (line.kind === 'susceptibility') {
      return (
        <div
          key={key}
          className="grid grid-cols-[minmax(0,1fr)_1.25rem_4.5rem] items-baseline gap-2"
        >
          <span className="truncate text-zinc-600" title={line.drug}>
            {line.drug}
          </span>
          <span className={cn('text-center', INTERPRETATION_CLASS[line.interpretation])}>
            {line.interpretation}
          </span>
          <span className="font-mono text-[11px] text-zinc-400">{line.mic && `(${line.mic})`}</span>
        </div>
      );
    }
    return (
      <div key={key} className="text-zinc-700">
        {line.text}
      </div>
    );
  });
}
