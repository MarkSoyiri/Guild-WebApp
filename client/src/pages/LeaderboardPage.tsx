import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { get } from '../lib/api';
import { LEADERBOARD_CATEGORIES, LEADERBOARD_LABELS, QUERY_KEYS, type LeaderboardCategory } from '../lib/constants';
import type { LeaderboardResponse } from '../lib/types';
import { formatCompact } from '../lib/format';
import { Avatar } from '../components/ui/Avatar';
import { RankBadge } from '../components/ui/Badges';
import { AsyncView, RowSkeleton } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { cn } from '../lib/cn';

type BoardRow = LeaderboardResponse['items'][number];

export function LeaderboardPage() {
  const [category, setCategory] = useState<LeaderboardCategory>('KILLS');
  const [seasonId, setSeasonId] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.leaderboard(category, seasonId),
    queryFn: () => {
      const params = new URLSearchParams({ category, limit: '100' });
      if (seasonId) params.set('seasonId', seasonId);
      return get<LeaderboardResponse>(`/leaderboards?${params.toString()}`);
    },
  });

  return (
    <>
      <PageHeader
        kicker={data?.season ? `Season ${data.season.number} · ${data.season.name}` : 'Season'}
        title="Leaderboard"
        description={
          data?.season
            ? `${data.season.remainingDays ?? '—'} days left in the season — every drop counts`
            : 'Guild rankings'
        }
      />

      <div className="mb-5 overflow-x-auto">
        <Tabs<LeaderboardCategory>
          value={category}
          onChange={(value) => {
            setCategory(value);
            setSeasonId(undefined);
          }}
          tabs={LEADERBOARD_CATEGORIES.map((c) => ({ value: c, label: LEADERBOARD_LABELS[c] }))}
        />
      </div>

      <AsyncView isLoading={isLoading} isError={isError} error={error} onRetry={refetch} skeleton={<RowSkeleton rows={10} />}>
        {data ? (
          data.items.length === 0 ? (
            <p className="py-10 text-center font-mono text-[13px] text-muted">No intel on this category yet.</p>
          ) : (
            <div className="flex flex-col">
              <Podium rows={data.items} category={category} />
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="flex flex-col divide-y divide-border">
                  {data.items.slice(3).map((row, index) => (
                    <LeaderboardRowItem key={row.userId} rank={index + 4} row={row} category={category} />
                  ))}
                </div>
              </div>
            </div>
          )
        ) : null}
      </AsyncView>
    </>
  );
}

function Podium({ rows, category }: { rows: BoardRow[]; category: LeaderboardCategory }) {
  const reducedMotion = useReducedMotion();
  const ordered = [rows[1], rows[0], rows[2]].filter(Boolean) as BoardRow[];
  const displayRank = [2, 1, 3];
  const styles = {
    1: { pedestal: 'border-accent/40 bg-accent/10 text-accent', height: 'h-28 sm:h-32' },
    2: { pedestal: 'border-rank-silver/40 bg-rank-silver/10 text-rank-silver', height: 'h-20 sm:h-24' },
    3: { pedestal: 'border-rank-bronze/40 bg-rank-bronze/10 text-rank-bronze', height: 'h-16 sm:h-20' },
  };
  return (
    <div className="mb-6 grid grid-cols-3 items-end gap-2 sm:gap-4">
      {ordered.map((row, index) => {
        const rank = displayRank[index];
        const style = styles[rank as 1 | 2 | 3];
        return (
          <motion.div
            key={row.userId}
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: index * 0.08 }}
            className="flex flex-col items-center gap-2"
          >
            <Link to={`/app/players/${row.userId}`} className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <Avatar src={row.avatarUrl} name={row.displayName} size={rank === 1 ? 64 : 52} />
                {rank === 1 ? (
                  <Crown size={16} className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-warning" aria-hidden />
                ) : null}
              </div>
              <p className="max-w-[104px] truncate text-center text-[13px] font-bold text-text">{row.displayName}</p>
              <p className="font-mono text-[13px] text-text">{formatValue(row, category)}</p>
            </Link>
            <div className={cn('clip-pedestal flex w-full items-start justify-center border border-b-0 pt-1.5', style.pedestal, style.height)}>
              <span className="font-mono text-[14px] font-bold">{rank}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function LeaderboardRowItem({ rank, row, category }: { rank: number; row: BoardRow; category: LeaderboardCategory }) {
  return (
    <Link
      to={`/app/players/${row.userId}`}
      className="flex min-h-[56px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-elevated sm:px-5"
    >
      <span className={cn('w-7 shrink-0 text-center font-mono text-[15px]', rank <= 3 ? 'font-bold text-accent' : 'text-muted')}>
        #{rank}
      </span>
      <Avatar src={row.avatarUrl} name={row.displayName} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-text">{row.displayName}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <RankBadge rank={row.rank} />
          <span className="hidden text-[11px] uppercase tracking-wide text-muted sm:inline">{row.playerRole}</span>
        </div>
      </div>
      <div className="hidden shrink-0 text-right md:block">
        <p className="font-mono text-[13px] text-muted">{formatCompact(row.guildXp)}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted">Guild XP</p>
      </div>
      <div className="w-20 shrink-0 text-right">
        <p className={cn('font-mono text-[17px]', rank === 1 ? 'font-bold text-accent' : 'text-text')}>{formatValue(row, category)}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted">{LEADERBOARD_LABELS[category]}</p>
      </div>
    </Link>
  );
}

function formatValue(row: BoardRow, category: LeaderboardCategory): string {
  if (category === 'KD') return Number(row.value).toFixed(2);
  return formatCompact(Number(row.value));
}