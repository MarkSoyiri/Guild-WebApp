import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Crosshair, Radio, RefreshCw, Save, Swords, type LucideIcon } from 'lucide-react';
import { ApiError, get, patch, post, uploadAvatar } from '../lib/api';
import { PLAYER_ROLE_LABELS, QUERY_KEYS, REGIONS, type PlayerRole } from '../lib/constants';
import type { FreeFireMatch, Paginated, PlayerDetail, SyncStatus } from '../lib/types';
import { formatDateTime } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { AsyncView, RowSkeleton } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Input';
import { SyncChip } from '../components/ui/SyncChip';
import { EmptyState } from '../components/ui/EmptyState';
import { Reveal } from '../components/ui/Reveal';
import { cn } from '../lib/cn';

export function SettingsPage() {
  const { me } = useAuth();
  const queryClient = useQueryClient();

  const { data: detail, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.player('me'),
    queryFn: () => get<PlayerDetail>('/players/me'),
    enabled: Boolean(me),
  });

  const { data: syncStatus } = useQuery({
    queryKey: QUERY_KEYS.syncStatus,
    queryFn: () => get<SyncStatus>('/freefire/status'),
    enabled: Boolean(me),
  });

  const { data: matches } = useQuery({
    queryKey: QUERY_KEYS.myMatches(1),
    queryFn: () => get<Paginated<FreeFireMatch>>('/players/me/matches?pageSize=10'),
    enabled: Boolean(me),
  });

  return (
    <>
      <PageHeader
        kicker="Command profile"
        title="Settings"
        description="Tune your loadout, link your Free Fire account, and keep your intel fresh."
      />
      <AsyncView isLoading={isLoading} isError={isError} error={error} onRetry={refetch} skeleton={<SettingsSkeleton />}>
        {detail ? (
          <div className="flex flex-col gap-5">
            <Reveal index={0}>
              <IdentityCard detail={detail} />
            </Reveal>
            <div className="hud-divider" aria-hidden />
            <Reveal index={1}>
              <ProfileForm detail={detail} />
            </Reveal>
            <div className="hud-divider" aria-hidden />
            <Reveal index={2}>
              <SyncCard status={syncStatus} lastSyncAt={detail.profile?.lastSyncAt} />
            </Reveal>
            <div className="hud-divider" aria-hidden />
            <Reveal index={3}>
              <MatchIntel matches={matches} />
            </Reveal>
          </div>
        ) : null}
      </AsyncView>
    </>
  );
}

function SectionHeading({ icon: Icon, title, meta }: { icon: LucideIcon; title: string; meta?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-display text-[17px] font-bold text-text">
        <Icon size={16} className="text-accent" aria-hidden />
        {title}
      </h2>
      {meta ? <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{meta}</span> : null}
    </div>
  );
}

function IdentityCard({ detail }: { detail: PlayerDetail }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      await uploadAvatar(file);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.player('me') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(360px_180px_at_0%_0%,black,transparent)]" aria-hidden />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
            <span className="h-1.5 w-1.5 rotate-45 bg-accent" aria-hidden />
            Combat ID
          </p>
          <span className="font-mono text-[11px] tracking-wide text-faint">KO-{detail.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Avatar src={detail.avatarUrl} name={detail.displayName} size={72} />
            <label
              className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-elevated text-muted hover:text-text"
              title="Change avatar"
            >
              <Camera size={13} aria-hidden />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-[19px] font-bold text-text">{detail.displayName}</p>
            <p className="font-mono text-[12px] text-muted">@{detail.username}</p>
            {uploading ? <p className="mt-1 text-[12px] text-accent">Uploading…</p> : null}
            {error ? <p className="mt-1 text-[12px] text-danger">{error}</p> : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3">
          <span className="font-mono text-[12px] text-muted">
            <span className="font-bold uppercase tracking-[0.1em] text-faint">Role </span>
            {detail.guildRole}
          </span>
          <span className="font-mono text-[12px] text-muted">
            <span className="font-bold uppercase tracking-[0.1em] text-faint">XP </span>
            {detail.guildXp.toLocaleString()}
          </span>
          <span className="font-mono text-[12px] text-muted">
            <span className="font-bold uppercase tracking-[0.1em] text-faint">Joined </span>
            {formatDateTime(detail.joinedAt)}
          </span>
        </div>
      </div>
    </Card>
  );
}

function ProfileForm({ detail }: { detail: PlayerDetail }) {
  const queryClient = useQueryClient();
  const profile = detail.profile;
  const [form, setForm] = useState({
    ffUid: profile?.ffUid ?? '',
    ffNickname: profile?.ffNickname ?? '',
    region: profile?.region ?? 'MENA',
    playerRole: (profile?.playerRole ?? 'FLEX') as PlayerRole,
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      ffUid: profile?.ffUid ?? '',
      ffNickname: profile?.ffNickname ?? '',
      region: profile?.region ?? 'MENA',
      playerRole: (profile?.playerRole ?? 'FLEX') as PlayerRole,
    });
  }, [profile?.ffUid, profile?.ffNickname, profile?.region, profile?.playerRole]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await patch<{ ok: boolean }>('/players/me', {
        ffUid: form.ffUid.trim() || null,
        ffNickname: form.ffNickname.trim() || null,
        region: form.region,
        playerRole: form.playerRole,
      });
      if (!form.ffUid.trim()) return null;
      return post<{ status: string; message: string }>('/freefire/sync/me');
    },
    onSuccess: (synced) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.player('me') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myMatches(1) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaderboards });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playerLists });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      setError(null);
      if (synced?.status === 'SKIPPED') {
        setNotice(synced.message);
        setTimeout(() => setNotice(null), 4000);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  return (
    <Card>
      <SectionHeading icon={Crosshair} title="Link your loadout" meta="Game profile" />
      <p className="-mt-1 mb-4 text-[13px] text-muted">Claim your Free Fire UID and role so the board reflects your real game.</p>
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          saveMutation.mutate();
        }}
      >
        <Field label="Free Fire UID" htmlFor="s-uid" hint="Used to pull your stats. Never stored as a credential.">
          <Input id="s-uid" value={form.ffUid} onChange={(e) => setForm({ ...form, ffUid: e.target.value })} maxLength={20} placeholder="e.g. 1234567890" inputMode="numeric" />
        </Field>
        <Field label="In-game name" htmlFor="s-nick">
          <Input id="s-nick" value={form.ffNickname} onChange={(e) => setForm({ ...form, ffNickname: e.target.value })} maxLength={30} placeholder="e.g. ShadowX" />
        </Field>
        <Field label="Region" htmlFor="s-region">
          <Select id="s-region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Player role" htmlFor="s-role">
          <Select id="s-role" value={form.playerRole} onChange={(e) => setForm({ ...form, playerRole: e.target.value as PlayerRole })}>
            {(Object.keys(PLAYER_ROLE_LABELS) as PlayerRole[]).map((role) => (
              <option key={role} value={role}>
                {PLAYER_ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </Field>
        {error ? <p className="sm:col-span-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-[12px] text-danger">{error}</p> : null}
        {notice ? <p className="sm:col-span-2 rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-[12px] text-muted">{notice}</p> : null}
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" loading={saveMutation.isPending} icon={<Save size={15} />}>
            {saveMutation.isPending && form.ffUid.trim() ? 'Saving — pulling intel…' : 'Save profile'}
          </Button>
          {saved ? <span className="text-[12px] font-semibold text-success">Committed — intel updated</span> : null}
        </div>
      </form>
    </Card>
  );
}

function SyncCard({ status, lastSyncAt }: { status: SyncStatus | undefined; lastSyncAt: string | null | undefined }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const syncMutation = useMutation({
    mutationFn: () => post<{ status: string; message: string }>('/freefire/sync/me'),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.player('me') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myMatches(1) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaderboards });
      setError(result.status === 'SKIPPED' ? result.message : null);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Sync failed.');
    },
  });

  return (
    <Card>
      <SectionHeading icon={Radio} title="Sync your stats" meta={status ? `Provider · ${status.label}` : 'Not linked'} />
      <p className="-mt-1 mb-4 text-[13px] text-muted">Pull fresh Free Fire intel — kills, ranks, and placements update on your file.</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[12px] text-muted">
            {lastSyncAt ? (
              <>
                Last sync <span className="text-text">{formatDateTime(lastSyncAt)}</span>
              </>
            ) : (
              'Never synced'
            )}
          </p>
          {status ? <SyncChip provider={status.provider} lastSyncAt={status.me?.lastSyncAt ?? null} className="mt-2" /> : null}
        </div>
        <Button icon={<RefreshCw size={15} />} loading={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
          Sync now
        </Button>
      </div>
      {error ? <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-[12px] text-danger">{error}</p> : null}
    </Card>
  );
}

function MatchIntel({ matches }: { matches: Paginated<FreeFireMatch> | undefined }) {
  return (
    <Card>
      <SectionHeading icon={Swords} title="Match intel" meta="Last 10 drops" />
      {!matches || matches.items.length === 0 ? (
        <EmptyState
          icon={<Crosshair size={22} strokeWidth={1.75} />}
          title="No intel to report"
          description="Sync your stats to pull your match history into the feed."
        />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {matches.items.map((match) => (
            <div key={match.id} className="flex items-center gap-3 py-3">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-[13px] font-bold',
                  match.isWin ? 'border-success/40 bg-success/10 text-success' : 'border-border bg-elevated text-muted',
                )}
                aria-hidden
              >
                {match.isWin ? 'W' : 'L'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-text">
                  {match.mode} <span className="text-faint">·</span> {match.map}
                </p>
                <p className="font-mono text-[11px] text-muted">{formatDateTime(match.playedAt)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[13px] text-text">
                  {match.kills} kills <span className="text-faint">·</span> #{match.rank}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted">{match.isWin ? 'Booyah' : 'Placement'}</p>
              </div>
              {match.mvp ? <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">MVP</span> : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <RowSkeleton rows={2} />
      </Card>
      <div className="hud-divider" aria-hidden />
      <Card>
        <RowSkeleton rows={4} />
      </Card>
      <div className="hud-divider" aria-hidden />
      <Card>
        <RowSkeleton rows={2} />
      </Card>
      <div className="hud-divider" aria-hidden />
      <Card>
        <RowSkeleton rows={3} />
      </Card>
    </div>
  );
}
