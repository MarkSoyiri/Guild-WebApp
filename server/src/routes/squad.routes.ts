import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { param, queryInt, queryString } from '../utils/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { RANKS, PLAYER_ROLES } from '../utils/constants';
import {
  closeSquadRequest,
  createSquadRequest,
  joinSquadRequest,
  leaveSquadRequest,
  listSquadRequests,
} from '../services/squad.service';

export const squadRouter = Router();

squadRouter.use(requireAuth);

squadRouter.get(
  '/',
  validate(
    z.object({
      status: z.string().max(20).optional(),
      role: z.string().max(20).optional(),
      page: z.coerce.number().int().positive().optional(),
      pageSize: z.coerce.number().int().positive().max(100).optional(),
    }),
    'query',
  ),
  async (req, res) => {
    const data = await listSquadRequests({
      status: queryString(req, 'status') ?? 'OPEN',
      role: queryString(req, 'role'),
      page: queryInt(req, 'page'),
      pageSize: queryInt(req, 'pageSize'),
    });
    res.json({ data });
  },
);

const squadRequestSchema = z.object({
  role: z.enum(PLAYER_ROLES),
  rank: z.enum(RANKS),
  mic: z.coerce.boolean(),
  playersNeeded: z.coerce.number().int().min(1).max(3),
  note: z.string().trim().max(200).optional(),
});

squadRouter.post('/', validate(squadRequestSchema), async (req: AuthedRequest, res) => {
  const request = await createSquadRequest({ ...req.body, userId: req.user!.id });
  res.status(201).json({ data: request });
});

squadRouter.post('/:id/join', async (req: AuthedRequest, res) => {
  await joinSquadRequest(param(req, 'id'), req.user!.id);
  res.json({ data: { ok: true } });
});

squadRouter.post('/:id/leave', async (req: AuthedRequest, res) => {
  await leaveSquadRequest(param(req, 'id'), req.user!.id);
  res.json({ data: { ok: true } });
});

squadRouter.post('/:id/close', async (req: AuthedRequest, res) => {
  await closeSquadRequest(param(req, 'id'), req.user!.id);
  res.json({ data: { ok: true } });
});
