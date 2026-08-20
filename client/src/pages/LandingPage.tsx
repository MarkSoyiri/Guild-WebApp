import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Crosshair, Radio, Swords, Trophy } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { get } from '../lib/api';
import { QUERY_KEYS } from '../lib/constants';
import type { Landing } from '../lib/types';
import { formatCompact, formatDateTime, relativeTime } from '../lib/format';
import { Avatar } from '../components/ui/Avatar';
import { RankBadge, RarityBadge, RoleBadge } from '../components/ui/Badges';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ErrorPanel } from '../components/ui/ErrorPanel';
import { SkeletonRows } from '../components/ui/Skeleton';
import { CountUp } from '../components/ui/CountUp';
import { DEMO_ACCOUNTS } from '../lib/constants';

export function LandingPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEYS.landing,
    queryFn: () => get<Landing>('/public/landing'),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="clip-notch-sm flex h-9 w-9 items-center justify-center bg-gradient-to-br from-accent to-accent-2 font-display text-[15px] font-bold text-on-accent">
              KO
            </div>
            <span className="font-display text-[15px] font-bold tracking-wide text-text">KINGS ONLY</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/auth?tab=register">
              <Button>Enter the guild</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="py-16">
            <SkeletonRows rows={6} />
          </div>
        ) : isError || !data ? (
          <div className="py-16">
            <ErrorPanel message="Could not load the guild." onRetry={() => refetch()} />
          </div>
        ) : (
          <>
            <Hero data={data} />
            <StatBand data={data} />
            <div className="grid grid-cols-1 gap-6 py-12 lg:grid-cols-3">
              <TopPlayers data={data} />
              <div className="flex flex-col gap-6">
                <ActiveChallenge data={data} />
                <UpcomingEvents data={data} />
              </div>
              <RecentActivity data={data} />
            </div>
            <AchievementStrip data={data} />
            <CTA data={data} />
          </>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[12px] text-muted sm:px-6 lg:px-8">
          <p>KINGS ONLY · Free Fire guild · MENA region</p>
          {import.meta.env.DEV ? <p className="font-mono">Demo accounts: {DEMO_ACCOUNTS.map((a) => `${a.identifier}`).join(' · ')}</p> : null}
        </div>
      </footer>
    </div>
  );
}

function Hero({ data }: { data: Landing }) {
  const reducedMotion = useReducedMotion();
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(720px_360px_at_70%_0%,black,transparent)]" aria-hidden />
      <div className="relative grid grid-cols-1 items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <p className="mb-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-accent">
            <Crosshair size={14} aria-hidden />
            Ready to drop?
          </p>
          <h1 className="text-balance font-display text-[42px] font-bold leading-[0.98] tracking-[-0.03em] text-text sm:text-[58px] lg:text-[64px]">
            Play together.
            <br />
            <span className="text-accent">Dominate</span> together.
          </h1>
          <p className="mt-5 max-w-[520px] text-[15px] leading-relaxed text-muted">
            {data.guild.description ??
              'KINGS ONLY is a competitive Free Fire guild built around ranked grind, custom rooms, and Sunday scrims. Track every stat, every challenge, every win.'}
          </p>
          <p className="mt-4 font-mono text-[13px] text-muted">
            Level {data.guild.level} · {data.guild.memberCount} members · {data.guild.region}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/auth?tab=register">
              <Button size="lg">
                Enter the guild <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="secondary">
                Meet the squad
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="hidden lg:block"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.08 }}
        >
          <div className="corner-brackets relative rounded-xl border border-border bg-surface/80 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" aria-hidden />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" aria-hidden />
                </span>
                Top of the ladder
              </p>
              <Radio size={14} className="text-success" aria-hidden />
            </div>
            <div className="flex flex-col">
              {data.topPlayers.map((player) => (
                <div key={player.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center font-mono text-[13px] ${player.rank === 1 ? 'rotate-45 bg-accent text-on-accent' : 'text-muted'}`}>
                    {player.rank === 1 ? <Trophy size={12} className="-rotate-45" aria-hidden /> : player.rank}
                  </span>
                  <Avatar src={player.avatarUrl} name={player.displayName} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-text">{player.displayName}</p>
                    <p className="text-[11px] text-muted">{player.playerRole}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[15px] text-text">{formatCompact(player.kd)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted">K/D</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatBand({ data }: { data: Landing }) {
  const stats = [
    { label: 'Guild kills', value: data.kills },
    { label: 'Guild wins', value: data.wins },
    { label: 'Average K/D', value: data.avgKd },
    { label: 'Members', value: data.guild.memberCount },
  ];
  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="relative flex flex-col gap-1.5 bg-bg px-4 py-6">
          <CountUp
            value={stat.value}
            format={(value) => (stat.label === 'Average K/D' ? value.toFixed(2) : formatCompact(value))}
            className="font-mono text-[28px] font-bold leading-none text-text"
          />
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{stat.label}</span>
          <span className="absolute right-3 top-3 h-1.5 w-1.5 rotate-45 bg-accent/60" aria-hidden />
        </div>
      ))}
    </section>
  );
}

function TopPlayers({ data }: { data: Landing }) {
  return (
    <Card className="lg:col-span-1">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-[17px] font-bold text-text">Top players</h2>
        <Trophy size={16} className="text-accent" aria-hidden />
      </div>
      <div className="flex flex-col divide-y divide-border">
        {data.topPlayers.map((player) => (
          <div key={player.id} className="flex items-center gap-3 py-3">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center font-mono text-[13px] ${player.rank <= 3 ? 'bg-accent/10 font-bold text-accent' : 'text-muted'}`}>
              {player.rank}
            </span>
            <Avatar src={player.avatarUrl} name={player.displayName} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-text">{player.displayName}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <RankBadge rank={player.rankTier} />
                <RoleBadge role={player.playerRole} />
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[15px] text-text">{player.kd.toFixed(2)}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">K/D</p>
            </div>
          </div>
        ))}
      </div>
      <Link to="/app/leaderboard" className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-accent hover:text-accent-2">
        Full leaderboard <ArrowRight size={14} />
      </Link>
    </Card>
  );
}

function ActiveChallenge({ data }: { data: Landing }) {
  if (!data.challenge) return null;
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-[17px] font-bold text-text">
          <Swords size={16} className="text-accent" aria-hidden /> Active mission
        </h2>
        <span className="font-mono text-[11px] text-muted">ends {relativeTime(data.challenge.endsAt)}</span>
      </div>
      <p className="text-[15px] font-semibold text-text">{data.challenge.title}</p>
      <p className="mt-1 font-mono text-[12px] uppercase tracking-wide text-muted">
        {data.challenge.metric} · +{data.challenge.rewardXp} XP
      </p>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar percent={data.challenge.percent} className="flex-1" />
        <span className="font-mono text-[13px] text-text">
          {formatCompact(data.challenge.progress)} / {formatCompact(data.challenge.goal)}
        </span>
      </div>
    </Card>
  );
}

function UpcomingEvents({ data }: { data: Landing }) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-[17px] font-bold text-text">
          <CalendarClock size={16} className="text-muted" aria-hidden /> Upcoming
        </h2>
      </div>
      {data.events.length === 0 ? (
        <p className="py-4 text-[13px] text-muted">Nothing on the calendar. Yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {data.events.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-text">{event.title}</p>
                <p className="font-mono text-[12px] text-muted">{formatDateTime(event.startsAt)}</p>
              </div>
              <span className="shrink-0 rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-muted">
                {event.participants}/{event.maxParticipants ?? '∞'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentActivity({ data }: { data: Landing }) {
  return (
    <Card>
      <h2 className="mb-2 font-display text-[17px] font-bold text-text">Recent activity</h2>
      {data.activity.length === 0 ? (
        <p className="py-4 text-[13px] text-muted">Radio silence. Make some noise.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {data.activity.slice(0, 8).map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 py-3">
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

function AchievementStrip({ data }: { data: Landing }) {
  return (
    <section className="py-12">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-display text-[22px] font-bold text-text">Guild achievements</h2>
        <div className="hud-divider flex-1" aria-hidden />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {data.achievements.map((achievement) => (
          <div key={achievement.key} className="corner-brackets rounded-xl border border-border bg-surface p-4">
            <Swords size={18} className="mb-2 text-accent" aria-hidden />
            <p className="text-[13px] font-semibold text-text">{achievement.name}</p>
            <RarityBadge rarity={achievement.rarity} className="mt-1.5" />
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA({ data }: { data: Landing }) {
  return (
    <section className="relative mb-12 overflow-hidden">
      <div className="corner-brackets pointer-events-none absolute inset-0 rounded-xl" aria-hidden />
      <div className="relative flex flex-col items-center gap-4 rounded-xl border border-border bg-gradient-to-b from-surface to-panel px-6 py-14 text-center">
        <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-accent">
          <Crosshair size={14} aria-hidden /> Last call
        </p>
        <h2 className="font-display text-[30px] font-bold leading-tight tracking-[-0.02em] text-text sm:text-[36px]">
          Ready to run with {data.guild.tag}?
        </h2>
        <p className="max-w-[420px] text-[14px] text-muted">
          Join the roster, sync your Free Fire stats, and start climbing with a squad that actually shows up.
        </p>
        <Link to="/auth?tab=register" className="mt-2">
          <Button size="lg">
            Enter the guild <ArrowRight size={18} />
          </Button>
        </Link>
      </div>
    </section>
  );
}