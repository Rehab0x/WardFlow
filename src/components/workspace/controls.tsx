import { useState, type ReactNode } from 'react';

export function Input({
  value,
  type = 'text',
  placeholder,
  min,
  max,
  invalid = false,
  className = '',
  onChange,
}: {
  value: string;
  type?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  invalid?: boolean;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      min={min}
      max={max}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
      className={`h-8 min-w-0 rounded-md border bg-white px-2 text-[12px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 ${
        invalid ? 'border-red-300 focus:ring-red-300' : 'border-zinc-200 focus:ring-zinc-400'
      } ${className}`}
    />
  );
}

export function SaveButton({
  disabled,
  pending = false,
  children,
  onClick,
}: {
  disabled?: boolean;
  pending?: boolean;
  children: ReactNode;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={onClick}
      className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3 text-[12px] font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
    >
      {pending ? '저장 중' : children}
    </button>
  );
}

export function RemoveButton({ onClick }: { onClick: () => void | Promise<void> }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => {
        event.stopPropagation();
        if (pending) return;
        setPending(true);
        Promise.resolve(onClick())
          .catch(() => undefined)
          .finally(() => setPending(false));
      }}
      className="rounded-md border border-zinc-200 px-1.5 py-0.5 text-[10.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-300"
    >
      {pending ? '삭제 중' : '삭제'}
    </button>
  );
}

export function CategoryToggle({
  value,
  onChange,
}: {
  value: 'hospital' | 'personal';
  onChange: (value: 'hospital' | 'personal') => void;
}) {
  return (
    <div className="grid h-8 grid-cols-2 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-[11px]">
      {[['hospital', '본원'] as const, ['personal', '지참'] as const].map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded px-1 font-medium ${
            value === key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function CollapsiblePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="rounded-md border border-zinc-200 bg-white">
      <summary className="cursor-pointer select-none px-3 py-2 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50">
        {title}
      </summary>
      <div className="border-t border-zinc-100 p-2">{children}</div>
    </details>
  );
}

export function ChartField({
  label,
  value,
  rows,
  placeholder,
  onChange,
  onTemplate,
}: {
  label: string;
  value: string;
  rows: number;
  placeholder?: string;
  onChange: (value: string) => void;
  onTemplate?: () => void;
}) {
  return (
    <div className="grid gap-1">
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] text-zinc-400">{label}</span>
        {onTemplate && (
          <button
            type="button"
            className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10.5px] text-zinc-500 hover:bg-zinc-50"
            onClick={(event) => {
              event.preventDefault();
              onTemplate();
            }}
          >
            템플릿
          </button>
        )}
      </span>
      <textarea
        aria-label={label}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-8 resize-y rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[12px] leading-5 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      />
    </div>
  );
}
