import { cn } from '../../lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-elevated', className)} aria-hidden />;
}

export function SkeletonRows({ rows = 5, height = 'h-[52px]' }: { rows?: number; height?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cn(height, 'w-full')} />
      ))}
    </div>
  );
}