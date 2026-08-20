import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { globalLimiter } from './middleware/rateLimit';
import { csrfProtection } from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/error';
import { logger } from './lib/logger';
import { staticUploadsDir } from './services/upload.service';
import { authRouter } from './routes/auth.routes';
import { publicRouter } from './routes/public.routes';
import { guildRouter } from './routes/guild.routes';
import { playersRouter } from './routes/players.routes';
import { leaderboardsRouter } from './routes/leaderboards.routes';
import { eventsRouter } from './routes/events.routes';
import { challengesRouter } from './routes/challenges.routes';
import { achievementsRouter } from './routes/achievements.routes';
import { teamsRouter } from './routes/teams.routes';
import { tournamentsRouter } from './routes/tournaments.routes';
import { squadRouter } from './routes/squad.routes';
import { communityRouter } from './routes/community.routes';
import { announcementsRouter } from './routes/announcements.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { searchRouter } from './routes/search.routes';
import { freefireRouter } from './routes/freefire.routes';
import { adminRouter } from './routes/admin.routes';
import { uploadRouter } from './routes/upload.routes';
import { cronRouter } from './routes/cron.routes';

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(
    morgan('combined', {
      stream: { write: (msg: string) => logger.info(msg.trim()) },
      skip: () => env.NODE_ENV === 'test',
    }),
  );
  app.use(globalLimiter);
  app.use(csrfProtection);

  app.use('/uploads', express.static(staticUploadsDir(), { maxAge: '7d', immutable: true }));

  app.get('/api/health', (req, res) => {
    res.json({ data: { status: 'ok', provider: env.FF_PROVIDER, time: new Date().toISOString() } });
  });

  app.use('/api/public', publicRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/guild', guildRouter);
  app.use('/api/players', playersRouter);
  app.use('/api/leaderboards', leaderboardsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/challenges', challengesRouter);
  app.use('/api/achievements', achievementsRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/tournaments', tournamentsRouter);
  app.use('/api/squad', squadRouter);
  app.use('/api/community', communityRouter);
  app.use('/api/announcements', announcementsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/freefire', freefireRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/cron', cronRouter);

  app.use('/api', notFoundHandler);

  app.use(errorHandler);

  return app;
}