import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, CalendarClock, Crown, Radio, Swords, Trophy } from 'lucide-react';
import { get, ApiError } from '../lib/api';
import { QUERY_KEYS, EVENT_TYPE_LABELS } from '../lib/constants';
import type { Dashboard } from '../lib/types';
import { formatCompact, formatDateTime, relativeTime } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { RankBadge } from '../components/ui/Badges';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AsyncView, RowSkeleton } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { StatBlock } from '../components/ui/StatBlock';
import { Button } from '../components/ui/Button';
import { CountUp } from '../components/ui/CountUp';
import { JoinGuildCta } from './AuthPage';

export function DashboardPage() {
  const { me } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: () => get<Dashboard>('/guild/dashboard'),
  });

  const notMember = error instanceof ApiError && error.code === 'NOT_A_MEMBER';

  return (
    <>
      <PageHeader
        kicker={`${me?.membership?.guildTag ?? 'KO'} · level ${data?.overview.level ?? '—'}`}
        title={data ? `Good to see you, ${data.me.displayName.split(' ')[0]}` : 'Command center'}
        description="Mission status, top ladder, and the latest intel on the guild."
        actions={
          <Link to="/app/notifications">
            <Button variant="secondary" icon={<Bell size={17} />} className="relative">
              {data && data.me.unreadCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-on-accent">
                  {data.me.unreadCount}
                </span>
              ) : null}
              <span className="hidden sm:inline">Intel</span>
            </Button>
          </Link>
        }
      />

      {notMember ? (
        <Card className="relative overflow-hidden">
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
      ) : (
        <AsyncView isLoading={isLoading} isError={isError} error={error} onRetry={refetch} skeleton={<DashboardSkeleton />}>
          {data ? (
            <div className="flex flex-col gap-6">
              <HeroStats data={data} />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="flex flex-col gap-6 lg:col-span-2">
                  <LeaderboardPreview data={data} />
                  <ActivityFeed data={data} />
                </div>
                <div className="flex flex-col gap-6">
                  {data.nextEvent ? <NextEvent data={data} /> : null}
                  {data.activeChallenge ? <ChallengeCard data={data} /> : null}
                  {data.announcements.length > 0 ? <Announcements data={data} /> : null}
                  {data.myAchievements.length > 0 ? <MyAchievements data={data} /> : null}
                </div>
              </div>
            </div>
          ) : null}
        </AsyncView>
      )}
    </>
  );
}

function HeroStats({ data }: { data: Dashboard }) {
  const overview = data.overview;
  return (
    <section className="relative overflow-hidden rounded-xl border border-border">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(560px_240px_at_20%_0%,black,transparent)]" aria-hidden />
      <div className="corner-brackets pointer-events-none absolute inset-0 rounded-xl" aria-hidden />
      <div className="relative flex flex-col gap-5 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              Guild level
            </p>
            <p className="mt-1 font-mono text-[44px] font-bold leading-none text-text">
              <CountUp value={overview.level} />
              <span className="ml-2 font-mono text-[15px] font-medium text-muted">
                <CountUp value={overview.xp} format={formatCompact} /> / {formatCompact(overview.nextLevelXp)} XP
              </span>
            </p>
          </div>
          <Link to="/app/leaderboard">
            <Button variant="secondary" size="sm">
              Leaderboard <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
        <ProgressBar percent={overview.progressPercent} />
        <div className="grid grid-cols-2 gap-y-5 border-t border-border pt-4 sm:grid-cols-4">
          <StatBlock label="Members" value={<CountUp value={overview.memberCount} />} />
          <StatBlock label="Online now" value={<CountUp value={overview.onlineCount} />} accent />
          <StatBlock label="Weekly XP" value={<CountUp value={overview.weeklyXp} format={formatCompact} />} />
          <StatBlock
            label="Season"
            value={overview.season ? `${overview.season.remainingDays}d` : '—'}
          />
        </div>
      </div>
    </section>
  );
}

function LeaderboardPreview({ data }: { data: Dashboard }) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-[17px] font-bold text-text">Top this week</h2>
        <Link to="/app/leaderboard" className="inline-flex items-center gap-1 text-[13px] font-bold text-accent hover:text-accent-2">
          Full table <ArrowRight size={14} />
        </Link>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {data.leaderboardPreview.map((row) => (
          <Link key={row.id} to={`/app/players/${row.id}`} className="flex items-center gap-3 py-3 transition-colors hover:bg-elevated/40">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center font-mono text-[13px] ${row.rank <= 3 ? 'bg-accent/10 font-bold text-accent' : 'text-muted'}`}>
              {row.rank}
            </span>
            <Avatar src={row.avatarUrl} name={row.displayName} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-text">{row.displayName}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <RankBadge rank={row.rankTier} />
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[15px] text-text">{row.kd.toFixed(2)}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">K/D</p>
            </div>
            <div className="w-14 text-right">
              <p className="font-mono text-[13px] text-muted">{formatCompact(row.guildXp)}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">XP</p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function ActivityFeed({ data }: { data: Dashboard }) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-[17px] font-bold text-text">
          <Radio size={16} className="text-accent" aria-hidden /> Live feed
        </h2>
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-success">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          Live
        </span>
      </div>
      {data.activity.length === 0 ? (
        <p className="py-4 text-[13px] text-muted">Radio silence. Go make some noise.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {data.activity.slice(0, 12).map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 py-2.5">
              <Avatar src={entry.actor?.avatarUrl} name={entry.actor?.displayName ?? 'System'} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] leading-relaxed text-text">{entry.message}</p>
                <p className="font-mono text-[11px] text-muted">{relativeTime(entry.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NextEvent({ data }: { data: Dashboard }) {
  const event = data.nextEvent!;
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-accent/10 to-transparent" aria-hidden />
      <div className="relative mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-[17px] font-bold text-text">
          <CalendarClock size={16} className="text-accent" aria-hidden /> Next event
        </h2>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-accent">Squad up</span>
      </div>
      <p className="text-[15px] font-semibold text-text">{event.title}</p>
      <p className="mt-0.5 text-[12px] uppercase tracking-wide text-muted">{EVENT_TYPE_LABELS[event.type as keyof typeof EVENT_TYPE_LABELS] ?? event.type}</p>
      <p className="mt-2 font-mono text-[13px] text-muted">{formatDateTime(event.startsAt)}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-[12px] text-muted">
          {event.participants}/{event.maxParticipants ?? '∞'} joined
        </span>
        <Link to={`/app/events/${event.id}`}>
          <Button variant="secondary" size="sm">
            Lock in
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function ChallengeCard({ data }: { data: Dashboard }) {
  const challenge = data.activeChallenge!;
  const complete = challenge.percent >= 100;
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-[17px] font-bold text-text">
          <Swords size={16} className="text-accent" aria-hidden /> Mission
        </h2>
        <span className="font-mono text-[11px] text-muted">{relativeTime(challenge.endsAt)}</span>
      </div>
      <p className="text-[15px] font-semibold text-text">{challenge.title}</p>
      <p className="mt-0.5 font-mono text-[12px] uppercase tracking-wide text-muted">+{challenge.rewardXp} XP · {challenge.metric.toLowerCase()}</p>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar percent={challenge.percent} complete={complete} className="flex-1" />
        <span className="font-mono text-[13px] text-text">
          <CountUp value={challenge.progress} format={formatCompact} />/{formatCompact(challenge.goal)}
        </span>
      </div>
      {complete ? (
        <p className="mt-2 text-[12px] font-bold text-success">Completed — rewards paid.</p>
      ) : (
        <p className="mt-2 text-[12px] text-muted">Your contribution: <CountUp value={challenge.myProgress} format={formatCompact} /></p>
      )}
    </Card>
  );
}

function Announcements({ data }: { data: Dashboard }) {
  return (
    <Card>
      <h2 className="mb-2 font-display text-[17px] font-bold text-text">Announcements</h2>
      <div className="flex flex-col divide-y divide-border">
        {data.announcements.map((announcement) => (
          <div key={announcement.id} className="py-2.5">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
              {announcement.pinned ? <Crown size={12} className="text-accent" aria-hidden /> : null}
              {announcement.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted">{announcement.content}</p>
            <p className="mt-1 font-mono text-[11px] text-faint">{announcement.author} · {relativeTime(announcement.createdAt)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MyAchievements({ data }: { data: Dashboard }) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-[17px] font-bold text-text">Your trophies</h2>
        <Link to="/app/achievements" className="text-[13px] font-bold text-accent hover:text-accent-2">
          All
        </Link>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {data.myAchievements.map((achievement) => (
          <div key={achievement.id} className="flex items-center gap-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-elevated text-accent" aria-hidden>
              <Trophy size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-text">{achievement.name}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted">{achievement.rarity}</p>
            </div>
            <span className="font-mono text-[11px] text-faint">{relativeTime(achievement.unlockedAt)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <RowSkeleton rows={3} />
      </Card>
      <Card>
        <RowSkeleton rows={5} />
      </Card>
    </div>
  );
}