import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crosshair, LogIn, LogOut, Mic, MicOff, Plus, X } from 'lucide-react';
import { get, post } from '../lib/api';
import { PLAYER_ROLE_LABELS, QUERY_KEYS, RANKS, RANK_LABELS, type PlayerRole, type Rank } from '../lib/constants';
import type { Paginated, SquadRequest } from '../lib/types';
import { relativeTime } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { AsyncView, RowSkeleton } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Field, Select, Textarea } from '../components/ui/Input';
import { Sheet } from '../components/ui/Sheet';
import { EmptyState } from '../components/ui/EmptyState';
import { RankBadge, RoleBadge } from '../components/ui/Badges';
import { cn } from '../lib/cn';

type Filter = 'OPEN' | 'FULL' | 'CLOSED';

const FILTER_LABELS: Record<Filter, string> = {
  OPEN: 'Open',
  FULL: 'Filled',
  CLOSED: 'Closed',
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'border-success/40 bg-success/10 text-success',
  FULL: 'border-electric/30 bg-electric/10 text-electric',
  CLOSED: 'border-border bg-elevated text-muted',
  EXPIRED: 'border-border bg-elevated text-faint',
};

export function SquadPage() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('OPEN');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.squad(filter),
    queryFn: () => get<Paginated<SquadRequest>>(`/squad?status=${filter}`),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['squad'] });

  const joinMutation = useMutation({
    mutationFn: (id: string) => post<{ ok: boolean }>(`/squad/${id}/join`),
    onSuccess: invalidate,
  });

  const leaveMutation = useMutation({
    mutationFn: (id: string) => post<{ ok: boolean }>(`/squad/${id}/leave`),
    onSuccess: invalidate,
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => post<{ ok: boolean }>(`/squad/${id}/close`),
    onSuccess: invalidate,
  });

  const myRequests = data?.items.filter((r) => r.userId === me?.id) ?? [];

  return (
    <>
      <PageHeader
        kicker="HUMAN RESOURCES · SQUAD REQUEST QUEUE"
        title="Squad requests"
        description="Recruiters, screen the queue. Join a run, fill the slots, close it out once the squad is locked."
        actions={
          <Button icon={<Plus size={17} />} onClick={() => setCreateOpen(true)}>
            Post request
          </Button>
        }
      />
      <Tabs<Filter>
        className="mb-5"
        value={filter}
        onChange={setFilter}
        tabs={(['OPEN', 'FULL', 'CLOSED'] as Filter[]).map((value) => ({ value, label: FILTER_LABELS[value] }))}
      />
      <AsyncView
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        skeleton={<RowSkeleton rows={5} />}
        isEmpty={data?.items.length === 0}
        empty={
          <EmptyState
            icon={<Crosshair size={26} />}
            title="NO PENDING REQUESTS. SQUAD IS CLEAN."
            description="Post a squad request and the queue fills in minutes."
            action={
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
                Post request
              </Button>
            }
          />
        }
      >
        {data?.items.length ? (
          <div className="flex flex-col gap-3">
            {data.items.map((request) => {
              const isMine = request.userId === me?.id;
              const amIn = request.participants.some((p) => p.userId === me?.id);
              const filled = request.participants.length >= request.playersNeeded;
              const slotsLeft = Math.max(request.playersNeeded - request.participants.length, 0);
              return (
                <Card key={request.id} className="relative overflow-hidden">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar src={request.user.avatarUrl} name={request.user.displayName} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-text">
                          {request.user.displayName}
                          {isMine ? <span className="ml-1.5 text-[11px] text-accent">(you)</span> : null}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <RoleBadge role={request.role} />
                          <RankBadge rank={request.rank} />
                          <span className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted">
                            {request.mic ? <Mic size={12} className="text-success" aria-hidden /> : <MicOff size={12} aria-hidden />}
                            {request.mic ? 'Mic on' : 'No mic'}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            'rounded-lg border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide',
                            STATUS_STYLES[request.status] ?? 'border-border bg-elevated text-muted',
                          )}
                        >
                          {request.status}
                        </span>
                        <span className="font-mono text-[12px] text-text">
                          {request.participants.length}/{request.playersNeeded}
                        </span>
                      </div>
                    </div>

                    {request.note ? (
                      <p className="rounded-lg border border-border bg-bg-2 px-3 py-2 text-[13px] leading-relaxed text-muted">{request.note}</p>
                    ) : (
                      <p className="text-[12px] text-faint">No briefing note filed.</p>
                    )}

                    <div className="hud-divider" aria-hidden />

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {request.participants.map((participant) => (
                          <Avatar key={participant.id} src={participant.user.avatarUrl} name={participant.user.displayName} size={26} />
                        ))}
                      </div>
                      <span className="text-[12px] text-muted">
                        {request.participants.length === 0 ? 'No one yet' : `${request.participants.length} locked in`} · posted{' '}
                        {relativeTime(request.createdAt)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                        {filled ? 'Squad full' : `Recruiting ${slotsLeft} more`}
                      </span>
                      <div className="flex gap-2">
                        {isMine ? (
                          <Button variant="danger" size="sm" icon={<X size={14} />} loading={closeMutation.isPending} onClick={() => closeMutation.mutate(request.id)}>
                            Close
                          </Button>
                        ) : amIn ? (
                          <Button variant="secondary" size="sm" icon={<LogOut size={14} />} loading={leaveMutation.isPending} onClick={() => leaveMutation.mutate(request.id)}>
                            Leave
                          </Button>
                        ) : (
                          <Button size="sm" icon={<LogIn size={14} />} loading={joinMutation.isPending} disabled={filled} onClick={() => joinMutation.mutate(request.id)}>
                            {filled ? 'Full' : 'Join'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}
      </AsyncView>
      {myRequests.length > 0 ? (
        <p className="mt-4 flex items-center gap-1.5 text-[12px] text-muted">
          <Crosshair size={13} className="text-accent" aria-hidden />
          You have {myRequests.length} open post{myRequests.length > 1 ? 's' : ''} — close it once your squad is locked.
        </p>
      ) : null}
      <CreateSquadSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

function CreateSquadSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ role: 'RUSHER' as PlayerRole, rank: 'GOLD' as Rank, mic: true, playersNeeded: '1', note: '' });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      post<{ id: string }>('/squad', {
        role: form.role,
        rank: form.rank,
        mic: form.mic,
        playersNeeded: Number(form.playersNeeded),
        note: form.note || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad'] });
      onClose();
      setForm({ role: 'RUSHER', rank: 'GOLD', mic: true, playersNeeded: '1', note: '' });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  return (
    <Sheet open={open} onClose={onClose} title="Post a squad">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          createMutation.mutate();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role" htmlFor="s-role">
            <Select id="s-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as PlayerRole })}>
              {(Object.keys(PLAYER_ROLE_LABELS) as PlayerRole[]).map((role) => (
                <option key={role} value={role}>
                  {PLAYER_ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Min. rank" htmlFor="s-rank">
            <Select id="s-rank" value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value as Rank })}>
              {RANKS.map((rank) => (
                <option key={rank} value={rank}>
                  {RANK_LABELS[rank]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Players needed" htmlFor="s-need">
            <Select id="s-need" value={form.playersNeeded} onChange={(e) => setForm({ ...form, playersNeeded: e.target.value })}>
              {[1, 2, 3].map((n) => (
                <option key={n} value={String(n)}>
                  {n} more
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mic" htmlFor="s-mic">
            <Select id="s-mic" value={form.mic ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, mic: e.target.value === 'yes' })}>
              <option value="yes">Required</option>
              <option value="no">Optional</option>
            </Select>
          </Field>
        </div>
        <Field label="Note" htmlFor="s-note">
          <Textarea id="s-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={200} rows={3} placeholder="Squad goal, game mode, schedule…" />
        </Field>
        {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p> : null}
        <Button type="submit" loading={createMutation.isPending} icon={<Plus size={17} />}>
          Post request
        </Button>
      </form>
    </Sheet>
  );
}