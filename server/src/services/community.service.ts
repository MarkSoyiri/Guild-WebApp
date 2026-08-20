import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { notify } from './notification.service';
import { grant } from './xp.service';
import { XP_RULES } from '../utils/constants';

export async function listPosts(input: { page?: number; pageSize?: number; authorId?: string; type?: string }) {
  const where: Record<string, unknown> = { status: 'PUBLISHED' };
  if (input.authorId) where.authorId = input.authorId;
  if (input.type) where.type = input.type;
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 100);
  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}

export async function getPost(id: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      _count: { select: { comments: true, reactions: true } },
    },
  });
  if (!post || post.status !== 'PUBLISHED') throw new AppError(404, 'NOT_FOUND', 'Post not found');
  return post;
}

export async function createPost(input: {
  authorId: string;
  type: string;
  content: string;
  referenceId?: string;
}) {
  const content = input.content.trim();
  if (!content) throw new AppError(400, 'EMPTY_CONTENT', 'Post content cannot be empty');
  if (content.length > 1000) throw new AppError(400, 'TOO_LONG', 'Post content is too long (max 1000 chars)');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysCount = await prisma.post.count({
    where: { authorId: input.authorId, createdAt: { gte: today } },
  });
  if (todaysCount >= 10) {
    throw new AppError(400, 'POST_LIMIT', 'You reached the daily post limit');
  }
  const post = await prisma.post.create({
    data: {
      authorId: input.authorId,
      type: input.type,
      content,
      referenceId: input.referenceId?.slice(0, 100) ?? null,
    },
  });
  if (todaysCount < Math.floor(XP_RULES.POST_DAILY_CAP / XP_RULES.POST)) {
    await grant({ userId: input.authorId, amount: XP_RULES.POST, reason: 'COMMUNITY', detail: 'Post' });
  }
  return post;
}

export async function deletePost(postId: string, userId: string, isModerator: boolean): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post not found');
  if (post.authorId !== userId && !isModerator) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot delete this post');
  }
  await prisma.post.delete({ where: { id: postId } });
}

export async function moderatePost(postId: string, hide: boolean): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post not found');
  await prisma.post.update({ where: { id: postId }, data: { status: hide ? 'HIDDEN' : 'PUBLISHED' } });
}

export async function listComments(postId: string) {
  return prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, displayName: true, avatarUrl: true } } },
  });
}

export async function createComment(input: { postId: string; authorId: string; content: string }) {
  const post = await prisma.post.findUnique({ where: { id: input.postId } });
  if (!post || post.status !== 'PUBLISHED') throw new AppError(404, 'NOT_FOUND', 'Post not found');
  const content = input.content.trim();
  if (!content) throw new AppError(400, 'EMPTY_CONTENT', 'Comment cannot be empty');
  if (content.length > 500) throw new AppError(400, 'TOO_LONG', 'Comment is too long (max 500 chars)');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysCount = await prisma.comment.count({
    where: { authorId: input.authorId, createdAt: { gte: today } },
  });
  if (todaysCount >= 30) {
    throw new AppError(400, 'COMMENT_LIMIT', 'You reached the daily comment limit');
  }
  const comment = await prisma.comment.create({
    data: { postId: input.postId, authorId: input.authorId, content },
    include: { author: { select: { id: true, displayName: true, avatarUrl: true } } },
  });
  if (todaysCount < Math.floor(XP_RULES.COMMENT_DAILY_CAP / XP_RULES.COMMENT)) {
    await grant({ userId: input.authorId, amount: XP_RULES.COMMENT, reason: 'COMMUNITY', detail: 'Comment' });
  }
  if (post.authorId !== input.authorId) {
    await notify({
      userId: post.authorId,
      type: 'MENTION',
      title: 'New comment on your post',
      body: content.slice(0, 120),
      link: `/app/community?post=${post.id}`,
    });
  }
  return comment;
}

export async function deleteComment(commentId: string, userId: string, isModerator: boolean): Promise<void> {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError(404, 'NOT_FOUND', 'Comment not found');
  if (comment.authorId !== userId && !isModerator) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot delete this comment');
  }
  await prisma.comment.delete({ where: { id: commentId } });
}

export async function toggleReaction(postId: string, userId: string, type: string): Promise<{ type: string | null; count: number }> {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.status !== 'PUBLISHED') throw new AppError(404, 'NOT_FOUND', 'Post not found');
  const existing = await prisma.reaction.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) {
    if (existing.type === type) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      const count = await prisma.reaction.count({ where: { postId } });
      return { type: null, count };
    }
    await prisma.reaction.update({ where: { id: existing.id }, data: { type } });
    const count = await prisma.reaction.count({ where: { postId } });
    return { type, count };
  }
  await prisma.reaction.create({ data: { postId, userId, type } });
  const count = await prisma.reaction.count({ where: { postId } });
  return { type, count };
}

export async function postReactionSummary(postId: string) {
  const reactions = await prisma.reaction.findMany({ where: { postId } });
  const byType: Record<string, number> = {};
  for (const r of reactions) {
    byType[r.type] = (byType[r.type] ?? 0) + 1;
  }
  return { total: reactions.length, byType };
}