import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Check, Crown, Eye, EyeOff, Plus, ShieldCheck, TriangleAlert, UserX, X, type LucideIcon } from 'lucide-react';
import { ApiError, del, get, patch, post } from '../lib/api';
import { GUILD_ROLE_LABELS, QUERY_KEYS, type GuildRole } from '../lib/constants';
import type { AdminStats, GuildRoleRow, JoinRequest, Paginated, SeasonRow, SeasonStats } from '../lib/types';
import { formatDate, relativeTime } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { CountUp } from '../components/ui/CountUp';
import { EmptyState } from '../components/ui/EmptyState';
import { StatBlock } from '../components/ui/StatBlock';
import { AsyncView, RowSkeleton } from '../components/ui/PlayerRow';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Input';
import { SyncChip } from '../components/ui/SyncChip';
import { Reveal } from '../components/ui/Reveal';
import { cn } from '../lib/cn';

type AdminTab = 'OVERVIEW' | 'REQUESTS' | 'MEMBERS' | 'MODERATION' | 'ROLES' | 'SEASONS';

interface AdminMemberRow {
  id: string;
  guildRole: GuildRole;
  guildXp: number;
  seasonXp: number;
  joinedAt: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    role: string;
    status: string;
    lastSeenAt: string | null;
    createdAt: string;
    profile: { rank: string; playerRole: string; lastSyncAt: string | null; lastSyncProvider: string | null } | null;
  };
}

export function AdminPage() {
  const { me } = useAuth();
  const [tab, setTab] = useState<AdminTab>('OVERVIEW');
  const canModerate = me?.role === 'SUPER_ADMIN' || me?.role === 'ADMIN' || me?.role === 'MODERATOR';

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-danger">
            <span className="h-1.5 w-1.5 rotate-45 bg-danger" aria-hidden />
            Restricted zone
          </p>
          <h1 className="font-display text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-text sm:text-[34px]">
            Command center
          </h1>
          <p className="max-w-[560px] text-[13px] leading-relaxed text-muted">
            WARNING: admin clearance required — every action here is logged for the record.
          </p>
        </div>
      </header>
      <Tabs<AdminTab>
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'OVERVIEW', label: 'Overview' },
          { value: 'REQUESTS', label: 'Join requests' },
          { value: 'MEMBERS', label: 'Members' },
          { value: 'MODERATION', label: 'Moderation' },
          { value: 'ROLES', label: 'Roles' },
          { value: 'SEASONS', label: 'Seasons' },
        ]}
      />
      {tab === 'OVERVIEW' ? <OverviewTab /> : null}
      {tab === 'REQUESTS' ? <RequestsTab /> : null}
      {tab === 'MEMBERS' ? <MembersTab /> : null}
      {tab === 'MODERATION' ? <ModerationTab /> : null}
      {tab === 'ROLES' ? <RolesTab /> : null}
      {tab === 'SEASONS' ? <SeasonsTab /> : null}
      {!canModerate ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] font-semibold text-warning">
          <TriangleAlert size={14} aria-hidden />
          Limited clearance — stats visible, controls locked.
        </div>
      ) : null}
    </>
  );
}

function PanelHeading({ icon: Icon, title, meta, tone = 'default' }: { icon: LucideIcon; title: string; meta?: string; tone?: 'default' | 'danger' }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-display text-[17px] font-bold text-text">
        <Icon size={16} className={tone === 'danger' ? 'text-danger' : 'text-accent'} aria-hidden />
        {title}
      </h2>
      {meta ? <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{meta}</span> : null}
    </div>
  );
}

function OverviewTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.adminStats,
    queryFn: () => get<AdminStats>('/admin/stats'),
  });

  const snapshotMutation = useMutation({
    mutationFn: () => post<{ ok: boolean }>('/admin/snapshots'),
  });

  return (
    <div className="flex flex-col gap-4">
      <AsyncView isLoading={isLoading} isError={isError} error={error} onRetry={refetch} skeleton={<RowSkeleton rows={3} />}>
        {data ? (
          <>
            <Reveal index={0}>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatBlock label="Members" value={<CountUp value={data.members} />} />
                <StatBlock label="Active (30d)" value={<CountUp value={data.activeMembers} />} />
                <StatBlock label="Pending requests" value={<CountUp value={data.pendingRequests} />} accent={data.pendingRequests > 0} />
                <StatBlock label="Online now" value={<CountUp value={data.online} />} />
                <StatBlock label="Upcoming events" value={<CountUp value={data.upcomingEvents} />} />
                <StatBlock label="Active missions" value={<CountUp value={data.activeChallenges} />} />
                <StatBlock label="Sync failures" value={<CountUp value={data.syncFailures} />} accent={data.syncFailures > 0} />
                <StatBlock label="Last sync" value={data.lastSync ? relativeTime(data.lastSync.at) : '—'} />
              </div>
            </Reveal>
            {data.lastSync ? (
              <Reveal index={1}>
                <SyncChip provider={data.lastSync.provider} lastSyncAt={data.lastSync.at} />
              </Reveal>
            ) : null}
            <Reveal index={2}>
              <Card className="relative overflow-hidden">
                <div className="corner-brackets pointer-events-none absolute inset-0 rounded-xl" aria-hidden />
                <div className="relative">
                  <PanelHeading icon={Camera} title="Freeze the ladder" meta="Season record" />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-[420px] text-[13px] leading-relaxed text-muted">
                      Snapshot the current leaderboard so the season's final standings are locked in for the record.
                    </p>
                    <Button icon={<Camera size={15} />} loading={snapshotMutation.isPending} onClick={() => snapshotMutation.mutate()}>
                      Capture snapshot
                    </Button>
                  </div>
                </div>
              </Card>
            </Reveal>
            <Reveal index={3}>
              <XpAdjustCard />
            </Reveal>
          </>
        ) : null}
      </AsyncView>
    </div>
  );
}

function XpAdjustCard() {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => post<{ ok: boolean }>('/admin/xp', { userId, amount: Number(amount), reason }),
    onSuccess: () => {
      setMessage(`Adjusted ${amount} XP for ${userId}`);
      setAmount('');
      setReason('');
      setUserId('');
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  return (
    <Card className="border-danger/20">
      <PanelHeading icon={TriangleAlert} title="Manual XP override" meta="Use with caution" tone="danger" />
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          if (userId && amount && reason.trim()) mutation.mutate();
        }}
      >
        <Field label="User ID" htmlFor="xp-user" className="sm:flex-1">
          <Input id="xp-user" value={userId} onChange={(e) => setUserId(e.target.value)} required maxLength={40} placeholder="User id" />
        </Field>
        <Field label="Amount" htmlFor="xp-amount" className="sm:w-28">
          <Input id="xp-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min={-100000} max={100000} placeholder="±1000" />
        </Field>
        <Field label="Reason" htmlFor="xp-reason" className="sm:flex-1">
          <Input id="xp-reason" value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={60} placeholder="Caster bonus, penalty…" />
        </Field>
        <Button type="submit" loading={mutation.isPending} variant="secondary">
          Apply
        </Button>
      </form>
      {message ? <p className="mt-2 font-mono text-[12px] font-semibold text-success">{message}</p> : null}
      {error ? <p className="mt-2 font-mono text-[12px] text-danger">{error}</p> : null}
    </Card>
  );
}

function RequestsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.joinRequests,
    queryFn: () => get<JoinRequest[]>('/admin/join-requests'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.joinRequests });

  const approveMutation = useMutation({
    mutationFn: (id: string) => post<{ ok: boolean }>(`/admin/join-requests/${id}/approve`),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => post<{ ok: boolean }>(`/admin/join-requests/${id}/reject`),
    onSuccess: invalidate,
  });

  return (
    <AsyncView
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      skeleton={<RowSkeleton rows={4} />}
      isEmpty={data?.length === 0}
      empty={
        <EmptyState
          icon={<Check size={22} strokeWidth={1.75} />}
          title="Gate is clear"
          description="No recruits are waiting to be vetted right now."
        />
      }
    >
      {data ? (
        <div className="flex flex-col gap-3">
          {data.map((request, index) => (
            <Reveal index={index} key={request.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar src={request.user.avatarUrl} name={request.user.displayName} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-text">{request.user.displayName}</p>
                      <span className="rounded border border-warning/30 bg-warning/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-warning">
                        Pending
                      </span>
                    </div>
                    <p className="font-mono text-[12px] text-muted">
                      @{request.user.username} · applied {relativeTime(request.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" icon={<Check size={14} />} loading={approveMutation.isPending} onClick={() => approveMutation.mutate(request.id)}>
                      Approve
                    </Button>
                    <Button variant="danger" size="sm" icon={<X size={14} />} loading={rejectMutation.isPending} onClick={() => rejectMutation.mutate(request.id)}>
                      Reject
                    </Button>
                  </div>
                </div>
                {request.message ? (
                  <p className="mt-2 rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-[12px] text-muted">{request.message}</p>
                ) : null}
              </Card>
            </Reveal>
          ))}
        </div>
      ) : null}
    </AsyncView>
  );
}

function MembersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [guildRole, setGuildRole] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.players(`admin:${debounced}:${guildRole}`),
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: '50' });
      if (debounced) params.set('search', debounced);
      if (guildRole) params.set('guildRole', guildRole);
      return get<Paginated<AdminMemberRow>>(`/admin/members?${params.toString()}`);
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.players('') });

  const guildRoleMutation = useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: GuildRole }) =>
      patch<{ ok: boolean }>(`/admin/members/${membershipId}/guild-role`, { guildRole: role }),
    onSuccess: invalidate,
  });

  const userRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => patch<{ ok: boolean }>(`/admin/members/${userId}/role`, { role }),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => del<{ ok: boolean }>(`/admin/members/${userId}`),
    onSuccess: invalidate,
  });

  const MEMBER_TEMPLATE = 'md:grid md:grid-cols-[2.5rem_minmax(0,1fr)_7rem_8.5rem_8.5rem_2.5rem] md:items-center md:gap-3';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-faint">
          <span className="h-1 w-1 rotate-45 bg-faint" aria-hidden />
          Filter roster
        </p>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search callsign…" className="sm:max-w-[240px]" />
        <Select value={guildRole} onChange={(e) => setGuildRole(e.target.value)} className="sm:max-w-[220px]">
          <option value="">All guild roles</option>
          {(['LEADER', 'OFFICER', 'MODERATOR', 'MEMBER', 'TRIAL'] as GuildRole[]).map((role) => (
            <option key={role} value={role}>
              {GUILD_ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      </div>
      <AsyncView
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        skeleton={<RowSkeleton rows={8} />}
        isEmpty={data?.items.length === 0}
        empty={<p className="py-10 text-center text-[13px] text-muted">No intel on that filter — widen your search.</p>}
      >
        {data ? (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className={cn('hidden border-b border-border bg-elevated/40 px-4 py-2', MEMBER_TEMPLATE)}>
              <span aria-hidden />
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint">Member</span>
              <span className="text-right text-[11px] font-bold uppercase tracking-[0.1em] text-faint">Season XP</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint">Guild role</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint">Access</span>
              <span aria-hidden />
            </div>
            <div className="flex flex-col divide-y divide-border">
              {data.items.map((membership) => (
                <div key={membership.id} className={cn('px-4 py-3 transition-colors hover:bg-elevated/30', MEMBER_TEMPLATE)}>
                  <div className="flex items-center gap-3 md:col-span-2">
                    <Avatar src={membership.user.avatarUrl} name={membership.user.displayName} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-text">{membership.user.displayName}</p>
                      <p className="truncate font-mono text-[11px] text-muted">@{membership.user.username}</p>
                    </div>
                  </div>
                  <p className="mt-3 font-mono text-[13px] text-text md:mt-0 md:text-right">
                    {membership.seasonXp.toLocaleString()}
                    <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-faint">XP</span>
                  </p>
                  <Select
                    className="mt-2 h-9 w-full px-2.5 text-[12px] md:mt-0"
                    value={membership.guildRole}
                    onChange={(e) => guildRoleMutation.mutate({ membershipId: membership.id, role: e.target.value as GuildRole })}
                  >
                    {(['LEADER', 'OFFICER', 'MODERATOR', 'MEMBER', 'TRIAL'] as GuildRole[]).map((role) => (
                      <option key={role} value={role}>
                        {GUILD_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </Select>
                  <Select
                    className="mt-2 h-9 w-full px-2.5 text-[12px] md:mt-0"
                    value={membership.user.role}
                    onChange={(e) => userRoleMutation.mutate({ userId: membership.user.id, role: e.target.value })}
                  >
                    {['SUPER_ADMIN', 'GUILD_ADMIN', 'MODERATOR', 'MEMBER'].map((role) => (
                      <option key={role} value={role}>
                        {role === 'GUILD_ADMIN' ? 'Admin' : role === 'SUPER_ADMIN' ? 'Super admin' : role[0] + role.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </Select>
                  <div className="mt-2 md:mt-0 md:justify-self-end">
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<UserX size={14} />}
                      loading={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(membership.user.id)}
                      aria-label={`Remove ${membership.user.displayName}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </AsyncView>
    </div>
  );
}

interface AdminPostRow {
  id: string;
  authorId: string;
  content: string;
  status: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl: string | null };
}

function ModerationTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.moderation('all'),
    queryFn: () => get<{ posts: AdminPostRow[]; hiddenPosts: AdminPostRow[] }>('/admin/moderation'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, hide }: { id: string; hide: boolean }) => patch<{ ok: boolean }>(`/admin/moderation/posts/${id}`, { hide }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moderation('all') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts('') });
    },
  });

  return (
    <AsyncView
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      skeleton={<RowSkeleton rows={5} />}
      isEmpty={!data?.posts.length && !data?.hiddenPosts.length}
      empty={
        <EmptyState
          icon={<EyeOff size={22} strokeWidth={1.75} />}
          title="Clean comms"
          description="No posts need your attention — the feed is clear."
        />
      }
    >
      {data ? (
        <div className="flex flex-col gap-5">
          {data.hiddenPosts.length > 0 ? (
            <Section title="Hidden" count={data.hiddenPosts.length}>
              {data.hiddenPosts.map((item) => (
                <PostModRow key={item.id} item={item} hidden toggleMutation={toggleMutation} />
              ))}
            </Section>
          ) : null}
          <Section title="Published" count={data.posts.length}>
            {data.posts.map((item) => (
              <PostModRow key={item.id} item={item} hidden={false} toggleMutation={toggleMutation} />
            ))}
          </Section>
        </div>
      ) : null}
    </AsyncView>
  );
}

function PostModRow({ item, hidden, toggleMutation }: { item: AdminPostRow; hidden: boolean; toggleMutation: { isPending: boolean; mutate: (vars: { id: string; hide: boolean }) => void } }) {
  return (
    <Card className={cn('hover:border-border', hidden && 'border-danger/25')}>
      <div className="flex flex-wrap items-start gap-3">
        <Avatar src={item.author.avatarUrl} name={item.author.displayName} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-text">{item.author.displayName}</p>
            <span
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide',
                hidden ? 'border-danger/30 bg-danger/10 text-danger' : 'border-success/30 bg-success/10 text-success',
              )}
            >
              {hidden ? 'Hidden' : 'Published'}
            </span>
            <span className="font-mono text-[11px] text-faint">{relativeTime(item.createdAt)}</span>
          </div>
          <p className="mt-1 line-clamp-3 text-[13px] text-muted">{item.content || '—'}</p>
        </div>
        <Button
          variant={hidden ? 'secondary' : 'danger'}
          size="sm"
          icon={hidden ? <Eye size={14} /> : <EyeOff size={14} />}
          loading={toggleMutation.isPending}
          onClick={() => toggleMutation.mutate({ id: item.id, hide: !hidden })}
        >
          {hidden ? 'Restore' : 'Hide'}
        </Button>
      </div>
    </Card>
  );
}

function RolesTab() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: QUERY_KEYS.adminRoles,
    queryFn: () => get<GuildRoleRow[]>('/admin/roles'),
  });

  const createMutation = useMutation({
    mutationFn: () => post<{ ok: boolean }>('/admin/roles', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminRoles });
      setName('');
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <PanelHeading icon={Plus} title="Create custom role" meta="Add a rank to the ladder" />
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            if (name.trim().length >= 2) createMutation.mutate();
          }}
        >
          <Input className="flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="New role name…" maxLength={30} />
          <Button type="submit" icon={<Plus size={15} />} loading={createMutation.isPending}>
            Add role
          </Button>
        </form>
        {error ? <p className="mt-2 font-mono text-[12px] text-danger">{error}</p> : null}
      </Card>
      <AsyncView
        isLoading={isLoading}
        isError={isError}
        error={queryError}
        onRetry={refetch}
        skeleton={<RowSkeleton rows={4} />}
        isEmpty={data?.length === 0}
        empty={
          <EmptyState
            icon={<ShieldCheck size={22} strokeWidth={1.75} />}
            title="No custom roles"
            description="Stock ranks hold the line — create one to add custom flags."
          />
        }
      >
        {data ? (
          <div className="flex flex-col gap-2">
            {data.map((role) => (
              <Card key={role.name}>
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-text">
                    <ShieldCheck size={15} className="text-accent" aria-hidden /> {role.name}
                  </p>
                  <span className="font-mono text-[11px] text-faint">
                    {role.permissions.length} flag{role.permissions.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {role.permissions.map((permission) => (
                    <span key={permission} className="rounded border border-border bg-elevated px-2 py-0.5 font-mono text-[10px] text-muted">
                      {permission}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </AsyncView>
    </div>
  );
}

function SeasonsTab() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.seasons,
    queryFn: () => get<{ history: SeasonRow[]; active: { id: string; number: number; name: string; endsAt: string } | null }>('/admin/seasons'),
  });

  const { data: stats } = useQuery({
    queryKey: QUERY_KEYS.leaderboard('season-stats', selectedId ?? ''),
    queryFn: () => get<SeasonStats>(`/admin/seasons/${selectedId}/stats`),
    enabled: Boolean(selectedId),
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => post<{ ok: boolean }>(`/admin/seasons/${id}/end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.seasons });
      setSelectedId(null);
    },
  });

  return (
    <AsyncView
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      skeleton={<RowSkeleton rows={4} />}
      isEmpty={!data}
      empty={
        <EmptyState
          icon={<Crown size={22} strokeWidth={1.75} />}
          title="No season records"
          description="Nothing on file yet — capture a snapshot to start the record."
        />
      }
    >
      {data ? (
        <div className="flex flex-col gap-4">
          {data.active ? (
            <Card className="border-accent/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-accent">
                    <span className="relative flex h-1.5 w-1.5" aria-hidden>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                    </span>
                    Active season · LIVE
                  </p>
                  <p className="mt-1 font-display text-[17px] font-semibold text-text">
                    Season {data.active.number} — {data.active.name}
                  </p>
                  <p className="font-mono text-[12px] text-muted">Ends {formatDate(data.active.endsAt)}</p>
                </div>
                <Button variant="danger" size="sm" loading={endMutation.isPending} onClick={() => endMutation.mutate(data.active!.id)}>
                  End season
                </Button>
              </div>
            </Card>
          ) : null}
          <Card>
            <PanelHeading icon={Crown} title="Season records" meta={`${data.history.length} on file`} />
            <div className="flex flex-col divide-y divide-border">
              {data.history.map((season) => (
                <div key={season.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-text">
                      Season {season.number} — {season.name}
                    </p>
                    <p className="font-mono text-[12px] text-muted">
                      {formatDate(season.startsAt)} → {season.endedAt ? formatDate(season.endedAt) : 'ongoing'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted">
                      {season.status.toLowerCase()}
                    </span>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedId(selectedId === season.id ? null : season.id)}>
                      {selectedId === season.id ? 'Hide stats' : 'Stats'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          {selectedId ? <SeasonStatsPanel stats={stats} /> : null}
        </div>
      ) : null}
    </AsyncView>
  );
}

function SeasonStatsPanel({ stats }: { stats: SeasonStats | undefined }) {
  if (!stats) return <p className="py-4 text-center font-mono text-[12px] text-muted">Loading…</p>;
  return (
    <Card>
      <p className="mb-2 font-mono text-[12px] font-semibold uppercase tracking-wide text-muted">
        Top members · {stats.snapshots.length} snapshot{stats.snapshots.length === 1 ? '' : 's'}
      </p>
      <div className="flex flex-col gap-1.5">
        {stats.topMembers.map((member, index) => (
          <div key={member.id} className="flex items-center gap-3 rounded-lg bg-elevated px-3 py-2">
            <span className="font-mono text-[12px] font-bold text-accent">#{index + 1}</span>
            <Avatar src={member.avatarUrl} name={member.displayName} size={24} />
            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text">{member.displayName}</p>
            <span className="font-mono text-[12px] text-muted">{member.seasonXp.toLocaleString()} XP</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 font-display text-[13px] font-bold uppercase tracking-wide text-muted">
        {title}
        <span className="rounded bg-elevated px-1.5 font-mono text-[11px] text-text">{count}</span>
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
