import { cn } from '../../lib/cn';
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, type EventType } from '../../lib/constants';

const EVENT_STATUS_STYLES: Record<string, { label: string; className: string; live?: boolean }> = {
  ONGOING: { label: 'Live now', className: 'border-success/40 bg-success/10 text-success', live: true },
  SCHEDULED: { label: 'Scheduled', className: 'border-warning/40 bg-warning/10 text-warning' },
  COMPLETED: { label: 'Completed', className: 'border-border bg-elevated text-muted' },
  CANCELLED: { label: 'Cancelled', className: 'border-danger/40 bg-danger/10 text-danger' },
};

const FALLBACK_STATUS = { label: '', className: 'border-border bg-elevated text-muted' };

export function EventStatusBadge({ status, className }: { status: string; className?: string }) {
  const style = EVENT_STATUS_STYLES[status] ?? { ...FALLBACK_STATUS, label: EVENT_STATUS_LABELS[status] ?? status };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]',
        style.className,
        className,
      )}
    >
      {style.live ? (
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      ) : (
        <span className="h-1.5 w-1.5 rotate-45 bg-current" aria-hidden />
      )}
      {style.label}
    </span>
  );
}

const EVENT_TYPE_STYLES: Record<string, string> = {
  CUSTOM_ROOM: 'border-electric/30 bg-electric/10 text-electric',
  TOURNAMENT: 'border-warning/30 bg-warning/10 text-warning',
  PRACTICE: 'border-secondary/30 bg-secondary/10 text-secondary',
  MEETING: 'border-accent/30 bg-accent/10 text-accent',
  COMMUNITY: 'border-success/30 bg-success/10 text-success',
};

export function EventTypeChip({ type, className }: { type: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]',
        EVENT_TYPE_STYLES[type] ?? 'border-border bg-elevated text-muted',
        className,
      )}
    >
      {EVENT_TYPE_LABELS[type as EventType] ?? type}
    </span>
  );
}