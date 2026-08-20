import type { ReactNode } from 'react';

interface PageHeaderProps {
  kicker?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ kicker, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        {kicker ? (
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
            <span className="h-1.5 w-1.5 rotate-45 bg-accent" aria-hidden />
            {kicker}
          </p>
        ) : null}
        <h1 className="font-display text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-text sm:text-[34px]">
          {title}
        </h1>
        {description ? <p className="max-w-[560px] text-[13px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}