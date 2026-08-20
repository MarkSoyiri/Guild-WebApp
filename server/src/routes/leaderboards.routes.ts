import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { getLeaderboard } from '../services/leaderboard.service';
import { queryInt, queryString } from '../utils/http';

export const leaderboardsRouter = Router();

leaderboardsRouter.use(requireAuth);

leaderboardsRouter.get(
  '/',
  validate(
    z.object({
      category: z
        .enum(['OVERALL', 'WEEKLY', 'MONTHLY', 'WINS', 'KILLS', 'KD', 'HEADSHOTS', 'GUILD_XP', 'MVP', 'ACTIVE', 'IMPROVED'])
        .default('OVERALL'),
      seasonId: z.string().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      page: z.coerce.number().int().positive().optional(),
    }),
    'query',
  ),
  async (req, res) => {
    const data = await getLeaderboard({
      category: queryString(req, 'category') ?? 'OVERALL',
      seasonId: queryString(req, 'seasonId'),
      limit: queryInt(req, 'limit'),
      page: queryInt(req, 'page'),
    });
    res.json({ data });
  },
);
