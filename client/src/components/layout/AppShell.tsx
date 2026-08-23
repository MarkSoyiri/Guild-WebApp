import {
  Award,
  Bell,
  Crosshair,
  Crown,
  Dumbbell,
  FileSearch,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { ProgressBar } from '../ui/ProgressBar';
import { Sheet } from '../ui/Sheet';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api';
import { POLL, QUERY_KEYS } from '../../lib/constants';
import type { Paginated, Post } from '../../lib/types';
import {
  communityActivityOf,
  hasNewCommunityActivity,
  markCommunitySeen,
  readCommunitySeen,
} from '../../lib/communitySeen';
import { Button } from '../ui/Button';
import { HudSweep } from '../ui/HudSweep';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  mobileLabel?: string;
}

const MAIN_NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/players', label: 'Players', icon: Users },
  { to: '/app/leaderboard', label: 'Leaderboard', icon: Trophy, mobileLabel: 'Ladder' },
  { to: '/app/events', label: 'Events', icon: Dumbbell },
  { to: '/app/squad', label: 'Squad', icon: Crosshair },
];

const COMPETE_NAV: NavItem[] = [
  { to: '/app/teams', label: 'Teams', icon: Swords },
  { to: '/app/tournaments', label: 'Tournaments', icon: Crown },
  { to: '/app/challenges', label: 'Challenges', icon: Award },
  { to: '/app/achievements', label: 'Achievements', icon: Trophy },
];

const COMMUNITY_NAV: NavItem[] = [
  { to: '/app/community', label: 'Community', icon: MessageSquare },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/search', label: 'Search', icon: FileSearch },
];

export function AppShell() {
  const { me } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const { data: unread } = useQuery({
    queryKey: QUERY_KEYS.unreadCount,
    queryFn: () => get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: POLL.unreadCount,
  });
  const { data: activity } = useQuery({
    queryKey: QUERY_KEYS.communityActivity,
    queryFn: () => get<Paginated<Post>>('/community/posts?pageSize=5'),
    refetchInterval: POLL.communityActivity,
  });
  const onCommunity = location.pathname.startsWith('/app/community');
  const currentActivity = communityActivityOf(activity?.items ?? []);
  const seen = readCommunitySeen();
  const hasCommunityNews = !onCommunity && seen !== null && hasNewCommunityActivity(currentActivity, seen);
  const newPostCount = seen ? (activity?.items ?? []).filter((post) => post.createdAt > seen.newestAt).length : 0;

  useEffect(() => {
    if (!currentActivity.newestAt) return;
    const stored = readCommunitySeen();
    if (!stored) {
      markCommunitySeen(currentActivity);
      return;
    }
    if (onCommunity && hasNewCommunityActivity(currentActivity, stored)) {
      markCommunitySeen(currentActivity);
    }
  });

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-border bg-panel lg:flex">
        <Brand />
        <Link
          to="/app/community"
          className="relative mx-3 mt-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-gradient-to-r from-accent/15 to-transparent p-2.5 transition-colors hover:border-accent/50"
        >
          {hasCommunityNews ? (
            <span className="absolute right-3 top-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-on-accent">
              {newPostCount > 0 ? newPostCount : '•'}
            </span>
          ) : null}
          <span className="clip-notch-sm flex h-9 w-9 shrink-0 items-center justify-center bg-gradient-to-br from-accent to-accent-2 text-on-accent">
            <MessageSquare size={16} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="font-display text-[13px] font-bold text-text">Community</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Guild feed · live</span>
          </span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Primary">
          <NavSection title="Main" items={MAIN_NAV} />
          <NavSection title="Compete" items={COMPETE_NAV} />
          <NavSection title="Community" items={COMMUNITY_NAV} />
          {me?.role === 'SUPER_ADMIN' || me?.role === 'ADMIN' ? (
            <NavSection title="Admin" items={[{ to: '/app/admin', label: 'Admin panel', icon: Crown }]} />
          ) : null}
        </nav>
        <SidebarProfile />
      </aside>

      <div className="lg:pl-[232px]">
        <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur-sm lg:hidden">
          <div className="safe-t" aria-hidden />
          <div className="flex h-14 items-center justify-between px-4">
          <Link to="/app" className="flex items-center gap-2">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/app/community"
              className="relative rounded-lg p-2.5 text-muted transition-colors hover:text-text"
              aria-label="Community"
            >
              <MessageSquare size={20} />
              {hasCommunityNews ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-on-accent">
                  {newPostCount > 0 ? newPostCount : '•'}
                </span>
              ) : null}
            </Link>
            <Link
              to="/app/notifications"
              className="relative rounded-lg p-2.5 text-muted transition-colors hover:text-text"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unread && unread.count > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-on-accent">
                  {unread.count > 99 ? '99' : unread.count}
                </span>
              ) : null}
            </Link>
            <Link to="/app/settings" className="rounded-lg p-1" aria-label="Settings">
              <Avatar src={me?.avatarUrl} name={me?.displayName ?? 'Me'} size={32} />
            </Link>
          </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          <motion.div
            key={location.pathname}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative"
          >
            <HudSweep className="h-[65vh]" delay={0.02} duration={0.4} />
            <OutletContent />
          </motion.div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur-sm lg:hidden safe-b" aria-label="Mobile">
        <div className="grid h-[60px] grid-cols-6">
          {MAIN_NAV.map((item) => (
            <MobileTab key={item.to} item={item} />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="relative flex flex-col items-center justify-center gap-0.5 text-muted transition-colors hover:text-text"
            aria-label="More"
          >
            <Menu size={22} />
            <span className="max-w-full truncate text-[9px] font-semibold uppercase tracking-normal">More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="flex flex-col gap-1">
          {[...COMPETE_NAV, ...COMMUNITY_NAV].map((item) => (
            <MoreRow key={item.to} item={item} onNavigate={() => setMoreOpen(false)} />
          ))}
          {me?.role === 'SUPER_ADMIN' || me?.role === 'ADMIN' ? (
            <MoreRow item={{ to: '/app/admin', label: 'Admin panel', icon: Crown }} onNavigate={() => setMoreOpen(false)} />
          ) : null}
          <div className="my-2 border-t border-border" />
          <MoreRow item={{ to: '/app/settings', label: 'Settings', icon: Settings }} onNavigate={() => setMoreOpen(false)} />
        </div>
      </Sheet>
    </div>
  );
}

function OutletContent() {
  return <Outlet />;
}

function Brand() {
  return (
    <Link to="/app" className="flex h-16 items-center gap-2.5 border-b border-border px-4">
      <BrandMark />
    </Link>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="clip-notch-sm flex h-9 w-9 items-center justify-center bg-gradient-to-br from-accent to-accent-2 font-display text-[15px] font-bold text-on-accent">
        KO
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-bold tracking-wide text-text">KINGS ONLY</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          <span className="h-1 w-1 rotate-45 bg-accent" aria-hidden />
          Free Fire · MENA
        </span>
      </div>
    </div>
  );
}

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="mt-5">
      <p className="mb-1.5 flex items-center gap-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-faint">
        <span className="h-1 w-1 rotate-45 bg-faint" aria-hidden />
        {title}
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors duration-150',
                  isActive ? 'bg-accent/10 text-text' : 'text-muted hover:bg-surface hover:text-text',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 bg-accent" /> : null}
                  <item.icon size={17} className={isActive ? 'text-accent' : 'text-muted'} />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SidebarProfile() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  if (!me) return null;
  return (
    <div className="border-t border-border p-3">
      <Link to="/app/settings" className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-elevated">
        <Avatar src={me.avatarUrl} name={me.displayName} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-text">{me.displayName}</p>
          <p className="truncate text-[11px] text-muted">
            {me.membership ? `${me.membership.guildRole} · ${me.membership.guildXp.toLocaleString()} XP` : 'Not a member'}
          </p>
        </div>
      </Link>
      {me.membership ? (
        <div className="px-2 pt-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-faint">Level progress</span>
            <span className="font-mono text-[10px] text-muted">{guildLevelPercent(me.membership.guildXp)}%</span>
          </div>
          <ProgressBar percent={guildLevelPercent(me.membership.guildXp)} className="h-1" />
        </div>
      ) : null}
      <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={() => logout().then(() => navigate('/'))}>
        Sign out
      </Button>
    </div>
  );
}

function MobileTab({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const active = item.to === '/app' ? pathname === '/app' : pathname.startsWith(item.to);
  return (
    <NavLink
      to={item.to}
      end={item.to === '/app'}
      className="relative flex flex-col items-center justify-center gap-0.5 transition-colors"
      aria-label={item.label}
    >
      {active ? <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" /> : null}
      <item.icon size={22} className={active ? 'text-accent' : 'text-muted'} />
      <span className={cn('max-w-full truncate text-[9px] font-semibold uppercase tracking-normal', active ? 'font-bold text-accent' : 'text-muted')}>
        {item.mobileLabel ?? item.label}
      </span>
    </NavLink>
  );
}

function MoreRow({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const { pathname } = useLocation();
  const active = pathname.startsWith(item.to);
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'flex h-11 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors',
        active ? 'bg-accent/10 text-text' : 'text-muted hover:bg-elevated hover:text-text',
      )}
    >
      <item.icon size={18} className={active ? 'text-accent' : 'text-muted'} />
      {item.label}
    </Link>
  );
}

function guildLevelPercent(xp: number): number {
  return Math.min(Math.round((xp % 1000) / 10), 100);
}