import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, SearchX } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { get } from '../lib/api';
import { QUERY_KEYS, PLAYER_ROLES, RANKS, RANK_LABELS, PLAYER_ROLE_LABELS } from '../lib/constants';
import type { Paginated, PlayerSummary } from '../lib/types';
import { formatCompact } from '../lib/format';
import { Avatar } from '../components/ui/Avatar';
import { GuildRoleBadge, RankBadge, RoleBadge, StatusDot } from '../components/ui/Badges';
import { AsyncView } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { CountUp } from '../components/ui/CountUp';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRows } from '../components/ui/Skeleton';

type RoleFilter = 'ALL' | (typeof PLAYER_ROLES)[number];

export function PlayersPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [rank, setRank] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (debounced) params.set('search', debounced);
  if (role !== 'ALL') params.set('role', role);
  if (rank !== 'ALL') params.set('rank', rank);
  params.set('page', String(page));

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.players(params.toString()),
    queryFn: () => get<Paginated<PlayerSummary>>(`/players?${params.toString()}`),
    placeholderData: (previous) => previous,
  });

  const applySearch = (value: string) => {
    setSearch(value);
    setPage(1);
    window.setTimeout(() => setDebounced(value), 300);
  };

  return (
    <>
      <PageHeader
        kicker={`ROSTER · ${data?.total ?? '…'} MEMBERS`}
        title="Who's running the lobby?"
        description="The full KINGS ONLY roster — scout roles, ranks, and the ladder before your next drop."
        actions={
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
            <Input
              value={search}
              onChange={(event) => applySearch(event.target.value)}
              placeholder="Search the roster…"
              className="pl-9"
            />
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs<RoleFilter>
          value={role}
          onChange={(value) => { setRole(value); setPage(1); }}
          tabs={[{ value: 'ALL', label: 'All' }, ...PLAYER_ROLES.map((r) => ({ value: r, label: PLAYER_ROLE_LABELS[r] ?? r }))]}
        />
        <div className="ml-auto flex items-center gap-2">
          <Select value={rank} onChange={(e) => { setRank(e.target.value); setPage(1); }} aria-label="Filter by rank" className="h-9 w-auto text-[13px]">
            <option value="ALL">All ranks</option>
            {RANKS.map((r) => (
              <option key={r} value={r}>{RANK_LABELS[r]}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <AsyncView
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          skeleton={<div className="p-4 sm:p-5"><SkeletonRows rows={6} /></div>}
        >
          {data ? (
            data.items.length === 0 ? (
              <EmptyState
                icon={<SearchX size={22} />}
                title="No intel on those filters"
                description="No soldiers match that search or filter combo. Widen the net and try again."
              />
            ) : (
              <div key={page} className="flex flex-col divide-y divide-border">
                {data.items.map((player, index) => (
                  <RosterRow key={player.id} player={player} index={index} />
                ))}
              </div>
            )
          ) : null}
        </AsyncView>
      </div>

      {data && data.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="font-mono text-[13px] text-muted">
            {page} / {data.totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      ) : null}
    </>
  );
}

function RosterRow({ player, index }: { player: PlayerSummary; index: number }) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const kd = player.stats?.kdRatio ?? null;
  const go = () => navigate(`/app/players/${player.id}`);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(event) => event.key === 'Enter' && go()}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: reducedMotion ? 0 : Math.min(index * 0.03, 0.3) }}
      className="group flex min-h-[60px] w-full cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated/50 sm:px-5"
    >
      <Avatar
        src={player.avatarUrl}
        name={player.displayName}
        size={44}
        className="transition-transform duration-150 group-hover:scale-105"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-text">
          <span className="truncate">{player.displayName}</span>
          <StatusDot online={isOnline(player.lastSeenAt)} className="shrink-0" />
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <RankBadge rank={player.rank} />
          <RoleBadge role={player.playerRole} />
          <GuildRoleBadge role={player.guildRole} className="hidden sm:inline-flex" />
          <span className="hidden font-mono text-[11px] text-muted md:inline">@{player.username}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        {kd !== null ? (
          <>
            <CountUp value={kd} format={(value) => value.toFixed(2)} className="block font-mono text-[16px] font-bold text-text" />
            <span className="text-[10px] uppercase tracking-wide text-muted">K/D</span>
          </>
        ) : (
          <>
            <CountUp value={player.guildXp} format={formatCompact} className="block font-mono text-[16px] font-bold text-text" />
            <span className="text-[10px] uppercase tracking-wide text-muted">Guild XP</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 15 * 60 * 1000;
}