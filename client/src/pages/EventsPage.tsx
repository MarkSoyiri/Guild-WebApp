import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarClock, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { get } from '../lib/api';
import { QUERY_KEYS } from '../lib/constants';
import type { Event as EventModel, Paginated } from '../lib/types';
import { formatDateTime } from '../lib/format';
import { AsyncView } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CountUp } from '../components/ui/CountUp';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { EventStatusBadge, EventTypeChip } from '../features/events/badges';

type EventStatusFilter = 'UPCOMING' | 'ONGOING' | 'PAST' | 'ALL';

const statusLabels: Record<EventStatusFilter, string> = {
  UPCOMING: 'Upcoming',
  ONGOING: 'Ongoing',
  PAST: 'Past',
  ALL: 'All',
};

export function EventsPage() {
  const [filter, setFilter] = useState<EventStatusFilter>('UPCOMING');

  const params = new URLSearchParams({ pageSize: '50' });
  if (filter === 'UPCOMING') params.set('upcoming', 'true');
  if (filter === 'PAST') params.set('status', 'COMPLETED');
  if (filter === 'ONGOING') params.set('status', 'ONGOING');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.events(params.toString()),
    queryFn: () => get<Paginated<EventModel>>(`/events?${params.toString()}`),
  });

  return (
    <>
      <PageHeader
        kicker={data ? `EVENT BRIEFING · ${data.total} ${statusLabels[filter].toUpperCase()}` : 'EVENT BRIEFING'}
        title="Event briefing"
        description="Custom rooms, scrims, meetings — read the intel, pick your drop, lock in."
      />
      <Tabs<EventStatusFilter>
        className="mb-5"
        value={filter}
        onChange={setFilter}
        tabs={(['UPCOMING', 'ONGOING', 'PAST', 'ALL'] as EventStatusFilter[]).map((value) => ({
          value,
          label: statusLabels[value],
        }))}
      />
      <div className="flex flex-col gap-3">
        <AsyncView
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          skeleton={<EventSkeleton />}
          isEmpty={data?.items.length === 0}
          empty={
            <EmptyState
              icon={<CalendarClock size={24} />}
              title="NO EVENTS SCHEDULED. YET."
              description="The calendar is clear — for now. New briefings drop the moment the guild rallies."
            />
          }
        >
          {data?.items.map((event, index) => <EventCard key={event.id} event={event} index={index} />)}
        </AsyncView>
      </div>
    </>
  );
}

function EventCard({ event, index }: { event: EventModel; index: number }) {
  const reducedMotion = useReducedMotion();
  const live = event.status === 'ONGOING';
  const count = event.participants.length;
  const max = event.maxParticipants;
  const full = max !== null && count >= max;
  const percent = max !== null ? Math.min(Math.round((count / max) * 100), 100) : 0;
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: index * 0.05 }}
    >
      <Card className="relative overflow-hidden">
        <div className="corner-brackets pointer-events-none absolute inset-0 rounded-xl" aria-hidden />
        <div className="relative flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <EventTypeChip type={event.type} />
            <EventStatusBadge status={event.status} />
          </div>
          <div className="min-w-0">
            <Link
              to={`/app/events/${event.id}`}
              className="block truncate font-display text-[18px] font-bold leading-snug text-text transition-colors hover:text-accent"
            >
              {event.title}
            </Link>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[12px] text-muted">
              <CalendarClock size={13} aria-hidden />
              {formatDateTime(event.startsAt)} → {formatDateTime(event.endsAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ProgressBar percent={percent} complete={full} className="flex-1" />
            <span className="flex shrink-0 items-center gap-1.5 font-mono text-[12px] text-text">
              <Users size={13} className="text-muted" aria-hidden />
              <CountUp value={count} />/{max ?? '∞'}
            </span>
          </div>
          <div className="hud-divider" aria-hidden />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              {live ? 'Drop is live' : full ? 'Roster locked' : max !== null ? `${max - count} slot${max - count === 1 ? '' : 's'} left` : 'Open roster'}
            </span>
            <Link to={`/app/events/${event.id}`}>
              <Button variant={live || full ? 'secondary' : 'primary'} size="sm">
                {live ? 'Spectate' : full ? 'Details' : 'Lock in'}
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function EventSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <Card key={i}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}