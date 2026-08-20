import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, MessageSquare, Search as SearchIcon, SearchX, Swords, Trophy, Users, type LucideIcon } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { get } from '../lib/api';
import { CHALLENGE_METRIC_LABELS, EVENT_TYPE_LABELS, POST_TYPE_LABELS, QUERY_KEYS, type PostType } from '../lib/constants';
import type { SearchResponse } from '../lib/types';
import { relativeTime } from '../lib/format';
import { Avatar } from '../components/ui/Avatar';
import { RankBadge, RoleBadge } from '../components/ui/Badges';
import { AsyncView, RowSkeleton } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { CountUp } from '../components/ui/CountUp';

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};

const groupVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const enabled = debounced.length >= 2;
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.search(debounced),
    queryFn: () => get<SearchResponse>(`/search?q=${encodeURIComponent(debounced)}`),
    enabled,
  });

  const results = enabled ? data : undefined;
  const empty = results && results.members.length === 0 && results.teams.length === 0 && results.events.length === 0 && results.posts.length === 0 && results.challenges.length === 0;

  return (
    <>
      <PageHeader
        kicker="Search the roster"
        title="Search"
        description="Run a name through the roster — players, teams, events, posts, and challenges."
      />
      <div className="mb-5">
        <label htmlFor="search-input" className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
          <span className="h-1 w-1 rotate-45 bg-accent" aria-hidden />
          Find anyone in the guild
        </label>
        <div className="relative">
          <SearchIcon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
          <Input id="search-input" className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, tag, callout…" autoFocus />
        </div>
      </div>
      <AsyncView
        isLoading={enabled && isLoading}
        isError={enabled && isError}
        error={error}
        onRetry={refetch}
        skeleton={<RowSkeleton rows={5} />}
        isEmpty={enabled ? empty : true}
        empty={
          <EmptyState
            icon={enabled ? <SearchX size={28} /> : <SearchIcon size={28} />}
            title={enabled ? 'No intel on that name' : 'Type to search'}
            description={enabled ? `Nothing matches “${debounced}”.` : 'Minimum two characters — then watch the intel roll in.'}
          />
        }
      >
        {results ? (
          <motion.div
            variants={listVariants}
            initial={reducedMotion ? false : 'hidden'}
            animate="show"
            className="flex flex-col gap-6"
          >
            {results.members.length > 0 ? (
              <motion.div variants={groupVariants}>
                <Section icon={Users} title="Players" count={results.members.length}>
                  {results.members.map((member) => (
                    <Link key={member.id} to={`/app/players/${member.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-gradient-to-b from-surface to-panel p-3 transition-colors hover:border-border-strong">
                      <Avatar src={member.avatarUrl} name={member.displayName} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-text">{member.displayName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <RankBadge rank={member.rank} />
                          <RoleBadge role={member.playerRole} />
                        </div>
                      </div>
                      <ArrowRight size={15} className="shrink-0 text-faint" aria-hidden />
                    </Link>
                  ))}
                </Section>
              </motion.div>
            ) : null}
            {results.teams.length > 0 ? (
              <motion.div variants={groupVariants}>
                <Section icon={Swords} title="Teams" count={results.teams.length}>
                  {results.teams.map((team) => (
                    <Link key={team.id} to={`/app/teams/${team.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-gradient-to-b from-surface to-panel p-3 transition-colors hover:border-border-strong">
                      <span className="clip-notch-sm flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-elevated font-mono text-[12px] font-bold text-accent">
                        {team.tag}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-text">{team.name}</p>
                        <p className="font-mono text-[11px] text-muted">{team.wins}W · {team.matches}M</p>
                      </div>
                      <ArrowRight size={15} className="shrink-0 text-faint" aria-hidden />
                    </Link>
                  ))}
                </Section>
              </motion.div>
            ) : null}
            {results.events.length > 0 ? (
              <motion.div variants={groupVariants}>
                <Section icon={CalendarClock} title="Events" count={results.events.length}>
                  {results.events.map((event) => (
                    <Link key={event.id} to={`/app/events/${event.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-gradient-to-b from-surface to-panel p-3 transition-colors hover:border-border-strong">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-text">{event.title}</p>
                        <p className="font-mono text-[11px] text-muted">
                          {EVENT_TYPE_LABELS[event.type as keyof typeof EVENT_TYPE_LABELS] ?? event.type} · {relativeTime(event.startsAt)}
                        </p>
                      </div>
                      <ArrowRight size={15} className="shrink-0 text-faint" aria-hidden />
                    </Link>
                  ))}
                </Section>
              </motion.div>
            ) : null}
            {results.challenges.length > 0 ? (
              <motion.div variants={groupVariants}>
                <Section icon={Trophy} title="Challenges" count={results.challenges.length}>
                  {results.challenges.map((challenge) => (
                    <Link key={challenge.id} to="/app/challenges" className="flex items-center gap-3 rounded-xl border border-border bg-gradient-to-b from-surface to-panel p-3 transition-colors hover:border-border-strong">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-text">{challenge.title}</p>
                        <p className="font-mono text-[11px] text-muted">
                          {CHALLENGE_METRIC_LABELS[challenge.metric as keyof typeof CHALLENGE_METRIC_LABELS] ?? challenge.metric} · {relativeTime(challenge.endsAt)}
                        </p>
                      </div>
                      <ArrowRight size={15} className="shrink-0 text-faint" aria-hidden />
                    </Link>
                  ))}
                </Section>
              </motion.div>
            ) : null}
            {results.posts.length > 0 ? (
              <motion.div variants={groupVariants}>
                <Section icon={MessageSquare} title="Posts" count={results.posts.length}>
                  {results.posts.map((post) => (
                    <Link key={post.id} to="/app/community" className="block rounded-xl border border-border bg-gradient-to-b from-surface to-panel p-3 transition-colors hover:border-border-strong">
                      <p className="line-clamp-2 text-[13px] leading-relaxed text-text">{post.content}</p>
                      <p className="mt-1 font-mono text-[11px] text-faint">
                        {POST_TYPE_LABELS[post.type as PostType] ?? post.type} · {relativeTime(post.createdAt)}
                      </p>
                    </Link>
                  ))}
                </Section>
              </motion.div>
            ) : null}
          </motion.div>
        ) : null}
      </AsyncView>
    </>
  );
}

function Section({ icon, title, count, children }: { icon: LucideIcon; title: string; count: number; children: ReactNode }) {
  const Icon = icon;
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 font-display text-[13px] font-bold uppercase tracking-[0.12em] text-muted">
        <Icon size={14} className="text-accent" aria-hidden />
        {title}
        <span className="ml-auto rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent">
          <CountUp value={count} />
        </span>
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}