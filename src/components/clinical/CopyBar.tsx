import { Check, Copy } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface CopyBarProps {
  title: string;
  text: string;
  emptyText?: string;
}

export function CopyBar({ title, text, emptyText = '복사할 내용 없음' }: CopyBarProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const resetTimerRef = useRef<number | null>(null);
  const normalizedText = useMemo(() => text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'), [text]);
  const previewLines = useMemo(
    () => normalizedText.split('\n').map((line) => line.trim()).filter(Boolean),
    [normalizedText]
  );
  const preview = previewLines.slice(0, 3).join(' / ');
  const disabled = normalizedText.trim().length === 0;

  useEffect(() => {
    setCopied(false);
    setFailed(false);
  }, [text]);

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    []
  );

  const scheduleReset = (callback: () => void, delay: number) => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null;
      callback();
    }, delay);
  };

  const handleCopy = async () => {
    if (disabled) return;

    if (!navigator.clipboard) {
      setCopied(false);
      setFailed(true);
      scheduleReset(() => setFailed(false), 1800);
      return;
    }

    try {
      await navigator.clipboard.writeText(normalizedText);
      setCopied(true);
      setFailed(false);
      scheduleReset(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
      setFailed(true);
      scheduleReset(() => setFailed(false), 1800);
    }
  };

  return (
    <div className="flex flex-col gap-2 border border-zinc-200 bg-zinc-50 p-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-[12px] font-medium text-zinc-900">{title}</div>
          {previewLines.length > 0 && (
            <span className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
              {previewLines.length}
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate font-mono text-[10.5px] text-zinc-500">
          {preview || emptyText}
        </div>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {failed ? '실패' : copied ? '복사됨' : '복사'}
      </button>
    </div>
  );
}
