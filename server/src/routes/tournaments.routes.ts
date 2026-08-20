import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { param, queryInt, queryString } from '../utils/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { PERMISSIONS } from '../utils/constants';
import {
  cancelTournament,
  createTournament,
  getTournament,
  listTournaments,
  recordMatchResult,
  registerTeam,
  startTournament,
  unregisterTeam,
} from '../services/tournament.service';

export const tournamentsRouter = Router();

tournamentsRouter.use(requireAuth);

tournamentsRouter.get('/', validate(z.object({ status: z.string().max(20).optional() }), 'query'), async (req, res) => {
  const data = await listTournaments(queryString(req, 'status'));
  res.json({ data });
});

tournamentsRouter.get('/:id', async (req, res) => {
  const data = await getTournament(param(req, 'id'));
  res.json({ data });
});

const tournamentSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(500).optional(),
  size: z.coerce.number().int().min(2).max(16),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  prize: z.string().trim().max(200).optional(),
});

tournamentsRouter.post('/', requirePermission(PERMISSIONS.TOURNAMENTS_MANAGE), validate(tournamentSchema), async (req: AuthedRequest, res) => {
  const tournament = await createTournament({ ...req.body, createdBy: req.user!.id });
  res.status(201).json({ data: tournament });
});

tournamentsRouter.post('/:id/register', requirePermission(PERMISSIONS.TOURNAMENTS_MANAGE), validate(z.object({ teamId: z.string() })), async (req, res) => {
  await registerTeam(param(req, 'id'), req.body.teamId);
  res.status(201).json({ data: { ok: true } });
});

tournamentsRouter.post('/:id/unregister', requirePermission(PERMISSIONS.TOURNAMENTS_MANAGE), validate(z.object({ teamId: z.string() })), async (req, res) => {
  await unregisterTeam(param(req, 'id'), req.body.teamId);
  res.json({ data: { ok: true } });
});

tournamentsRouter.post('/:id/start', requirePermission(PERMISSIONS.TOURNAMENTS_MANAGE), async (req, res) => {
  await startTournament(param(req, 'id'));
  res.json({ data: { ok: true } });
});

tournamentsRouter.post('/:id/cancel', requirePermission(PERMISSIONS.TOURNAMENTS_MANAGE), async (req, res) => {
  await cancelTournament(param(req, 'id'));
  res.json({ data: { ok: true } });
});

const matchResultSchema = z.object({
  scoreA: z.coerce.number().int().min(0).max(999),
  scoreB: z.coerce.number().int().min(0).max(999),
  mvpId: z.string().optional(),
});

tournamentsRouter.post('/matches/:matchId/result', requirePermission(PERMISSIONS.TOURNAMENTS_MANAGE), validate(matchResultSchema), async (req, res) => {
  await recordMatchResult(param(req, 'matchId'), req.body);
  res.json({ data: { ok: true } });
});
