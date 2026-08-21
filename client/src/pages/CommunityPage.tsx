import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, MessageCircle, Radio, Send, Trash2 } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { del, get, post as apiPost } from '../lib/api';
import { POST_TYPE_LABELS, QUERY_KEYS, REACTION_EMOJI, REACTION_TYPES, type PostType, type ReactionType } from '../lib/constants';
import type { Comment, Paginated, Post, PostDetail } from '../lib/types';
import { relativeTime } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { AsyncView, RowSkeleton } from '../components/ui/PlayerRow';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Field, Select, Textarea } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/cn';

const POST_TYPE_STYLES: Record<PostType, string> = {
  TEXT: 'border-border bg-elevated text-muted',
  ACHIEVEMENT: 'border-accent/30 bg-accent/10 text-accent',
  MATCH_RESULT: 'border-rank-silver/30 bg-rank-silver/10 text-rank-silver',
  ANNOUNCEMENT: 'border-warning/30 bg-warning/10 text-warning',
  TOURNAMENT_RESULT: 'border-secondary/30 bg-secondary/10 text-secondary',
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export function CommunityPage() {
  const { me } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.posts('pageSize=30'),
    queryFn: () => get<Paginated<Post>>('/community/posts?pageSize=30'),
  });

  return (
    <>
      <PageHeader
        kicker="The lobby"
        title="Community"
        description="Clips, callouts, results, and celebrations — drop it in the lobby."
      />
      <ComposeCard />
      <AsyncView
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        skeleton={<RowSkeleton rows={6} />}
        isEmpty={data?.items.length === 0}
        empty={<EmptyState icon={<MessageCircle size={28} />} title="No posts yet — break the ice" description="Be the first to drop a callout in the lobby." />}
      >
        <motion.div
          variants={listVariants}
          initial={reducedMotion ? false : 'hidden'}
          animate="show"
          className="mt-5 flex flex-col gap-3"
        >
          {data?.items.map((post) => (
            <motion.div key={post.id} variants={cardVariants}>
              <PostCard
                post={post}
                expanded={expandedId === post.id}
                onToggle={() => setExpandedId(expandedId === post.id ? null : post.id)}
                isModerator={me?.role === 'SUPER_ADMIN' || me?.role === 'ADMIN' || me?.role === 'MODERATOR'}
              />
            </motion.div>
          ))}
        </motion.div>
      </AsyncView>
    </>
  );
}

function ComposeCard() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<PostType>('TEXT');
  const [content, setContent] = useState('');

  const createMutation = useMutation({
    mutationFn: () => apiPost<{ id: string }>('/community/posts', { type, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts('pageSize=30') });
      setContent('');
    },
  });

  return (
    <form
      className="corner-brackets relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-surface to-panel p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (content.trim()) createMutation.mutate();
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(440px_180px_at_0%_0%,black,transparent)]" aria-hidden />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            <Radio size={13} aria-hidden /> Open mic
          </p>
          <span className="font-mono text-[10px] uppercase tracking-wide text-faint">Max 1000 chars</span>
        </div>
        <Field label="Transmission type" htmlFor="post-type">
          <Select id="post-type" value={type} onChange={(e) => setType(e.target.value as PostType)}>
            {(Object.keys(POST_TYPE_LABELS) as PostType[]).map((t) => (
              <option key={t} value={t}>
                {POST_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Textarea
          className="mt-3"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Drop your callout, clip, or result…"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-[11px] text-muted">{content.length}/1000</span>
          <Button type="submit" size="sm" loading={createMutation.isPending} icon={<Send size={14} />} disabled={!content.trim()}>
            Send it
          </Button>
        </div>
      </div>
    </form>
  );
}

function PostCard({ post, expanded, onToggle, isModerator }: { post: Post; expanded: boolean; onToggle: () => void; isModerator: boolean }) {
  const queryClient = useQueryClient();
  const { me } = useAuth();
  const isMine = post.authorId === me?.id;

  const { data: detail } = useQuery({
    queryKey: QUERY_KEYS.post(post.id),
    queryFn: () => get<PostDetail>(`/community/posts/${post.id}`),
    enabled: expanded,
  });

  const { data: comments } = useQuery({
    queryKey: QUERY_KEYS.comments(post.id),
    queryFn: () => get<Comment[]>(`/community/posts/${post.id}/comments`),
    enabled: expanded,
  });

  const deleteMutation = useMutation({
    mutationFn: () => del<{ ok: boolean }>(`/community/posts/${post.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts('pageSize=30') }),
  });

  const reactionMutation = useMutation({
    mutationFn: (reaction: ReactionType) => apiPost<{ ok: boolean }>(`/community/posts/${post.id}/reactions`, { type: reaction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.post(post.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts('pageSize=30') });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => apiPost<{ ok: boolean }>(`/community/posts/${post.id}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments(post.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.post(post.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts('pageSize=30') });
    },
  });

  const reactions = detail?.reactions ?? [];
  const mine = new Set(reactions.filter((r) => r.mine).map((r) => r.type));

  return (
    <Card className="corner-brackets relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(360px_160px_at_100%_0%,black,transparent)]" aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-3">
          <Avatar src={post.author.avatarUrl} name={post.author.displayName} size={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-text">{post.author.displayName}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide',
                  POST_TYPE_STYLES[post.type as PostType] ?? 'border-border bg-elevated text-muted',
                )}
              >
                {POST_TYPE_LABELS[post.type as PostType] ?? post.type}
              </span>
              <span className="font-mono text-[11px] text-faint">{relativeTime(post.createdAt)}</span>
            </p>
          </div>
          {isMine || isModerator ? (
            <Button variant="ghost" size="sm" icon={<Trash2 size={15} />} loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} />
          ) : null}
        </div>
        <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-text">{post.content}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {REACTION_TYPES.map((reaction) => {
            const count = reactions.find((r) => r.type === reaction)?.count ?? 0;
            const active = mine.has(reaction);
            return (
              <button
                key={reaction}
                type="button"
                onClick={() => reactionMutation.mutate(reaction)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide transition-colors',
                  active ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border bg-elevated text-muted hover:border-border-strong hover:text-text',
                )}
              >
                <span aria-hidden>{REACTION_EMOJI[reaction]}</span>
                {count > 0 ? <span>{count}</span> : null}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onToggle}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:text-accent"
          >
            <MessageCircle size={14} aria-hidden />
            {post._count.comments}
            {expanded ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
          </button>
        </div>
        {expanded ? (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              <span className="h-1 w-1 rotate-45 bg-accent" aria-hidden /> Whisper channel
            </p>
            <div className="flex flex-col gap-3">
              {comments?.map((comment) => (
                <CommentRow key={comment.id} comment={comment} isModerator={isModerator} />
              ))}
              {comments?.length === 0 ? <p className="text-[12px] text-muted">No replies yet — say something.</p> : null}
            </div>
            <CommentForm onSubmit={(content) => commentMutation.mutate(content)} loading={commentMutation.isPending} />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function CommentRow({ comment, isModerator }: { comment: Comment; isModerator: boolean }) {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const canDelete = isModerator || comment.authorId === me?.id;

  const deleteMutation = useMutation({
    mutationFn: () => del<{ ok: boolean }>(`/community/comments/${comment.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments(comment.postId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.post(comment.postId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts('pageSize=30') });
    },
  });

  return (
    <div className="flex items-start gap-2.5">
      <Avatar src={comment.author.avatarUrl} name={comment.author.displayName} size={28} />
      <div className="min-w-0 flex-1 rounded-lg border border-border bg-elevated/60 px-3 py-2">
        <p className="text-[12px] font-semibold text-text">
          {comment.author.displayName} <span className="font-mono font-normal text-faint">· {relativeTime(comment.createdAt)}</span>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">{comment.content}</p>
      </div>
      {canDelete ? (
        <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} />
      ) : null}
    </div>
  );
}

function CommentForm({ onSubmit, loading }: { onSubmit: (content: string) => void; loading: boolean }) {
  const [content, setContent] = useState('');
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (content.trim()) {
          onSubmit(content);
          setContent('');
        }
      }}
    >
      <input
        className="min-w-0 flex-1 rounded-lg border border-border bg-bg-2 px-3 py-2 text-[13px] text-text outline-none placeholder:text-faint focus:border-accent/50 focus:ring-2 focus:ring-accent/25"
        placeholder="Reply in the channel…"
        maxLength={500}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <Button type="submit" size="sm" loading={loading} disabled={!content.trim()}>
        Reply
      </Button>
    </form>
  );
}