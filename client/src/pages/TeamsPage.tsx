import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Swords } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { get, post } from '../lib/api';
import { QUERY_KEYS } from '../lib/constants';
import type { Team } from '../lib/types';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { AsyncView } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { Sheet } from '../components/ui/Sheet';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { CountUp } from '../components/ui/CountUp';

export function TeamsPage() {
  const { me } = useAuth();
  const canManage = me?.role === 'SUPER_ADMIN' || me?.role === 'ADMIN' || me?.role === 'MODERATOR';
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.teams,
    queryFn: () => get<Team[]>('/teams'),
  });

  return (
    <>
      <PageHeader
        kicker={`Team loadouts · ${data?.length ?? 0} squads`}
        title="Squad rosters"
        description="Locked-in squads with captains, win records, and tournament slots. Pick your lane."
        actions={canManage ? (
          <Button icon={<Plus size={17} />} onClick={() => setCreateOpen(true)}>
            Form squad
          </Button>
        ) : undefined}
      />
      <AsyncView
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        skeleton={<TeamsSkeleton />}
        isEmpty={data?.length === 0}
        empty={
          <EmptyState
            icon={<Swords size={28} />}
            title="No squads yet — found one?"
            description="Teams are built by leadership. Ask an officer to form yours and claim the tag."
          />
        }
      >
        {data ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.map((team, index) => (
              <TeamCard key={team.id} team={team} index={index} />
            ))}
          </div>
        ) : null}
      </AsyncView>
      <CreateTeamSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

function TeamCard({ team, index }: { team: Team; index: number }) {
  const reducedMotion = useReducedMotion();
  const captain = team.members.find((m) => m.userId === team.captainId);
  const losses = Math.max(team.matches - team.wins, 0);
  const record = team.matches > 0 ? `${team.wins}W · ${losses}L` : 'no matches yet';
  const roster = team.members.slice(0, 5);
  const overflow = team._count.members - roster.length;
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.05 }}
    >
      <Link
        to={`/app/teams/${team.id}`}
        className="group relative block overflow-hidden rounded-xl border border-border bg-gradient-to-b from-surface to-panel p-4 transition-colors duration-150 hover:border-border-strong sm:p-5"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(240px_140px_at_100%_0%,black,transparent)]"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <div className="clip-notch-sm flex h-11 w-11 shrink-0 items-center justify-center bg-gradient-to-br from-accent to-accent-2 font-display text-[13px] font-bold text-on-accent">
            {team.tag}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold text-text transition-colors group-hover:text-accent">{team.name}</p>
            <p className="truncate font-mono text-[11px] uppercase tracking-wide text-muted">
              {record} · {team._count.members} on roster
            </p>
          </div>
          <div className="shrink-0 text-right">
            <CountUp value={team.wins} className="font-mono text-[22px] font-bold leading-none text-accent" />
            <p className="text-[10px] uppercase tracking-wide text-muted">Wins</p>
          </div>
        </div>
        <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex items-center -space-x-2">
            {roster.map((member) => (
              <Avatar key={member.id} src={member.user.avatarUrl} name={member.user.displayName} size={28} />
            ))}
            {overflow > 0 ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-elevated font-mono text-[10px] font-bold text-muted">
                +{overflow}
              </span>
            ) : null}
          </div>
          {captain ? (
            <p className="min-w-0 truncate text-[12px] text-muted">
              Captain: <span className="font-semibold text-text">{captain.user.displayName}</span>
            </p>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}

function TeamsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-10" />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function CreateTeamSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', tag: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => post<{ id: string }>('/teams', { ...form, tag: form.tag || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teams });
      onClose();
      setForm({ name: '', tag: '', description: '' });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  return (
    <Sheet open={open} onClose={onClose} title="Form a squad">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          createMutation.mutate();
        }}
      >
        <Field label="Squad name" htmlFor="team-name">
          <Input id="team-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={30} placeholder="TEAM ALPHA" />
        </Field>
        <Field label="Tag" htmlFor="team-tag" hint="Short code shown on brackets. Max 8 characters.">
          <Input id="team-tag" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} maxLength={8} placeholder="ALPHA" />
        </Field>
        <Field label="Description" htmlFor="team-desc">
          <Input id="team-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} placeholder="Squad identity, scrim schedule…" />
        </Field>
        {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p> : null}
        <Button type="submit" loading={createMutation.isPending} icon={<Plus size={17} />}>
          Deploy squad
        </Button>
      </form>
    </Sheet>
  );
}