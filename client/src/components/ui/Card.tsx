import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-gradient-to-b from-surface to-panel p-4 sm:p-5',
        'transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-border-strong',
        className,
      )}
      {...rest}
    />
  );
}

export function Panel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-border bg-gradient-to-b from-surface to-panel', className)} {...rest} />;
}