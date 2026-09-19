import type { TaskFilter, TaskFilterOption, TaskSort } from './todayTasks';

export function TaskFilterControl({
  value,
  options,
  onChange,
}: {
  value: TaskFilter;
  options: TaskFilterOption[];
  onChange: (value: TaskFilter) => void;
}) {
  return (
    <div className="flex max-w-full overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`inline-flex h-6 shrink-0 items-center gap-1 rounded px-2 text-[11px] font-medium ${
            value === option.value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
          }`}
        >
          <span>{option.label}</span>
          <span className="font-mono text-[10px] tabular-nums">{option.count}</span>
        </button>
      ))}
    </div>
  );
}

export function TaskSortControl({
  value,
  onChange,
}: {
  value: TaskSort;
  onChange: (value: TaskSort) => void;
}) {
  return (
    <div className="grid shrink-0 grid-cols-2 rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
      {[
        ['priority', '우선'],
        ['room', '병실'],
      ].map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          aria-pressed={value === optionValue}
          onClick={() => onChange(optionValue as TaskSort)}
          className={`h-6 rounded px-2 text-[11px] font-medium ${
            value === optionValue ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
