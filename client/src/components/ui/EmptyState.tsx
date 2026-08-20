import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="corner-brackets flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface text-muted" aria-hidden>
        {icon ?? <Inbox size={22} strokeWidth={1.75} />}
      </div>
      <h3 className="font-display text-[16px] font-bold text-text">{title}</h3>
      <p className="max-w-[280px] text-[13px] leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}