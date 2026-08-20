import { Router } from 'express';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { runDailyJobs } from '../jobs/run';

export const cronRouter = Router();

cronRouter.post('/jobs', async (req, res) => {
  const secret = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!env.CRON_SECRET || secret !== env.CRON_SECRET) {
    throw new AppError(403, 'CRON_UNAUTHORIZED', 'Invalid cron secret');
  }
  await runDailyJobs();
  res.json({ data: { status: 'ok' } });
});