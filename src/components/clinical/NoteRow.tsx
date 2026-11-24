import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CopyTextButton } from './CopyTextButton';

interface NoteRowProps {
  prefix: string;
  content: string;
  tone?: 'default' | 'warning';
  action?: ReactNode;
}

/**
 * 메모 한 건 — 줄바꿈을 그대로 보여 주고, 드래그로 선택하거나 [복사]로 통째로 복사할 수 있다.
 * (일반 행은 한 줄로 잘려 SOAP 같은 긴 메모를 OCS에 옮길 수 없었다.)
 */
export function NoteRow({ prefix, content, tone = 'default', action }: NoteRowProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const text = content.replace(/\r\n?/g, '\n');

  return (
    <div className="grid w-full grid-cols-[38px_minmax(0,1fr)_auto] items-start gap-2 border-b border-zinc-100 px-2 py-1.5 text-[12px] sm:grid-cols-[44px_minmax(0,1fr)_auto]">
      <span className="pt-0.5 font-mono text-[10.5px] tabular-nums text-zinc-400">{prefix}</span>
      <div
        ref={textRef}
        className={cn(
          'min-w-0 cursor-text select-text whitespace-pre-wrap break-words leading-relaxed',
          tone === 'warning' ? 'text-amber-800' : 'text-zinc-900'
        )}
      >
        {text}
      </div>
      <span className="flex shrink-0 items-center gap-1">
        <CopyTextButton text={text} ariaLabel="메모 복사" selectOnFail={textRef} />
        {action}
      </span>
    </div>
  );
}
