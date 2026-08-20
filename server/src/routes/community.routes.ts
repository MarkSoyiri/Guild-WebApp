import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { param, queryInt, queryString } from '../utils/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { PERMISSIONS, POST_TYPES, REACTION_TYPES } from '../utils/constants';
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  getPost,
  listComments,
  listPosts,
  moderatePost,
  postReactionSummary,
  toggleReaction,
} from '../services/community.service';

export const communityRouter = Router();

communityRouter.use(requireAuth);

communityRouter.get(
  '/posts',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      pageSize: z.coerce.number().int().positive().max(100).optional(),
      authorId: z.string().optional(),
      type: z.string().max(30).optional(),
    }),
    'query',
  ),
  async (req, res) => {
    const data = await listPosts({
      page: queryInt(req, 'page'),
      pageSize: queryInt(req, 'pageSize'),
      authorId: queryString(req, 'authorId'),
      type: queryString(req, 'type'),
    });
    res.json({ data });
  },
);

communityRouter.get('/posts/:id', async (req, res) => {
  const data = await getPost(param(req, 'id'));
  res.json({ data });
});

communityRouter.get('/posts/:id/comments', async (req, res) => {
  const data = await listComments(param(req, 'id'));
  res.json({ data });
});

communityRouter.get('/posts/:id/reactions', async (req, res) => {
  const data = await postReactionSummary(param(req, 'id'));
  res.json({ data });
});

const postSchema = z.object({
  type: z.enum(POST_TYPES).default('TEXT'),
  content: z.string().trim().min(1, 'Content cannot be empty').max(1000),
  referenceId: z.string().max(100).optional(),
});

communityRouter.post('/posts', validate(postSchema), async (req: AuthedRequest, res) => {
  const post = await createPost({ ...req.body, authorId: req.user!.id });
  res.status(201).json({ data: post });
});

communityRouter.delete('/posts/:id', async (req: AuthedRequest, res) => {
  const isModerator = ['SUPER_ADMIN', 'GUILD_ADMIN', 'MODERATOR'].includes(req.user!.role);
  await deletePost(param(req, 'id'), req.user!.id, isModerator);
  res.json({ data: { ok: true } });
});

communityRouter.patch('/posts/:id/moderation', requirePermission(PERMISSIONS.MODERATE), validate(z.object({ hide: z.coerce.boolean() })), async (req, res) => {
  await moderatePost(param(req, 'id'), req.body.hide);
  res.json({ data: { ok: true } });
});

const commentSchema = z.object({ content: z.string().trim().min(1).max(500) });

communityRouter.post('/posts/:id/comments', validate(commentSchema), async (req: AuthedRequest, res) => {
  const comment = await createComment({ postId: param(req, 'id'), authorId: req.user!.id, content: req.body.content });
  res.status(201).json({ data: comment });
});

communityRouter.delete('/comments/:id', async (req: AuthedRequest, res) => {
  const isModerator = ['SUPER_ADMIN', 'GUILD_ADMIN', 'MODERATOR'].includes(req.user!.role);
  await deleteComment(param(req, 'id'), req.user!.id, isModerator);
  res.json({ data: { ok: true } });
});

const reactionSchema = z.object({ type: z.enum(REACTION_TYPES) });

communityRouter.post('/posts/:id/reactions', validate(reactionSchema), async (req: AuthedRequest, res) => {
  const data = await toggleReaction(param(req, 'id'), req.user!.id, req.body.type);
  res.json({ data });
});
