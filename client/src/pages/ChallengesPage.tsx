import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Award, CalendarX2, Swords } from 'lucide-react';
import { get, post } from '../lib/api';
import { CHALLENGE_METRIC_LABELS, QUERY_KEYS } from '../lib/constants';
import type { Challenge } from '../lib/types';
import { formatCompact, relativeTime } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CountUp } from '../components/ui/CountUp';
import { Reveal } from '../components/ui/Reveal';
import { AsyncView } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/cn';

type Filter = 'ACTIVE' | 'COMPLETED' | 'ALL';

export function ChallengesPage() {
  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const canManage = me?.role === 'SUPER_ADMIN' || me?.role === 'ADMIN' || me?.role === 'MODERATOR';

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.challenges(filter === 'ALL' ? undefined : filter),
    queryFn: () => get<Challenge[]>(`/challenges${filter !== 'ALL' ? `?status=${filter}` : ''}`),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => post<{ ok: boolean }>(`/challenges/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
    },
  });

  const active = data?.filter((c) => c.status === 'ACTIVE') ?? [];
  const completed = data?.filter((c) => c.status === 'COMPLETED') ?? [];

  return (
    <>
      <PageHeader
        kicker="Mission board · current season"
        title="Challenges"
        description="Drop kills together, earn guild XP together. Every challenge is a guild effort."
      />
      <Tabs<Filter>
        className="mb-5"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'ACTIVE', label: 'Active', count: active.length },
          { value: 'COMPLETED', label: 'Completed', count: completed.length },
          { value: 'ALL', label: 'All', count: data?.length },
        ]}
      />
      <div className="flex flex-col gap-3">
        <AsyncView
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          skeleton={<ChallengeSkeleton />}
          isEmpty={data?.length === 0}
          empty={
            <Card className="hover:border-border">
              <p className="py-4 text-center text-[13px] text-muted">
                {filter === 'ACTIVE' ? 'No missions on the board. Give leadership a nudge.' : 'No challenges logged here yet.'}
              </p>
            </Card>
          }
        >
          {data?.map((challenge, index) => (
            <Reveal key={challenge.id} index={index}>
              <MissionCard
                challenge={challenge}
                canManage={canManage}
                cancelling={cancelMutation.isPending}
                onCancel={() => cancelMutation.mutate(challenge.id)}
              />
            </Reveal>
          ))}
        </AsyncView>
        <Link to="/app/achievements" className="self-start text-[13px] font-bold text-accent hover:text-accent-2">
          See your trophy case →
        </Link>
      </div>
    </>
  );
}

function MissionCard({
  challenge,
  canManage,
  cancelling,
  onCancel,
}: {
  challenge: Challenge;
  canManage: boolean;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const isActive = challenge.status === 'ACTIVE';
  const complete = challenge.percent >= 100;
  return (
    <Card className={cn('relative overflow-hidden hover:border-border-strong', isActive && 'corner-brackets')}>
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-1',
          complete ? 'bg-success' : isActive ? 'bg-accent' : 'bg-border-strong',
        )}
        aria-hidden
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', isActive ? 'bg-accent/10 text-accent' : 'bg-elevated text-muted')} aria-hidden>
              {isActive ? <Swords size={15} /> : <Award size={15} />}
            </span>
            <h2 className="font-display text-[17px] font-bold text-text">{challenge.title}</h2>
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                isActive ? 'bg-accent/10 text-accent' : 'bg-success/10 text-success',
              )}
            >
              {isActive ? 'Active mission' : 'Mission complete'}
            </span>
          </div>
          <p className="mt-1.5 max-w-[600px] text-[13px] leading-relaxed text-muted">{challenge.description}</p>
          <p className="mt-1.5 font-mono text-[12px] uppercase tracking-wide text-muted">
            {CHALLENGE_METRIC_LABELS[challenge.metric as keyof typeof CHALLENGE_METRIC_LABELS] ?? challenge.metric} · +{challenge.rewardXp} XP · {relativeTime(challenge.endsAt)}
          </p>
        </div>
        {isActive && canManage ? (
          <Button variant="danger" size="sm" loading={cancelling} onClick={onCancel} icon={<CalendarX2 size={14} />}>
            Cancel
          </Button>
        ) : null}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <ProgressBar percent={challenge.percent} complete={complete} className="flex-1" />
        <span className="font-mono text-[13px] text-text">
          <CountUp value={challenge.progress} format={formatCompact} /> / {formatCompact(challenge.goal)}
        </span>
      </div>
      <p className={cn('mt-2 flex items-center gap-1.5 text-[12px]', complete ? 'font-bold text-success' : 'text-muted')}>
        {isActive ? (
          <>
            <Award size={13} aria-hidden /> Your contribution: <CountUp value={challenge.myProgress} format={formatCompact} /> {challenge.metric.toLowerCase()}
          </>
        ) : complete ? (
          'Rewards paid out.'
        ) : null}
      </p>
    </Card>
  );
}

function ChallengeSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="hover:border-border">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-elevated" />
            <div className="h-4 w-48 animate-pulse rounded bg-elevated" />
          </div>
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-elevated" />
          <div className="mt-4 h-1.5 w-full animate-pulse rounded-full bg-elevated" />
        </Card>
      ))}
    </div>
  );
}