import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, Plus, Trash2, UserPlus } from 'lucide-react';
import { del, get, post } from '../lib/api';
import { QUERY_KEYS } from '../lib/constants';
import type { TeamDetail } from '../lib/types';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { AsyncView, RowSkeleton } from '../components/ui/PlayerRow';
import { Button } from '../components/ui/Button';
import { Field, Select } from '../components/ui/Input';
import { Sheet } from '../components/ui/Sheet';
import { ErrorPanel } from '../components/ui/ErrorPanel';
import { RoleBadge } from '../components/ui/Badges';
import { CountUp } from '../components/ui/CountUp';
import { StatRow } from '../components/ui/StatBlock';
import { formatPercent } from '../lib/format';

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const canManage = me?.role === 'SUPER_ADMIN' || me?.role === 'ADMIN' || me?.role === 'MODERATOR';
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.team(id ?? ''),
    queryFn: () => get<TeamDetail>(`/teams/${id}`),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.team(id ?? '') });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teams });
  };

  const captainMutation = useMutation({
    mutationFn: (userId: string) => post<{ ok: boolean }>(`/teams/${id}/captain`, { userId }),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => del<{ ok: boolean }>(`/teams/${id}/members/${userId}`),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => del<{ ok: boolean }>(`/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teams });
    },
  });

  if (isError) {
    return <ErrorPanel message="Team not found — the squad may have disbanded." onRetry={refetch} />;
  }

  const captain = data?.members.find((m) => m.userId === data.captainId);

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
              <RowSkeleton rows={4} />
            </Card>
          </div>
        }
      >
        {data ? (
          <div className="flex flex-col gap-5">
            <TeamHero data={data} captain={captain?.user.displayName ?? null} canManage={canManage} onAddMember={() => setAddOpen(true)} onDelete={() => deleteMutation.mutate()} deleting={deleteMutation.isPending} />
            <div className="hud-divider" aria-hidden />
            <Card className="hover:border-border">
              <h2 className="mb-3 flex items-center gap-2 font-display text-[17px] font-bold text-text">
                Roster · {data.members.length}
                <span className="h-1.5 w-1.5 rotate-45 bg-accent" aria-hidden />
              </h2>
              <div className="flex flex-col gap-2">
                {data.members.map((member) => {
                  const isCaptain = member.userId === data.captainId;
                  return (
                    <div key={member.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5 transition-colors hover:border-border-strong">
                      <Avatar src={member.user.avatarUrl} name={member.user.displayName} size={36} />
                      <Link to={`/app/players/${member.userId}`} className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-text hover:text-accent">{member.user.displayName}</p>
                        <div className="mt-0.5">
                          <RoleBadge role={member.role ?? 'OTHER'} />
                        </div>
                      </Link>
                      {isCaptain ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded bg-accent/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
                          <Crown size={12} aria-hidden /> Captain
                        </span>
                      ) : null}
                      {canManage && !isCaptain ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button variant="secondary" size="sm" loading={captainMutation.isPending} onClick={() => captainMutation.mutate(member.userId)}>
                            Promote
                          </Button>
                          <Button variant="danger" size="sm" icon={<UserPlus size={14} className="rotate-180" />} loading={removeMutation.isPending} onClick={() => removeMutation.mutate(member.userId)}>
                            Remove
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        ) : null}
      </AsyncView>
      <AddMemberSheet open={addOpen} onClose={() => setAddOpen(false)} team={data ?? null} />
    </>
  );
}

function TeamHero({
  data,
  captain,
  canManage,
  onAddMember,
  onDelete,
  deleting,
}: {
  data: TeamDetail;
  captain: string | null;
  canManage: boolean;
  onAddMember: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const winRate = data.matches > 0 ? Math.round((data.wins / data.matches) * 100) : 0;
  return (
    <section className="relative overflow-hidden rounded-xl border border-border">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(560px_260px_at_20%_0%,black,transparent)]" aria-hidden />
      <div className="corner-brackets pointer-events-none absolute inset-0 rounded-xl" aria-hidden />
      <div className="relative p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
            <span className="h-1.5 w-1.5 rotate-45 bg-accent" aria-hidden />
            Team dossier · Captain {captain ?? '—'}
          </p>
          <Link to="/app/teams">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />}>
              All teams
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="clip-notch-sm flex h-12 w-12 shrink-0 items-center justify-center bg-gradient-to-br from-accent to-accent-2 font-display text-[14px] font-bold text-on-accent">
            {data.tag}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-text sm:text-[30px]">
              {data.name}
            </h1>
            <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-muted">
              Tag {data.tag} · Founded {formatYear(data.createdAt)}
            </p>
          </div>
        </div>
        {data.description ? <p className="mt-3 max-w-[560px] text-[13px] leading-relaxed text-muted">{data.description}</p> : null}
        <div className="hud-divider my-5" aria-hidden />
        <StatRow
          items={[
            { label: 'Wins', value: <CountUp value={data.wins} />, accent: true },
            { label: 'Matches', value: <CountUp value={data.matches} /> },
            { label: 'Win rate', value: <CountUp value={winRate} format={formatPercent} /> },
            { label: 'Members', value: <CountUp value={data.members.length} /> },
          ]}
        />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          {data.tournamentParticipants.length > 0 ? (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">
              <Crown size={13} className="text-accent" aria-hidden />
              In {data.tournamentParticipants.length} tournament{data.tournamentParticipants.length > 1 ? 's' : ''} — {tournamentSummary(data.tournamentParticipants)}
            </span>
          ) : (
            <span className="text-[12px] font-semibold text-muted">No tournament registrations yet</span>
          )}
          {canManage ? (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={onAddMember}>
                Add member
              </Button>
              <Button variant="danger" size="sm" icon={<Trash2 size={14} />} loading={deleting} onClick={onDelete}>
                Disband
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function tournamentSummary(participants: TeamDetail['tournamentParticipants']): string {
  if (participants.length === 0) return '—';
  return participants.map((p) => p.tournament.name).slice(0, 2).join(', ');
}

function formatYear(iso: string): string {
  const year = new Date(iso).getFullYear();
  return Number.isNaN(year) ? '—' : String(year);
}

function AddMemberSheet({ open, onClose, team }: { open: boolean; onClose: () => void; team: TeamDetail | null }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: members } = useQuery({
    queryKey: QUERY_KEYS.players('pageSize=100'),
    queryFn: () => get<import('../lib/types').Paginated<import('../lib/types').PlayerSummary>>('/players?pageSize=100'),
    enabled: open,
  });

  const candidates = useMemo(() => {
    const taken = new Set(team?.members.map((m) => m.userId));
    return (members?.items ?? []).filter((m) => !taken.has(m.id));
  }, [members, team]);

  const addMutation = useMutation({
    mutationFn: () => post<{ ok: boolean }>(`/teams/${team?.id}/members`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.team(team?.id ?? '') });
      setUserId('');
      onClose();
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  return (
    <Sheet open={open} onClose={onClose} title="Add to squad">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          if (userId) addMutation.mutate();
        }}
      >
        <Field label="Guild member" htmlFor="team-member">
          <Select id="team-member" value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="" disabled>
              Select a member…
            </option>
            {candidates.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </Select>
        </Field>
        {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p> : null}
        <Button type="submit" loading={addMutation.isPending} icon={<UserPlus size={16} />}>
          Add to squad
        </Button>
      </form>
    </Sheet>
  );
}