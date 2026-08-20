import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Swords, Trophy } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { get, post } from '../lib/api';
import {
  QUERY_KEYS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
  TOURNAMENT_STATUS_STYLES,
  type TournamentFormat,
} from '../lib/constants';
import type { Tournament } from '../lib/types';
import { formatDate, formatDateTime } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api';
import { Card } from '../components/ui/Card';
import { AsyncView } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Input';
import { Sheet } from '../components/ui/Sheet';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/cn';

type Filter = 'REGISTRATION' | 'ACTIVE' | 'COMPLETED' | 'ALL';

export function TournamentsPage() {
  const { me } = useAuth();
  const canManage = me?.role === 'SUPER_ADMIN' || me?.role === 'ADMIN' || me?.role === 'MODERATOR';
  const [filter, setFilter] = useState<Filter>('REGISTRATION');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.tournaments(filter === 'ALL' ? undefined : filter),
    queryFn: () => get<Tournament[]>(`/tournaments${filter !== 'ALL' ? `?status=${filter}` : ''}`),
  });

  return (
    <>
      <PageHeader
        kicker={`Bracket watch · ${data?.length ?? 0} on the board`}
        title="Tournaments"
        description="Guild-hosted brackets with real trophies on the line. Sign in, lock in, take the crown."
        actions={canManage ? (
          <Button icon={<Plus size={17} />} onClick={() => setCreateOpen(true)}>
            Host bracket
          </Button>
        ) : undefined}
      />
      <Tabs<Filter>
        className="mb-5"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'REGISTRATION', label: 'Registration' },
          { value: 'ACTIVE', label: 'Live' },
          { value: 'COMPLETED', label: 'Completed' },
          { value: 'ALL', label: 'All' },
        ]}
      />
      <AsyncView
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        skeleton={<TournamentsSkeleton />}
        isEmpty={data?.length === 0}
        empty={
          <EmptyState
            icon={<Swords size={28} />}
            title="No brackets yet"
            description={canManage ? 'Host one — registration opens the moment it goes live.' : 'Leadership has not scheduled a tournament yet.'}
          />
        }
      >
        {data ? (
          <div className="flex flex-col gap-3">
            {data.map((tournament, index) => (
              <TournamentCard key={tournament.id} tournament={tournament} index={index} />
            ))}
          </div>
        ) : null}
      </AsyncView>
      <CreateTournamentSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

function TournamentCard({ tournament, index }: { tournament: Tournament; index: number }) {
  const reducedMotion = useReducedMotion();
  const registered = tournament._count.participants;
  const capacity = tournament.size;
  const percent = Math.round((registered / capacity) * 100);
  const nextMatch = tournament.matches.find((m) => !m.winnerTeamId && m.scheduledAt);
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.05 }}
    >
      <Link
        to={`/app/tournaments/${tournament.id}`}
        className="group relative block overflow-hidden rounded-xl border border-border bg-gradient-to-b from-surface to-panel p-4 transition-colors duration-150 hover:border-border-strong sm:p-5"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(240px_140px_at_100%_0%,black,transparent)]"
          aria-hidden
        />
        <div className="relative flex items-start gap-3">
          <div className="corner-brackets flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated text-accent">
            <Trophy size={18} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-text transition-colors group-hover:text-accent">{tournament.name}</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {TOURNAMENT_FORMAT_LABELS[tournament.format as TournamentFormat] ?? tournament.format} · {tournament.size}-team bracket
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-faint">
              Drop {formatDate(tournament.startsAt)}
              {tournament.endsAt ? ` · end ${formatDate(tournament.endsAt)}` : ''}
            </p>
          </div>
          <StatusChip status={tournament.status} />
        </div>
        <div className="relative mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-[0.08em] text-muted">
              {registered}/{capacity} teams locked
            </span>
            <span className="font-mono text-text">{percent}%</span>
          </div>
          <ProgressBar percent={percent} complete={registered >= capacity} />
        </div>
        <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3">
          {tournament.prize ? (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-accent">
              <Trophy size={13} aria-hidden /> {tournament.prize}
            </span>
          ) : null}
          {nextMatch ? (
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
              <span className="h-1 w-1 rounded-full bg-electric" aria-hidden />
              Next match {formatDateTime(nextMatch.scheduledAt)}
            </span>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}

export function StatusChip({ status, className }: { status: string; className?: string }) {
  const label = TOURNAMENT_STATUS_LABELS[status] ?? status;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold uppercase tracking-wide',
        TOURNAMENT_STATUS_STYLES[status] ?? 'border-border bg-elevated text-muted',
        className,
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

function TournamentsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="mt-4 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function CreateTournamentSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', size: '8', startsAt: '', endsAt: '', prize: '' });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      post<{ id: string }>('/tournaments', {
        name: form.name,
        description: form.description || undefined,
        size: Number(form.size),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        prize: form.prize || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      onClose();
      setForm({ name: '', description: '', size: '8', startsAt: '', endsAt: '', prize: '' });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  return (
    <Sheet open={open} onClose={onClose} title="Host a bracket">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          createMutation.mutate();
        }}
      >
        <Field label="Name" htmlFor="t-name">
          <Input id="t-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} placeholder="KINGS CUP #1" />
        </Field>
        <Field label="Description" htmlFor="t-desc">
          <Textarea id="t-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} rows={3} placeholder="Format notes, rules…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Team slots" htmlFor="t-size">
            <Select id="t-size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>
              {[2, 4, 8, 16].map((size) => (
                <option key={size} value={String(size)}>
                  {size} teams
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prize" htmlFor="t-prize">
            <Input id="t-prize" value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} maxLength={200} placeholder="2,000 UC" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts" htmlFor="t-start">
            <Input id="t-start" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
          </Field>
          <Field label="Ends (optional)" htmlFor="t-end">
            <Input id="t-end" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </Field>
        </div>
        {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p> : null}
        <Button type="submit" loading={createMutation.isPending} icon={<Plus size={17} />}>
          Host bracket
        </Button>
      </form>
    </Sheet>
  );
}