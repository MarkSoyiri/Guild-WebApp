import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { syncPlayer } from '../services/sync.service';
import { expireStaleRequests } from '../services/squad.service';
import { checkChallengeCompletions } from '../services/challenge.service';
import { evaluateAchievements } from '../services/achievement.service';

export async function rotateSyncs(): Promise<void> {
  const profile = await prisma.playerProfile.findFirst({
    where: {
      ffUid: { not: null },
      user: { memberships: { some: {} } },
    },
    orderBy: { lastSyncAt: 'asc' },
  });
  if (profile) {
    const result = await syncPlayer(profile.id, 'JOB');
    logger.info(`Scheduled sync ${profile.id}: ${result.status} — ${result.message}`);
  }
}

export async function runSafely(jobName: string, job: () => Promise<unknown>): Promise<void> {
  try {
    await job();
  } catch (error) {
    logger.warn(`${jobName} failed: ${String(error)}`);
  }
}

export async function checkWeeklyRollover(): Promise<void> {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  if (day !== 0 || now.getHours() !== 0) return;
  const result = await prisma.freeFireStats.updateMany({
    data: {
      weeklyKills: 0,
      weeklyWins: 0,
      weeklyMatches: 0,
      weeklyHeadshots: 0,
      weeklyMvps: 0,
      weeklyDeaths: 0,
    },
  });
  logger.info(`Weekly stats rolled over for ${result.count} players`);
}

export async function evaluateLoyalty(): Promise<void> {
  const guild = await prisma.guild.findFirst();
  if (!guild) return;
  const memberships = await prisma.guildMembership.findMany({
    where: { guildId: guild.id },
    select: { userId: true },
  });
  for (const membership of memberships) {
    await evaluateAchievements(membership.userId);
  }
}

export async function dailySnapshot(): Promise<void> {
  const season = await prisma.season.findFirst({ where: { status: 'ACTIVE' } });
  if (!season) return;
  const last = await prisma.leaderboardSnapshot.findFirst({
    where: { seasonId: season.id },
    orderBy: { capturedAt: 'desc' },
    select: { capturedAt: true },
  });
  if (last && Date.now() - last.capturedAt.getTime() < 20 * 60 * 60 * 1000) return;
  const { captureSnapshots } = await import('../services/leaderboard.service');
  await captureSnapshots(season.id);
}

export async function runDailyJobs(): Promise<void> {
  await runSafely('Squad cleanup', () => expireStaleRequests());
  await runSafely('Challenge check', () => checkChallengeCompletions());
  await runSafely('Weekly rollover', checkWeeklyRollover);
  await runSafely('Loyalty check', evaluateLoyalty);
  await runSafely('Daily snapshot', dailySnapshot);
  await runSafely('Scheduled sync', rotateSyncs);
}