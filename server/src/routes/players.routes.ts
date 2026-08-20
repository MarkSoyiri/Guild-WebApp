import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { param, queryInt, queryString } from '../utils/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { getMyMatches, getPlayer, listPlayers, updateMyProfile } from '../services/player.service';

export const playersRouter = Router();

playersRouter.use(requireAuth);

playersRouter.get(
  '/',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      pageSize: z.coerce.number().int().positive().max(100).optional(),
      role: z.string().max(20).optional(),
      rank: z.string().max(20).optional(),
      search: z.string().max(60).optional(),
    }),
    'query',
  ),
  async (req, res) => {
    const data = await listPlayers({
      page: queryInt(req, 'page'),
      pageSize: queryInt(req, 'pageSize'),
      role: queryString(req, 'role'),
      rank: queryString(req, 'rank'),
      search: queryString(req, 'search'),
    });
    res.json({ data });
  },
);

playersRouter.get('/me', async (req: AuthedRequest, res) => {
  const data = await getPlayer(req.user!.id, req.user!.id);
  res.json({ data });
});

playersRouter.get('/me/matches', validate(z.object({ page: z.coerce.number().int().positive().optional() }), 'query'), async (req: AuthedRequest, res) => {
  const data = await getMyMatches(req.user!.id, queryInt(req, 'page') ?? 1);
  res.json({ data });
});

playersRouter.get('/:userId', async (req: AuthedRequest, res) => {
  const data = await getPlayer(param(req, 'userId'), req.user!.id);
  res.json({ data });
});

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(24).optional(),
  ffUid: z.string().trim().max(20).optional(),
  ffNickname: z.string().trim().max(24).optional(),
  region: z.string().trim().min(2).max(12).optional(),
  playerRole: z.string().trim().max(20).optional(),
  rank: z.string().trim().max(20).optional(),
  rankPoints: z.coerce.number().int().min(0).max(99999).optional(),
});

playersRouter.patch('/me', validate(profileSchema), async (req: AuthedRequest, res) => {
  await updateMyProfile(req.user!.id, req.body);
  res.json({ data: { ok: true } });
});
