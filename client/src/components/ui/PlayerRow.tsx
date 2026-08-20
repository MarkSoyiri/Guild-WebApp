import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { Avatar } from './Avatar';
import { RoleBadge } from './Badges';
import { formatDecimal } from '../../lib/format';
import { Skeleton, SkeletonRows } from './Skeleton';
import { EmptyState } from './EmptyState';
import { ErrorPanel } from './ErrorPanel';

interface AsyncViewProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isEmpty?: boolean;
  empty?: ReactNode;
  skeleton?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}

export function AsyncView({ isLoading, isError, error, isEmpty, empty, skeleton, onRetry, children }: AsyncViewProps) {
  if (isLoading) return <>{skeleton ?? <SkeletonRows rows={6} />}</>;
  if (isError) return <ErrorPanel message={errorMessage(error)} onRetry={onRetry} />;
  if (isEmpty) return <>{empty ?? <EmptyState title="Nothing here yet" description="Check back later." />}</>;
  return <>{children}</>;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong while loading this.';
}

export function RowSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </div>
  );
}

interface PlayerRowProps {
  name: string;
  avatarUrl: string | null;
  meta?: string;
  rank?: string;
  playerRole?: string;
  right?: ReactNode;
  online?: boolean;
  to?: string;
  position?: number;
}

export function PlayerRow({ name, avatarUrl, meta, rank, playerRole, right, online, to, position }: PlayerRowProps) {
  const navigate = useNavigate();
  const clickable = Boolean(to);
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => navigate(to!) : undefined}
      onKeyDown={clickable ? (event) => event.key === 'Enter' && navigate(to!) : undefined}
      className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left"
    >
      {position !== undefined ? (
        <span className={`w-6 shrink-0 text-center font-mono text-[15px] ${position <= 3 ? 'font-bold text-accent' : 'text-muted'}`}>
          #{position}
        </span>
      ) : null}
      <Avatar src={avatarUrl} name={name} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-text">
          {name}
          {online !== undefined ? <span className="ml-2 inline-flex items-center gap-1.5 text-[11px] text-muted"><span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-success' : 'bg-faint'}`} />{online ? 'Online' : 'Offline'}</span> : null}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-muted">
          {meta}
          {rank ? <RankTier rank={rank} /> : null}
          {playerRole ? <RoleBadge role={playerRole} /> : null}
        </p>
      </div>
      <div className="shrink-0 text-right">{right}</div>
    </div>
  );
}

function RankTier({ rank }: { rank: string }) {
  return (
    <span className="inline-flex items-center rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
      {rank}
    </span>
  );
}

export function StatValue({ value, accent = false }: { value: ReactNode; accent?: boolean }) {
  return <span className={`font-mono text-[15px] ${accent ? 'font-bold text-accent' : 'text-text'}`}>{value}</span>;
}

export { formatDecimal };