import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { grant } from './xp.service';
import { notifyMany } from './notification.service';
import { recordActivity } from './activity.service';
import { XP_RULES } from '../utils/constants';

export interface ChallengeDeltas {
  kills: number;
  wins: number;
  headshots: number;
  matches: number;
  mvps: number;
  customRooms: number;
}

function metricDelta(metric: string, deltas: ChallengeDeltas): number {
  switch (metric) {
    case 'KILLS':
      return deltas.kills;
    case 'WINS':
      return deltas.wins;
    case 'HEADSHOTS':
      return deltas.headshots;
    case 'MATCHES':
      return deltas.matches;
    case 'RANKED_MATCHES':
      return deltas.matches;
    case 'CUSTOM_ROOMS':
      return deltas.customRooms;
    case 'MVPS':
      return deltas.mvps;
    default:
      return 0;
  }
}

export async function contributeToChallenges(userId: string, deltas: ChallengeDeltas): Promise<void> {
  const guild = await prisma.guild.findFirst();
  if (!guild) return;
  const membership = await prisma.guildMembership.findUnique({
    where: { guildId_userId: { guildId: guild.id, userId } },
  });
  if (!membership) return;
  const active = await prisma.challenge.findMany({
    where: {
      status: 'ACTIVE',
      startsAt: { lte: new Date() },
      endsAt: { gte: new Date() },
    },
  });
  if (active.length === 0) return;

  const progressRows = await prisma.challengeProgress.findMany({
    where: { userId, challengeId: { in: active.map((c) => c.id) } },
  });
  const progressByChallenge = new Map(progressRows.map((p) => [p.challengeId, p]));

  for (const challenge of active) {
    const delta = metricDelta(challenge.metric, deltas);
    if (delta <= 0) continue;
    const row = progressByChallenge.get(challenge.id);
    if (row) {
      await prisma.challengeProgress.update({
        where: { id: row.id },
        data: { progress: { increment: delta } },
      });
    } else {
      await prisma.challengeProgress.create({
        data: { challengeId: challenge.id, userId, progress: delta },
      });
    }
  }

  await checkChallengeCompletions();
}

export async function checkChallengeCompletions(): Promise<void> {
  const active = await prisma.challenge.findMany({
    where: { status: 'ACTIVE' },
    include: { progress: true },
  });
  for (const challenge of active) {
    const total = challenge.progress.reduce((sum, p) => sum + p.progress, 0);
    if (total < challenge.goal) continue;
    const guild = await prisma.guild.findFirst();
    const members = guild
      ? await prisma.guildMembership.findMany({ where: { guildId: guild.id }, select: { userId: true } })
      : [];
    const memberIds = new Set(members.map((m) => m.userId));
    const contributors = challenge.progress.filter((p) => p.progress > 0 && memberIds.has(p.userId));
    const contributorsCount = Math.max(contributors.length, 1);
    const perMember = Math.floor(challenge.rewardXp / contributorsCount) + XP_RULES.CHALLENGE_COMPLETE_BONUS;
    for (const contributor of contributors) {
      await grant({
        userId: contributor.userId,
        amount: perMember,
        reason: 'CHALLENGE',
        detail: challenge.title,
      });
    }
    await prisma.challenge.update({
      where: { id: challenge.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    await recordActivity({
      guildId: challenge.guildId,
      type: 'CHALLENGE_COMPLETED',
      message: `Challenge completed: ${challenge.title}`,
      payload: { challengeId: challenge.id, contributors: contributorsCount },
    });
    await notifyMany(
      contributors.map((c) => ({
        userId: c.userId,
        type: 'CHALLENGE',
        title: `Challenge Completed: ${challenge.title}`,
        body: `You earned +${perMember} guild XP.`,
        link: '/app/challenges',
      })),
    );
  }
}

export async function listChallenges(userId: string | null, status?: string) {
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const challenges = await prisma.challenge.findMany({
    where,
    orderBy: { endsAt: 'desc' },
    include: { progress: { where: userId ? { userId } : undefined } },
  });
  return challenges.map((challenge) => {
    const total = challenge.progress.reduce((sum, p) => sum + p.progress, 0);
    const mine = challenge.progress.find((p) => p.userId === userId)?.progress ?? 0;
    return {
      ...challenge,
      progress: total,
      myProgress: mine,
      percent: Math.min(Math.round((total / challenge.goal) * 100), 100),
    };
  });
}

export async function createChallenge(input: {
  title: string;
  description: string;
  metric: string;
  goal: number;
  rewardXp: number;
  startsAt: Date;
  endsAt: Date;
  createdBy: string;
}) {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  if (input.goal < 1 || input.rewardXp < 0 || input.endsAt <= input.startsAt) {
    throw new AppError(400, 'INVALID_CHALLENGE', 'Invalid challenge values');
  }
  const challenge = await prisma.challenge.create({
    data: { ...input, guildId: guild.id, status: 'ACTIVE' },
  });
  await recordActivity({
    guildId: guild.id,
    type: 'ANNOUNCEMENT',
    message: `New guild challenge: ${input.title}`,
    payload: { challengeId: challenge.id },
  });
  const members = await prisma.guildMembership.findMany({
    where: { guildId: guild.id },
    select: { userId: true },
  });
  await notifyMany(
    members.map((m) => ({
      userId: m.userId,
      type: 'CHALLENGE',
      title: `New Challenge: ${input.title}`,
      body: `${input.goal.toLocaleString()} ${input.metric} · reward +${input.rewardXp} XP`,
      link: '/app/challenges',
    })),
  );
  return challenge;
}

export async function updateChallenge(
  id: string,
  input: Partial<{
    title: string;
    description: string;
    metric: string;
    goal: number;
    rewardXp: number;
    startsAt: Date;
    endsAt: Date;
    status: string;
  }>,
): Promise<void> {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) throw new AppError(404, 'NOT_FOUND', 'Challenge not found');
  await prisma.challenge.update({ where: { id }, data: input });
}

export async function cancelChallenge(id: string): Promise<void> {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) throw new AppError(404, 'NOT_FOUND', 'Challenge not found');
  if (challenge.status === 'COMPLETED') {
    throw new AppError(400, 'ALREADY_COMPLETED', 'Completed challenges cannot be cancelled');
  }
  await prisma.challenge.update({ where: { id }, data: { status: 'CANCELLED' } });
}