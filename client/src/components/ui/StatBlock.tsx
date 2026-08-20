import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface StatBlockProps {
  label: string;
  value: ReactNode;
  size?: 'sm' | 'lg';
  accent?: boolean;
  className?: string;
}

export function StatBlock({ label, value, size = 'sm', accent = false, className }: StatBlockProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className={cnText(size, accent)}>{value}</span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
    </div>
  );
}

function cnText(size: 'sm' | 'lg', accent: boolean): string {
  const base = 'font-mono leading-none text-text';
  const sizing = size === 'lg' ? 'text-[44px]' : 'text-[28px]';
  return `${base} ${sizing} ${accent ? 'text-accent' : ''}`;
}

export function StatRow({ items }: { items: { label: string; value: ReactNode; accent?: boolean }[] }) {
  return (
    <div className="flex divide-x divide-border">
      {items.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col gap-1 px-4 first:pl-0">
          <span className={`font-mono text-[18px] leading-none ${item.accent ? 'text-accent' : 'text-text'}`}>
            {item.value}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  );
}