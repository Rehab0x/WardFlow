import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';

interface CopyTextButtonProps {
  text: string;
  label?: string;
  ariaLabel?: string;
  /** 클립보드를 쓸 수 없을 때 이 요소의 내용을 선택해 Ctrl+C로 복사하게 한다 */
  selectOnFail?: RefObject<HTMLElement | null>;
}

/** 텍스트를 줄바꿈 그대로 클립보드에 복사하는 작은 버튼. */
export function CopyTextButton({ text, label = '복사', ariaLabel, selectOnFail }: CopyTextButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timerRef = useRef<number | null>(null);

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

  const copy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      flash('copied');
    } catch {
      const node = selectOnFail?.current;
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
    <button
      type="button"
      onClick={copy}
      aria-label={ariaLabel ?? label}
      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-1.5 py-0.5 text-[10.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
    >
      {state === 'copied' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {state === 'copied' ? '복사됨' : state === 'failed' ? (selectOnFail ? '선택됨 · Ctrl+C' : '실패') : label}
    </button>
  );
}
