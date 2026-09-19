import type React from 'react';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

export function Input({
  inputRef,
  value,
  type = 'text',
  placeholder,
  inputMode,
  disabled = false,
  min,
  max,
  onChange,
}: {
  inputRef?: React.Ref<HTMLInputElement>;
  value: string;
  type?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  disabled?: boolean;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      ref={inputRef}
      type={type}
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      disabled={disabled}
      min={min}
      max={max}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:bg-zinc-100 disabled:text-zinc-400"
    />
  );
}
