import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, Play, Swords, Trophy, X } from 'lucide-react';
import { get, post } from '../lib/api';
import { QUERY_KEYS, TOURNAMENT_FORMAT_LABELS, type TournamentFormat } from '../lib/constants';
import type { Team, Tournament, TournamentMatch } from '../lib/types';
import { formatDate, formatDateTime } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api';
import { Card } from '../components/ui/Card';
import { AsyncView, RowSkeleton } from '../components/ui/PlayerRow';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Input';
import { Sheet } from '../components/ui/Sheet';
import { EmptyState } from '../components/ui/EmptyState';
import { CountUp } from '../components/ui/CountUp';
import { StatRow } from '../components/ui/StatBlock';
import { cn } from '../lib/cn';
import { StatusChip } from './TournamentsPage';

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const canManage = me?.role === 'SUPER_ADMIN' || me?.role === 'ADMIN' || me?.role === 'MODERATOR';
  const [registerOpen, setRegisterOpen] = useState(false);
  const [resultFor, setResultFor] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.tournament(id ?? ''),
    queryFn: () => get<Tournament>(`/tournaments/${id}`),
    enabled: Boolean(id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournament(id ?? '') });

  const startMutation = useMutation({
    mutationFn: () => post<{ ok: boolean }>(`/tournaments/${id}/start`),
    onSuccess: invalidate,
  });

  const cancelMutation = useMutation({
    mutationFn: () => post<{ ok: boolean }>(`/tournaments/${id}/cancel`),
    onSuccess: invalidate,
  });

  const rounds = useMemo(() => {
    const groups = new Map<number, TournamentMatch[]>();
    for (const match of data?.matches ?? []) {
      const list = groups.get(match.round) ?? [];
      list.push(match);
      groups.set(match.round, list);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [data]);

  const winner = data?.matches?.find((m) => m.round === 0);

  return (
    <>
      <AsyncView
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        skeleton={
          <div className="flex flex-col gap-6">
            <Card>
              <RowSkeleton rows={3} />
            </Card>
            <Card>
              <RowSkeleton rows={6} />
            </Card>
          </div>
        }
      >
        {data ? (
          <div className="flex flex-col gap-6">
            <TournamentHero
              data={data}
              winner={winner ?? null}
              canManage={canManage}
              onStart={() => startMutation.mutate()}
              onRegister={() => setRegisterOpen(true)}
              onCancel={() => cancelMutation.mutate()}
              starting={startMutation.isPending}
              cancelling={cancelMutation.isPending}
            />
            {(data.matches?.length ?? 0) > 0 ? (
              <BracketView rounds={rounds} data={data} canManage={canManage} onResult={setResultFor} />
            ) : (
              <SeededSquads data={data} />
            )}
          </div>
        ) : null}
      </AsyncView>
      <RegisterTeamSheet open={registerOpen} onClose={() => setRegisterOpen(false)} tournament={data ?? null} />
      <MatchResultSheet open={Boolean(resultFor)} matchId={resultFor} onClose={() => setResultFor(null)} tournament={data ?? null} />
    </>
  );
}

function TournamentHero({
  data,
  winner,
  canManage,
  onStart,
  onRegister,
  onCancel,
  starting,
  cancelling,
}: {
  data: Tournament;
  winner: TournamentMatch | null;
  canManage: boolean;
  onStart: () => void;
  onRegister: () => void;
  onCancel: () => void;
  starting: boolean;
  cancelling: boolean;
}) {
  const winnerName = winner?.winnerTeamId
    ? (winner.teamA?.id === winner.winnerTeamId ? winner.teamA?.name : winner.teamB?.name) ?? '—'
    : null;
  return (
    <section className="relative overflow-hidden rounded-xl border border-border">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(560px_260px_at_20%_0%,black,transparent)]" aria-hidden />
      <div className="corner-brackets pointer-events-none absolute inset-0 rounded-xl" aria-hidden />
      <div className="relative p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
            <span className="h-1.5 w-1.5 rotate-45 bg-accent" aria-hidden />
            Bracket watch · {data.size}-team {TOURNAMENT_FORMAT_LABELS[data.format as TournamentFormat] ?? data.format}
          </p>
          <Link to="/app/tournaments">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />}>
              All tournaments
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-text sm:text-[30px]">
            {data.name}
          </h1>
          <StatusChip status={data.status} />
        </div>
        {data.description ? <p className="mt-3 max-w-[560px] text-[13px] leading-relaxed text-muted">{data.description}</p> : null}
        {data.prize ? (
          <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-accent">
            <Trophy size={14} aria-hidden /> Prize pool: {data.prize}
          </p>
        ) : null}
        {canManage ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {data.status === 'REGISTRATION' ? (
              <Button size="sm" icon={<Play size={14} />} loading={starting} onClick={onStart}>
                Launch bracket
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" icon={<Swords size={14} />} onClick={onRegister}>
              Lock in
            </Button>
            {data.status !== 'COMPLETED' && data.status !== 'CANCELLED' ? (
              <Button variant="danger" size="sm" icon={<X size={14} />} loading={cancelling} onClick={onCancel}>
                Cancel bracket
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="hud-divider my-5" aria-hidden />
        <StatRow
          items={[
            { label: 'Teams locked', value: <CountUp value={data._count.participants} />, accent: true },
            { label: 'Matches', value: <CountUp value={data._count.matches} /> },
            { label: 'Starts', value: formatDate(data.startsAt) },
            { label: 'Ends', value: formatDate(data.endsAt) },
          ]}
        />
        {data.startsAt ? (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-muted">
            First drop {formatDateTime(data.startsAt)}
            {data.endsAt ? ` · last ${formatDateTime(data.endsAt)}` : ''}
          </p>
        ) : null}
        {winnerName ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5">
            <p className="flex items-center gap-2 font-display text-[15px] font-bold text-success">
              <Trophy size={17} aria-hidden /> {winnerName} took the crown
            </p>
            {data.mvp ? (
              <p className="text-[12px] font-semibold text-muted">
                MVP · <span className="text-text">{data.mvp.displayName}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BracketView({
  rounds,
  data,
  canManage,
  onResult,
}: {
  rounds: [number, TournamentMatch[]][];
  data: Tournament;
  canManage: boolean;
  onResult: (matchId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {rounds.map(([round, matches]) => (
        <section key={round}>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-display text-[15px] font-bold uppercase tracking-wide text-text">
              {round === 0 ? 'Grand final' : round === 1 ? 'Semi-finals' : `Round ${round}`}
            </h2>
            <div className="hud-divider flex-1" aria-hidden />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {matches.map((match) => {
              const decided = Boolean(match.winnerTeamId);
              const isBye = !match.teamAId || !match.teamBId;
              return (
                <div
                  key={match.id}
                  className={cn(
                    'rounded-xl border bg-gradient-to-b from-surface to-panel p-3.5 transition-colors',
                    decided ? 'border-success/40' : 'border-border hover:border-border-strong',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <TeamSlot
                      name={match.teamA?.name ?? 'TBD'}
                      tag={match.teamA?.tag}
                      won={match.winnerTeamId === match.teamAId}
                      score={match.scoreA}
                    />
                    <span className="shrink-0 font-mono text-[11px] font-bold text-faint">vs</span>
                    <TeamSlot
                      name={match.teamB?.name ?? 'TBD'}
                      tag={match.teamB?.tag}
                      won={match.winnerTeamId === match.teamBId}
                      score={match.scoreB}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <MatchStatus decided={decided} isBye={isBye} ongoing={match.status === 'ONGOING'} scheduledAt={match.scheduledAt} />
                    {canManage && !decided && !isBye ? (
                      <Button variant="secondary" size="sm" onClick={() => onResult(match.id)}>
                        Log score
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <p className="text-center font-mono text-[11px] uppercase tracking-wide text-faint">
        {data._count.matches} matches · bracket auto-generated
      </p>
    </div>
  );
}

function MatchStatus({ decided, isBye, ongoing, scheduledAt }: { decided: boolean; isBye: boolean; ongoing: boolean; scheduledAt: string | null }) {
  if (decided) {
    return <span className="text-[11px] uppercase tracking-wide text-muted">Done</span>;
  }
  if (isBye) {
    return <span className="text-[11px] uppercase tracking-wide text-muted">Open slot</span>;
  }
  if (ongoing) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-electric">
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-electric opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-electric" />
        </span>
        Live now
      </span>
    );
  }
  return (
    <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
      Scheduled{scheduledAt ? ` · ${formatDateTime(scheduledAt)}` : ''}
    </span>
  );
}

function TeamSlot({ name, tag, won, score }: { name: string; tag?: string; won: boolean; score: number | null }) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2 rounded-lg border p-2 transition-colors',
        won ? 'border-success/50 bg-success/10' : 'border-border bg-elevated',
      )}
    >
      {tag ? <span className="clip-notch-sm shrink-0 bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent">{tag}</span> : null}
      <span className="truncate text-[13px] font-semibold text-text">{name}</span>
      {score !== null ? <span className="ml-auto font-mono text-[13px] font-bold text-accent">{score}</span> : null}
      {won ? <Crown size={13} className="shrink-0 text-success" aria-hidden /> : null}
    </div>
  );
}

function SeededSquads({ data }: { data: Tournament }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-display text-[15px] font-bold uppercase tracking-wide text-text">Seeded squads</h2>
        <div className="hud-divider flex-1" aria-hidden />
        <span className="font-mono text-[11px] text-muted">{data._count.participants}/{data.size}</span>
      </div>
      {data.participants?.length === 0 ? (
        <EmptyState
          icon={<Swords size={28} />}
          title="No squads locked in yet"
          description="Registration is open — early teams claim the top seeds."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.participants?.map((participant, index) => (
            <div
              key={participant.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-gradient-to-b from-surface to-panel p-3.5 transition-colors hover:border-border-strong"
            >
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center font-mono text-[13px]', index < 3 ? 'bg-accent/10 font-bold text-accent' : 'text-muted')}>
                #{index + 1}
              </span>
              <div className="clip-notch-sm flex h-9 w-9 shrink-0 items-center justify-center bg-elevated font-display text-[11px] font-bold text-accent">
                {participant.team.tag}
              </div>
              <p className="min-w-0 truncate text-[14px] font-semibold text-text">{participant.team.name}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RegisterTeamSheet({ open, onClose, tournament }: { open: boolean; onClose: () => void; tournament: Tournament | null }) {
  const queryClient = useQueryClient();
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: teams } = useQuery({
    queryKey: QUERY_KEYS.teams,
    queryFn: () => get<Team[]>('/teams'),
    enabled: open,
  });

  const registered = new Set(tournament?.participants?.map((p) => p.team.id) ?? []);
  const candidates = (teams ?? []).filter((team) => !registered.has(team.id));

  const registerMutation = useMutation({
    mutationFn: () => post<{ ok: boolean }>(`/tournaments/${tournament?.id}/register`, { teamId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournament(tournament?.id ?? '') });
      setTeamId('');
      onClose();
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  return (
    <Sheet open={open} onClose={onClose} title="Lock in a squad">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          if (teamId) registerMutation.mutate();
        }}
      >
        <Field label="Team" htmlFor="reg-team">
          <Select id="reg-team" value={teamId} onChange={(e) => setTeamId(e.target.value)} required>
            <option value="" disabled>
              Select a team…
            </option>
            {candidates.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.tag})
              </option>
            ))}
          </Select>
        </Field>
        {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p> : null}
        <Button type="submit" loading={registerMutation.isPending} icon={<Swords size={16} />}>
          Lock in
        </Button>
      </form>
    </Sheet>
  );
}

function MatchResultSheet({ open, matchId, onClose, tournament }: { open: boolean; matchId: string | null; onClose: () => void; tournament: Tournament | null }) {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState({ scoreA: '', scoreB: '' });
  const [error, setError] = useState<string | null>(null);

  const match = tournament?.matches?.find((m) => m.id === matchId);

  const resultMutation = useMutation({
    mutationFn: () =>
      post<{ ok: boolean }>(`/tournaments/matches/${matchId}/result`, {
        scoreA: Number(scores.scoreA),
        scoreB: Number(scores.scoreB),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournament(tournament?.id ?? '') });
      setScores({ scoreA: '', scoreB: '' });
      onClose();
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  return (
    <Sheet open={open} onClose={onClose} title="Log the score">
      {match ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            resultMutation.mutate();
          }}
        >
          <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
            <span className="min-w-0 flex-1 truncate">{match.teamA?.name ?? 'TBD'}</span>
            <span className="text-muted">vs</span>
            <span className="min-w-0 flex-1 truncate text-right">{match.teamB?.name ?? 'TBD'}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Score A" htmlFor="score-a">
              <Input id="score-a" type="number" min={0} max={999} value={scores.scoreA} onChange={(e) => setScores({ ...scores, scoreA: e.target.value })} required />
            </Field>
            <Field label="Score B" htmlFor="score-b">
              <Input id="score-b" type="number" min={0} max={999} value={scores.scoreB} onChange={(e) => setScores({ ...scores, scoreB: e.target.value })} required />
            </Field>
          </div>
          {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p> : null}
          <Button type="submit" loading={resultMutation.isPending}>
            Save score
          </Button>
        </form>
      ) : null}
    </Sheet>
  );
}