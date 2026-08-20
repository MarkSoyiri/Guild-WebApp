import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BellOff, CalendarClock, CheckCheck, Crosshair, Crown, Radio, ShieldAlert, Swords, Trophy, UserPlus, Users, type LucideIcon } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { get, post } from '../lib/api';
import { NOTIFICATION_TYPE_LABELS, QUERY_KEYS } from '../lib/constants';
import type { Notification, Paginated } from '../lib/types';
import { relativeTime } from '../lib/format';
import { AsyncView, RowSkeleton } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/cn';

const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  ACHIEVEMENT: Trophy,
  CHALLENGE: Swords,
  EVENT: CalendarClock,
  TOURNAMENT: Crown,
  TEAM: Users,
  SQUAD: Crosshair,
  SYSTEM: Radio,
  MODERATION: ShieldAlert,
  MEMBERSHIP: UserPlus,
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

type Filter = 'ALL' | 'UNREAD';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('ALL');
  const reducedMotion = useReducedMotion();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.notifications(filter),
    queryFn: () => get<Paginated<Notification>>(`/notifications?pageSize=50${filter === 'UNREAD' ? '&unread=true' : ''}`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
  };

  const readMutation = useMutation({
    mutationFn: (id: string) => post<{ ok: boolean }>(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const readAllMutation = useMutation({
    mutationFn: () => post<{ ok: boolean }>('/notifications/read-all'),
    onSuccess: invalidate,
  });

  const unread = data?.items.filter((n) => !n.read).length ?? 0;

  return (
    <>
      <PageHeader
        kicker="Intel feed"
        title="Notifications"
        description="Every transmission from the guild, in one place."
        actions={
          <Button variant="secondary" size="sm" icon={<CheckCheck size={15} />} loading={readAllMutation.isPending} disabled={unread === 0} onClick={() => readAllMutation.mutate()}>
            Mark all read
          </Button>
        }
      />
      <Tabs<Filter>
        className="mb-5"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'ALL', label: 'All', count: data?.total },
          { value: 'UNREAD', label: 'Unread', count: unread },
        ]}
      />
      <AsyncView
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        skeleton={<RowSkeleton rows={7} />}
        isEmpty={data?.items.length === 0}
        empty={<EmptyState icon={<BellOff size={28} />} title="All clear. Nothing to report." description="No incoming transmissions. Enjoy the quiet." />}
      >
        <motion.div
          variants={listVariants}
          initial={reducedMotion ? false : 'hidden'}
          animate="show"
          className="flex flex-col gap-2"
        >
          {data?.items.map((notification) => (
            <motion.div key={notification.id} variants={rowVariants}>
              <NotificationRow notification={notification} onOpen={() => !notification.read && readMutation.mutate(notification.id)} />
            </motion.div>
          ))}
        </motion.div>
      </AsyncView>
    </>
  );
}

function NotificationRow({ notification, onOpen }: { notification: Notification; onOpen: () => void }) {
  const Icon = NOTIFICATION_ICONS[notification.type] ?? Radio;
  const unread = !notification.read;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-3.5 text-left transition-colors',
        unread ? 'border-border-strong bg-surface' : 'border-border bg-surface',
      )}
    >
      {unread ? <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-accent" aria-hidden /> : null}
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
          unread ? 'border-accent/30 bg-accent/10 text-accent' : 'border-border bg-elevated text-muted',
        )}
        aria-hidden
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-faint">
          <span className={cn('font-bold uppercase tracking-[0.1em]', unread ? 'text-accent' : 'text-muted')}>
            {NOTIFICATION_TYPE_LABELS[notification.type] ?? notification.type}
          </span>
          <span aria-hidden>·</span>
          <span>{relativeTime(notification.createdAt)}</span>
        </p>
        <p className={cn('mt-1 text-[14px] leading-snug', unread ? 'font-bold text-text' : 'font-semibold text-muted')}>{notification.title}</p>
        {notification.body ? <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{notification.body}</p> : null}
        {notification.link ? (
          <span className="mt-1 inline-block text-[12px] font-bold text-accent">
            {notification.link.startsWith('/') ? <Link to={notification.link}>Open intel →</Link> : notification.link}
          </span>
        ) : null}
      </div>
    </button>
  );
}