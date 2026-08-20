import { cn } from '../../lib/cn';
import { relativeTime } from '../../lib/format';

interface SyncChipProps {
  provider: string | null;
  lastSyncAt: string | null;
  className?: string;
}

export function SyncChip({ provider, lastSyncAt, className }: SyncChipProps) {
  const live = provider === 'external';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide',
        live ? 'border-success/40 bg-success/10 text-success' : 'border-warning/40 bg-warning/10 text-warning',
        className,
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current" aria-hidden />
      {live ? 'Live data' : 'Demo data'} · last synced {relativeTime(lastSyncAt)}
    </span>
  );
}