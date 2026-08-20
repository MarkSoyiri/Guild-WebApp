import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { PERMISSIONS } from '../utils/constants';
import { getDashboard, getGuildActivity, getGuildOverview, updateGuildSettings } from '../services/guild.service';
import { queryInt } from '../utils/http';

export const guildRouter = Router();

guildRouter.use(requireAuth);

guildRouter.get('/overview', async (req: AuthedRequest, res) => {
  const data = await getGuildOverview();
  res.json({ data });
});

guildRouter.get('/dashboard', async (req: AuthedRequest, res) => {
  const data = await getDashboard(req.user!.id);
  res.json({ data });
});

guildRouter.get('/activity', validate(z.object({ page: z.coerce.number().int().positive().optional(), pageSize: z.coerce.number().int().positive().max(50).optional() }), 'query'), async (req, res) => {
  const data = await getGuildActivity(queryInt(req, 'page') ?? 1, queryInt(req, 'pageSize') ?? 20);
  res.json({ data });
});

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  tag: z.string().trim().min(1).max(8).optional(),
  region: z.string().trim().min(2).max(12).optional(),
  description: z.string().trim().max(400).optional(),
  motto: z.string().trim().max(120).optional(),
});

guildRouter.patch('/settings', requirePermission(PERMISSIONS.SETTINGS_MANAGE), validate(settingsSchema), async (req, res) => {
  await updateGuildSettings(req.body);
  res.json({ data: { ok: true } });
});
