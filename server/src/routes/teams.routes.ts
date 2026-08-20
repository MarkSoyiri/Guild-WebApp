import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { param, queryInt, queryString } from '../utils/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { PERMISSIONS } from '../utils/constants';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  getTeam,
  listTeams,
  removeTeamMember,
  setCaptain,
  updateTeam,
} from '../services/team.service';

export const teamsRouter = Router();

teamsRouter.use(requireAuth);

teamsRouter.get('/', async (req, res) => {
  const data = await listTeams();
  res.json({ data });
});

teamsRouter.get('/:id', async (req, res) => {
  const data = await getTeam(param(req, 'id'));
  res.json({ data });
});

const teamSchema = z.object({
  name: z.string().trim().min(2).max(40),
  tag: z.string().trim().max(8).optional(),
  description: z.string().trim().max(300).optional(),
});

teamsRouter.post('/', requirePermission(PERMISSIONS.TEAMS_MANAGE), validate(teamSchema), async (req: AuthedRequest, res) => {
  const team = await createTeam({ ...req.body, captainId: req.user!.id });
  res.status(201).json({ data: team });
});

const teamUpdateSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  tag: z.string().trim().max(8).optional(),
  description: z.string().trim().max(300).optional(),
});

teamsRouter.patch('/:id', requirePermission(PERMISSIONS.TEAMS_MANAGE), validate(teamUpdateSchema), async (req, res) => {
  await updateTeam(param(req, 'id'), req.body);
  res.json({ data: { ok: true } });
});

teamsRouter.delete('/:id', requirePermission(PERMISSIONS.TEAMS_MANAGE), async (req, res) => {
  await deleteTeam(param(req, 'id'));
  res.json({ data: { ok: true } });
});

teamsRouter.post('/:id/members', requirePermission(PERMISSIONS.TEAMS_MANAGE), validate(z.object({ userId: z.string(), role: z.string().max(20).optional() })), async (req, res) => {
  await addTeamMember(param(req, 'id'), req.body.userId, req.body.role ?? 'PLAYER');
  res.status(201).json({ data: { ok: true } });
});

teamsRouter.delete('/:id/members/:userId', requirePermission(PERMISSIONS.TEAMS_MANAGE), async (req, res) => {
  await removeTeamMember(param(req, 'id'), param(req, 'userId'));
  res.json({ data: { ok: true } });
});

teamsRouter.post('/:id/captain', requirePermission(PERMISSIONS.TEAMS_MANAGE), validate(z.object({ userId: z.string() })), async (req, res) => {
  await setCaptain(param(req, 'id'), req.body.userId);
  res.json({ data: { ok: true } });
});
