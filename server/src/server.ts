import { createApp } from './app';
import { env, isProd } from './config/env';
import { logger } from './lib/logger';
import { ensureUploadDirs } from './services/upload.service';
import { startScheduler } from './jobs';
import { prisma } from './lib/prisma';

async function main(): Promise<void> {
  ensureUploadDirs();
  await prisma.$connect();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`KINGS ONLY API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    logger.info(`Free Fire provider: ${env.FF_PROVIDER}${isProd ? '' : ' (demo data)'}`);
  });
  startScheduler();
}

main().catch((error) => {
  logger.error('Failed to start server', { error: String(error) });
  process.exit(1);
});