import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { param, queryInt, queryString } from '../utils/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { PERMISSIONS } from '../utils/constants';
import { cancelChallenge, createChallenge, listChallenges, updateChallenge } from '../services/challenge.service';

export const challengesRouter = Router();

challengesRouter.use(requireAuth);

challengesRouter.get(
  '/',
  validate(z.object({ status: z.string().max(20).optional() }), 'query'),
  async (req: AuthedRequest, res) => {
    const data = await listChallenges(req.user!.id, queryString(req, 'status'));
    res.json({ data });
  },
);

const challengeSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(3).max(500),
  metric: z.enum(['KILLS', 'WINS', 'HEADSHOTS', 'MATCHES', 'RANKED_MATCHES', 'CUSTOM_ROOMS', 'MVPS']),
  goal: z.coerce.number().int().positive().max(1_000_000),
  rewardXp: z.coerce.number().int().min(0).max(100_000),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

challengesRouter.post('/', requirePermission(PERMISSIONS.CHALLENGES_MANAGE), validate(challengeSchema), async (req: AuthedRequest, res) => {
  const challenge = await createChallenge({ ...req.body, createdBy: req.user!.id });
  res.status(201).json({ data: challenge });
});

const challengeUpdateSchema = challengeSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'CANCELLED']).optional(),
});

challengesRouter.patch('/:id', requirePermission(PERMISSIONS.CHALLENGES_MANAGE), validate(challengeUpdateSchema), async (req, res) => {
  await updateChallenge(param(req, 'id'), req.body);
  res.json({ data: { ok: true } });
});

challengesRouter.post('/:id/cancel', requirePermission(PERMISSIONS.CHALLENGES_MANAGE), async (req, res) => {
  await cancelChallenge(param(req, 'id'));
  res.json({ data: { ok: true } });
});
