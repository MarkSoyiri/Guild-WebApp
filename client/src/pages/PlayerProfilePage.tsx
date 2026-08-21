import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Crosshair, Gamepad2, Radio, RefreshCw, Swords, Trophy } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { get, post } from '../lib/api';
import { QUERY_KEYS } from '../lib/constants';
import type { FreeFireMatch, FreeFireStats, Paginated, PlayerDetail } from '../lib/types';
import { formatCompact, formatDate, relativeTime } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from '../components/ui/Avatar';
import { GuildRoleBadge, RankBadge, RarityBadge, RoleBadge, StatusDot } from '../components/ui/Badges';
import { Card } from '../components/ui/Card';
import { SyncChip } from '../components/ui/SyncChip';
import { AsyncView, RowSkeleton } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { StatBlock, StatRow } from '../components/ui/StatBlock';
import { Button } from '../components/ui/Button';
import { CountUp } from '../components/ui/CountUp';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { JoinGuildCta } from './AuthPage';

export function PlayerProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const viewerId = me?.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.player(userId ?? ''),
    queryFn: () => get<PlayerDetail>(`/players/${userId}`),
    enabled: Boolean(userId),
  });

  const syncMutation = useMutation({
    mutationFn: () => post<{ status: string }>('/freefire/sync/me'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.player(userId ?? '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myMatches(1) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaderboards });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playerLists });
    },
  });

  const { data: matches, isLoading: matchesLoading, isError: matchesError, refetch: refetchMatches } = useQuery({
    queryKey: QUERY_KEYS.myMatches(1),
    queryFn: () => get<Paginated<FreeFireMatch>>('/players/me/matches?page=1&pageSize=10'),
    enabled: Boolean(userId) && userId === viewerId,
  });

  return (
    <>
      <PageHeader
        kicker="Player loadout"
        title={data?.displayName ?? 'Player'}
        actions={
          <Link to="/app/players">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />}>
              Back to roster
            </Button>
          </Link>
        }
      />

      <AsyncView isLoading={isLoading} isError={isError} error={error} onRetry={refetch} skeleton={<ProfileSkeleton />}>
        {data ? (
          <div className="flex flex-col gap-6">
            <HeroCard data={data} syncPending={syncMutation.isPending} onSync={() => syncMutation.mutate()} />

            {data.isViewer && !me?.membership ? (
              <Card className="relative overflow-hidden hover:border-border">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-accent/10 to-transparent" aria-hidden />
                <div className="relative">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    <span className="h-1 w-1 rotate-45 bg-accent" aria-hidden /> Mission
                  </p>
                  <div className="mt-3">
                    <JoinGuildCta />
                  </div>
                </div>
              </Card>
            ) : null}

            {data.profile ? <LinkedAccount profile={data.profile} /> : null}

            {data.profile?.stats ? <CombatRecord stats={data.profile.stats} /> : null}

            {data.achievements.length > 0 ? <MedalCase data={data} /> : null}

            {data.isViewer ? <MatchLog matches={matches} isLoading={matchesLoading} isError={matchesError} onRetry={refetchMatches} /> : null}

            {data.recentActivity.length > 0 ? <SignalLog data={data} /> : null}
          </div>
        ) : null}
      </AsyncView>
    </>
  );
}

function HeroCard({ data, syncPending, onSync }: { data: PlayerDetail; syncPending: boolean; onSync: () => void }) {
  const reducedMotion = useReducedMotion();
  const stats = data.profile?.stats ?? null;
  const online = isOnline(data.lastSeenAt);

  return (
    <Card className="relative overflow-hidden hover:border-border">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(480px_220px_at_20%_0%,black,transparent)]" aria-hidden />
      <div className="corner-brackets pointer-events-none absolute inset-0 rounded-xl" aria-hidden />
      <div className="relative">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Avatar src={data.avatarUrl} name={data.displayName} size={80} className="ring-2 ring-accent/30" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-[26px] font-bold leading-none tracking-[-0.02em] text-text sm:text-[30px]">
                {data.displayName}
              </h2>
              {data.guildRole ? <GuildRoleBadge role={data.guildRole} /> : null}
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <StatusDot online={online} />
                {online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[13px] text-muted">@{data.username}</span>
              {data.profile ? <RankBadge rank={data.profile.rank} /> : null}
              {data.profile ? <RoleBadge role={data.profile.playerRole} /> : null}
              {data.team ? (
                <Link to={`/app/teams/${data.team.id}`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:text-accent-2">
                  <Swords size={12} /> {data.team.name}
                </Link>
              ) : null}
            </div>
            <p className="mt-2 font-mono text-[12px] text-muted">
              {data.joinedAt ? `Deployed ${formatDate(data.joinedAt)}` : 'Awaiting roster approval'} · {data.profile?.region ?? 'MENA'} region
              {data.profile ? <> · UID {data.profile.ffUid ?? 'not linked'}</> : null}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {data.isViewer ? (
              <Button size="sm" loading={syncPending} onClick={onSync} icon={<RefreshCw size={14} />}>
                Sync stats
              </Button>
            ) : null}
            {data.profile ? <SyncChip provider={data.profile.lastSyncProvider} lastSyncAt={data.profile.lastSyncAt} /> : null}
          </div>
        </div>

        {stats ? (
          <>
            <div className="hud-divider my-5" aria-hidden />
            <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
              <StatBlock label="K/D" accent value={<CountUp value={stats.kdRatio} format={(value) => value.toFixed(2)} />} />
              <StatBlock label="Wins" value={<CountUp value={stats.wins} format={formatCompact} />} />
              <StatBlock label="Kills" value={<CountUp value={stats.kills} format={formatCompact} />} />
              <StatBlock label="Headshots" value={<CountUp value={stats.headshots} format={formatCompact} />} />
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}

function LinkedAccount({ profile }: { profile: NonNullable<PlayerDetail['profile']> }) {
  return (
    <Card className="hover:border-border">
      <SectionHeader icon={<Gamepad2 size={16} className="text-accent" aria-hidden />} kicker="Free Fire" title="Linked account" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[13px]">
          <p className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">UID</span>
            <span className="text-text">{profile.ffUid ?? 'Not linked'}</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Region</span>
            <span className="text-text">{profile.region}</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Level</span>
            <span className="text-text">{profile.level}</span>
          </p>
        </div>
        <SyncChip provider={profile.lastSyncProvider} lastSyncAt={profile.lastSyncAt} className="self-start sm:self-auto" />
      </div>
    </Card>
  );
}

function CombatRecord({ stats }: { stats: FreeFireStats }) {
  return (
    <Card className="hover:border-border">
      <SectionHeader icon={<Crosshair size={16} className="text-accent" aria-hidden />} kicker="Combat record" title="Statistics" />
      <div className="mt-4">
        <StatRow
          items={[
            { label: 'K/D', value: <CountUp value={stats.kdRatio} format={(value) => value.toFixed(2)} />, accent: true },
            { label: 'Kills', value: <CountUp value={stats.kills} format={formatCompact} /> },
            { label: 'Wins', value: <CountUp value={stats.wins} format={formatCompact} /> },
            { label: 'Win rate', value: <CountUp value={stats.winRate} format={(value) => `${Math.round(value)}%`} /> },
          ]}
        />
        <div className="mt-5 grid grid-cols-3 gap-y-5 border-t border-border pt-4 sm:grid-cols-6">
          <StatBlock label="Matches" value={<CountUp value={stats.matches} format={formatCompact} />} />
          <StatBlock label="Headshots" value={<CountUp value={stats.headshots} format={formatCompact} />} />
          <StatBlock label="MVPs" value={<CountUp value={stats.mvps} format={formatCompact} />} />
          <StatBlock label="Week kills" value={<CountUp value={stats.weeklyKills} format={formatCompact} />} />
          <StatBlock label="Week wins" value={<CountUp value={stats.weeklyWins} />} />
          <StatBlock label="Month kills" value={<CountUp value={stats.monthlyKills} format={formatCompact} />} />
        </div>
      </div>
    </Card>
  );
}

function MedalCase({ data }: { data: PlayerDetail }) {
  return (
    <Card className="hover:border-border">
      <SectionHeader icon={<Trophy size={16} className="text-accent" aria-hidden />} kicker="Medal case" title="Achievements" />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {data.achievements.map((achievement) => (
          <div key={achievement.id} className="corner-brackets rounded-lg border border-border bg-elevated p-3">
            <Trophy size={15} className="mb-1.5 text-accent" aria-hidden />
            <p className="truncate text-[12px] font-semibold text-text">{achievement.name}</p>
            <RarityBadge rarity={achievement.rarity} className="mt-1.5" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function MatchLog({
  matches,
  isLoading,
  isError,
  onRetry,
}: {
  matches: Paginated<FreeFireMatch> | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  return (
    <Card className="hover:border-border">
      <SectionHeader icon={<Swords size={16} className="text-accent" aria-hidden />} kicker="Recent drops" title="Match log" />
      <div className="mt-3">
        <AsyncView
          isLoading={isLoading}
          isError={isError}
          error={isError}
          onRetry={onRetry}
          skeleton={<RowSkeleton rows={5} />}
          isEmpty={matches ? matches.items.length === 0 : false}
          empty={
            <EmptyState
              icon={<Swords size={20} />}
              title="No drops logged"
              description="Your recent matches will show up here after you sync your Free Fire stats."
            />
          }
        >
          {matches ? <MatchTable matches={matches.items} /> : null}
        </AsyncView>
      </div>
    </Card>
  );
}

function MatchTable({ matches }: { matches: FreeFireMatch[] }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {matches.map((match) => (
        <div key={match.id} className="flex items-center gap-3 py-3">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${match.isWin ? 'bg-success' : match.mvp ? 'bg-accent' : 'bg-border-strong'}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-text">{match.map || match.mode}</p>
            <p className="font-mono text-[11px] text-muted">{match.mode} · {relativeTime(match.playedAt)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 font-mono text-[13px]">
            <span className="text-text">{match.kills}</span>
            <span className="text-muted">{match.deaths}</span>
            <span className="text-faint">{match.headshots} HS</span>
            <span className={`w-10 text-right ${match.isWin ? 'font-bold text-success' : 'text-muted'}`}>{match.isWin ? 'WIN' : `#${match.rank}`}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalLog({ data }: { data: PlayerDetail }) {
  return (
    <Card className="hover:border-border">
      <SectionHeader icon={<Radio size={16} className="text-accent" aria-hidden />} kicker="Signal log" title="Recent activity" />
      <div className="mt-2 flex flex-col divide-y divide-border">
        {data.recentActivity.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
            <p className="min-w-0 flex-1 truncate text-[13px] text-text">{entry.message}</p>
            <span className="shrink-0 font-mono text-[11px] text-muted">{relativeTime(entry.createdAt)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SectionHeader({ icon, kicker, title }: { icon: ReactNode; kicker: string; title: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        <span className="h-1 w-1 rotate-45 bg-accent" aria-hidden /> {kicker}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-[17px] font-bold text-text">
          {icon} {title}
        </h2>
      </div>
      <div className="hud-divider mt-3" aria-hidden />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="hover:border-border">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="hidden sm:block">
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-5 border-t border-border pt-5 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="hover:border-border">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 15 * 60 * 1000;
}