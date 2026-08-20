import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Crosshair, LogOut, MapPin, Users } from 'lucide-react';
import { get, post } from '../lib/api';
import { QUERY_KEYS } from '../lib/constants';
import type { Event } from '../lib/types';
import { formatDateTime } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { AsyncView, RowSkeleton } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { ErrorPanel } from '../components/ui/ErrorPanel';
import { CountUp } from '../components/ui/CountUp';
import { EmptyState } from '../components/ui/EmptyState';
import { EventStatusBadge, EventTypeChip } from '../features/events/badges';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.event(id ?? ''),
    queryFn: () => get<Event>(`/events/${id}`),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event(id ?? '') });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events('') });
  };

  const joinMutation = useMutation({
    mutationFn: () => post<{ ok: boolean }>(`/events/${id}/join`),
    onSuccess: invalidate,
  });

  const leaveMutation = useMutation({
    mutationFn: () => post<{ ok: boolean }>(`/events/${id}/leave`),
    onSuccess: invalidate,
  });

  if (isError) {
    return <ErrorPanel message="Event not found." onRetry={refetch} />;
  }

  const count = data ? (data.participantCount ?? data.participants.length) : 0;
  const full = Boolean(data?.maxParticipants) && count >= (data?.maxParticipants ?? 0);
  const actionable = data?.status === 'ONGOING' || data?.status === 'SCHEDULED';

  return (
    <>
      <PageHeader
        kicker="MISSION BRIEFING"
        title="Event briefing"
        description="Read the intel, check the roster, and lock in before the drop."
        actions={
          <Link to="/app/events">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />}>
              All briefings
            </Button>
          </Link>
        }
      />
      <AsyncView isLoading={isLoading} isError={isError} error={error} onRetry={refetch} skeleton={<RowSkeleton rows={4} />}>
        {data ? (
          <div className="flex flex-col gap-6">
            <section className="relative overflow-hidden rounded-xl border border-border">
              <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(560px_240px_at_20%_0%,black,transparent)]" aria-hidden />
              <div className="corner-brackets pointer-events-none absolute inset-0 rounded-xl" aria-hidden />
              <div className="relative flex flex-col gap-4 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <EventTypeChip type={data.type} />
                    <EventStatusBadge status={data.status} />
                  </div>
                  {actionable ? (
                    data.joined ? (
                      <Button variant="secondary" icon={<LogOut size={16} />} loading={leaveMutation.isPending} onClick={() => leaveMutation.mutate()}>
                        Back out
                      </Button>
                    ) : (
                      <Button icon={<Crosshair size={16} />} loading={joinMutation.isPending} disabled={full} onClick={() => joinMutation.mutate()}>
                        {full ? 'Roster locked' : 'Lock in'}
                      </Button>
                    )
                  ) : null}
                </div>

                <div className="min-w-0">
                  <h2 className="text-balance font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-text sm:text-[32px]">
                    {data.title}
                  </h2>
                  <p className="mt-2 flex items-center gap-1.5 font-mono text-[13px] text-muted">
                    <CalendarClock size={14} aria-hidden />
                    {formatDateTime(data.startsAt)} → {formatDateTime(data.endsAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                  {data.location ? (
                    <p className="flex items-center gap-1.5 text-[13px] text-muted">
                      <MapPin size={14} aria-hidden /> {data.location}
                    </p>
                  ) : null}
                  {data.mode ? (
                    <p className="flex items-center gap-1.5 text-[13px] text-muted">
                      <Crosshair size={14} aria-hidden /> {data.mode}
                    </p>
                  ) : null}
                  <p className="flex items-center gap-1.5 text-[13px] text-muted">
                    Briefed by <span className="font-semibold text-text">{data.organizer.displayName}</span>
                  </p>
                </div>

                <div className="hud-divider" aria-hidden />

                {data.description ? (
                  <p className="max-w-[680px] text-[14px] leading-relaxed text-muted">{data.description}</p>
                ) : (
                  <p className="text-[13px] text-faint">No intel filed for this briefing.</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[12px] text-muted">
                    <Users size={14} aria-hidden /> roster <CountUp value={count} />/{data.maxParticipants ?? '∞'}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                    {data.status === 'COMPLETED' ? 'Operation complete' : data.status === 'CANCELLED' ? 'Operation scrubbed' : 'Secure your slot'}
                  </span>
                </div>
              </div>
            </section>

            <Card className="hover:border-border">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display text-[17px] font-bold text-text">
                  <Users size={16} className="text-accent" aria-hidden /> Who's going?
                </h3>
                <span className="font-mono text-[13px] text-muted">
                  <CountUp value={count} />/{data.maxParticipants ?? '∞'}
                </span>
              </div>
              <div className="hud-divider my-3" aria-hidden />
              {data.participants.length === 0 ? (
                <EmptyState
                  icon={<Users size={24} />}
                  title="NO ONE LOCKED IN YET."
                  description="Be first on the drop list — the squad respects early commits."
                />
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {data.participants.map((participant) => {
                    const isMe = participant.userId === me?.id;
                    return (
                      <Link
                        key={participant.id}
                        to={`/app/players/${participant.userId}`}
                        className="flex items-center gap-3 rounded-lg border border-border p-2.5 transition-colors hover:border-border-strong"
                      >
                        <Avatar src={participant.user.avatarUrl} name={participant.user.displayName} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-text">{participant.user.displayName}</p>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-accent">
                            {isMe ? "You're on the list" : 'Locked in'}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        ) : null}
      </AsyncView>
    </>
  );
}