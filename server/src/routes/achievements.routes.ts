import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { PERMISSIONS } from '../utils/constants';
import { adminCreateAchievement, listAchievements } from '../services/achievement.service';

export const achievementsRouter = Router();

achievementsRouter.use(requireAuth);

achievementsRouter.get('/', async (req: AuthedRequest, res) => {
  const data = await listAchievements(req.user!.id);
  res.json({ data });
});

const achievementSchema = z.object({
  key: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().min(3).max(200),
  icon: z.string().trim().min(2).max(40),
  rarity: z.enum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY']),
  requirementType: z.enum(['WINS', 'KILLS', 'HEADSHOTS', 'MVPS', 'CLUTCH_WINS', 'KD', 'MATCHES', 'MOST_KILLS', 'LOYALTY_DAYS', 'POSTS', 'TEAMS', 'TOURNAMENT_WINS', 'XP']),
  requirementValue: z.coerce.number().int().positive(),
  rewardXp: z.coerce.number().int().min(0),
});

achievementsRouter.post('/', requirePermission(PERMISSIONS.ACHIEVEMENTS_MANAGE), validate(achievementSchema), async (req, res) => {
  await adminCreateAchievement(req.body);
  res.status(201).json({ data: { ok: true } });
});
