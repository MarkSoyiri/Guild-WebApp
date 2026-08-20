import { cn } from '../../lib/cn';

interface TabsProps<T extends string> {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>) {
  return (
    <div role="tablist" className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1', className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors duration-150',
              active ? 'bg-elevated text-text' : 'text-muted hover:text-text',
            )}
          >
            {active ? <span className="absolute left-1/2 top-0 h-0.5 w-5 -translate-x-1/2 rounded-full bg-accent" aria-hidden /> : null}
            {tab.label}
            {tab.count !== undefined ? (
              <span className={cn('rounded px-1 font-mono text-[11px]', active ? 'bg-accent/15 text-accent' : 'bg-elevated text-muted')}>
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}