import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { searchGuild } from '../services/search.service';
import { queryString } from '../utils/http';

export const searchRouter = Router();

searchRouter.use(requireAuth);

searchRouter.get('/', validate(z.object({ q: z.string().trim().min(2).max(60) }), 'query'), async (req, res) => {
  const data = await searchGuild(queryString(req, 'q') ?? '');
  res.json({ data });
});
