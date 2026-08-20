import { useQuery } from '@tanstack/react-query';
import { Swords, Target, Trophy, Zap, Flame, Shield, Star, Skull, Medal, Users, Sword, Gamepad2, CalendarDays, Sparkles, Lock } from 'lucide-react';
import { get } from '../lib/api';
import { QUERY_KEYS, RARITY_ORDER, type AchievementRarity } from '../lib/constants';
import type { Achievement } from '../lib/types';
import { AsyncView } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CountUp } from '../components/ui/CountUp';
import { Reveal } from '../components/ui/Reveal';
import { RarityBadge } from '../components/ui/Badges';
import { cn } from '../lib/cn';

const ICONS: Record<string, typeof Trophy> = {
  Trophy,
  Swords,
  Target,
  Zap,
  Flame,
  Shield,
  Star,
  Skull,
  Medal,
  Users,
  Sword,
  Gamepad2,
  CalendarDays,
  Sparkles,
};

const RARITY_SWATCH: Record<string, string> = {
  COMMON: 'bg-rarity-common',
  RARE: 'bg-rarity-rare',
  EPIC: 'bg-rarity-epic',
  LEGENDARY: 'bg-rarity-legendary',
};

export function AchievementsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.achievements,
    queryFn: () => get<Achievement[]>('/achievements'),
  });

  const sorted = data ? [...data].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || a.order - b.order) : [];
  const unlockedCount = sorted.filter((a) => a.unlocked).length;

  return (
    <>
      <PageHeader
        kicker="Trophy case"
        title="Achievements"
        description={
          data ? (
            <>
              <CountUp value={unlockedCount} /> of {data.length} trophies earned
            </>
          ) : (
            'Personal achievements'
          )
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const).map((rarity) => (
          <span key={rarity} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-muted">
            <span className={cn('h-1.5 w-1.5 rotate-45', RARITY_SWATCH[rarity])} aria-hidden />
            {rarity}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AsyncView
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          skeleton={<TrophySkeleton />}
          isEmpty={data?.length === 0}
          empty={<p className="col-span-full py-10 text-center font-mono text-[13px] text-muted">No trophies defined yet. Go earn the first one.</p>}
        >
          {sorted.map((achievement, index) => (
            <Reveal key={achievement.id} index={index}>
              <TrophyCard achievement={achievement} />
            </Reveal>
          ))}
        </AsyncView>
      </div>
    </>
  );
}

function TrophyCard({ achievement }: { achievement: Achievement }) {
  const Icon = ICONS[achievement.icon] ?? Trophy;
  const rarityTier = RARITY_ORDER[achievement.rarity as AchievementRarity] ?? 0;
  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-gradient-to-b from-surface to-panel p-4 transition-colors',
        achievement.unlocked ? 'corner-brackets border-border-strong' : 'border-border opacity-75',
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg border',
            achievement.unlocked ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border bg-elevated text-muted',
          )}
        >
          <Icon size={19} aria-hidden />
        </div>
        <div className="text-right">
          <RarityBadge rarity={achievement.rarity} />
          <p className="mt-1 font-mono text-[11px] text-muted">+{achievement.rewardXp} XP</p>
        </div>
      </div>
      <div>
        <h2 className="text-[15px] font-bold text-text">{achievement.name}</h2>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{achievement.description}</p>
      </div>
      <div className="mt-auto">
        {achievement.unlocked ? (
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-success">
            <span className="h-1.5 w-1.5 rotate-45 bg-success" aria-hidden /> Unlocked
          </p>
        ) : (
          <div className="flex items-center gap-2.5">
            <ProgressBar percent={achievement.percent} className="flex-1" />
            <span className="font-mono text-[12px] text-muted">
              <CountUp value={achievement.progress} />/{achievement.requirementValue}
            </span>
          </div>
        )}
        {rarityTier >= 3 ? (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-rarity-legendary">
            <Lock size={11} aria-hidden /> Legendary loot
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TrophySkeleton() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between">
            <div className="h-11 w-11 animate-pulse rounded-lg bg-elevated" />
            <div className="h-5 w-16 animate-pulse rounded bg-elevated" />
          </div>
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-elevated" />
          <div className="mt-2 h-3 w-full animate-pulse rounded bg-elevated" />
        </div>
      ))}
    </>
  );
}