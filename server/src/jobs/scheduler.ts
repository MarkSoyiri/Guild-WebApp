import { logger } from '../lib/logger';
import { rotateSyncs, runSafely, checkWeeklyRollover, evaluateLoyalty, dailySnapshot } from './run';
import { expireStaleRequests } from '../services/squad.service';
import { checkChallengeCompletions } from '../services/challenge.service';

const SYNC_INTERVAL_MS = 60_000;
const SQUAD_CLEANUP_MS = 15 * 60 * 1000;
const CHALLENGE_CHECK_MS = 60_000;
const LOYALTY_CHECK_MS = 6 * 60 * 60 * 1000;
const WEEKLY_ROLLOVER_MS = 60 * 60 * 1000;
const SNAPSHOT_MS = 6 * 60 * 60 * 1000;

export function startJobs(): void {
  setInterval(() => void runSafely('Scheduled sync', rotateSyncs), SYNC_INTERVAL_MS);
  setInterval(() => void runSafely('Squad cleanup', () => expireStaleRequests()), SQUAD_CLEANUP_MS);
  setInterval(() => void runSafely('Challenge check', () => checkChallengeCompletions()), CHALLENGE_CHECK_MS);
  setInterval(() => void runSafely('Weekly rollover', checkWeeklyRollover), WEEKLY_ROLLOVER_MS);
  setInterval(() => void runSafely('Loyalty check', evaluateLoyalty), LOYALTY_CHECK_MS);
  setInterval(() => void runSafely('Daily snapshot', dailySnapshot), SNAPSHOT_MS);
  setTimeout(() => void runSafely('Scheduled sync', rotateSyncs), 30_000);
  logger.info('Background jobs started');
}