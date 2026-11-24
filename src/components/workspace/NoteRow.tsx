import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timerRef = useRef<number | null>(null);
  const text = content.replace(/\r\n?/g, '\n');

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  const flash = (next: 'copied' | 'failed') => {
    setState(next);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState('idle'), 1600);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      flash('copied');
    } catch {
      // 클립보드를 쓸 수 없으면 내용을 선택해 두어 Ctrl+C로 바로 복사할 수 있게 한다.
      const node = textRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      flash('failed');
    }
  };

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
        <button
          type="button"
          onClick={copy}
          aria-label="메모 복사"
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-1.5 py-0.5 text-[10.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        >
          {state === 'copied' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {state === 'copied' ? '복사됨' : state === 'failed' ? '선택됨 · Ctrl+C' : '복사'}
        </button>
        {action}
      </span>
    </div>
  );
}
