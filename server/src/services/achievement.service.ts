import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { ACHIEVEMENTS } from '../utils/achievements';
import { getGuild, grant } from './xp.service';

export interface AchievementContext {
  userId: string;
  playerId?: string;
  stats?: {
    kills: number;
    deaths: number;
    matches: number;
    wins: number;
    headshots: number;
    mvps: number;
    clutchWins: number;
    mostKillsInMatch: number;
    kdRatio: number;
  };
  loyaltyDays?: number;
  postCount?: number;
  teamCount?: number;
  tournamentWins?: number;
}

function requirementValue(ctx: AchievementContext, type: string): number {
  switch (type) {
    case 'WINS':
      return ctx.stats?.wins ?? 0;
    case 'KILLS':
      return ctx.stats?.kills ?? 0;
    case 'HEADSHOTS':
      return ctx.stats?.headshots ?? 0;
    case 'MVPS':
      return ctx.stats?.mvps ?? 0;
    case 'CLUTCH_WINS':
      return ctx.stats?.clutchWins ?? 0;
    case 'KD':
      return Math.round((ctx.stats?.kdRatio ?? 0) * 100);
    case 'MATCHES':
      return ctx.stats?.matches ?? 0;
    case 'MOST_KILLS':
      return ctx.stats?.mostKillsInMatch ?? 0;
    case 'LOYALTY_DAYS':
      return ctx.loyaltyDays ?? 0;
    case 'POSTS':
      return ctx.postCount ?? 0;
    case 'TEAMS':
      return ctx.teamCount ?? 0;
    case 'TOURNAMENT_WINS':
      return ctx.tournamentWins ?? 0;
    case 'XP':
      return 0;
    default:
      return 0;
  }
}

export async function evaluateAchievements(userId: string): Promise<void> {
  const guild = await getGuild();
  const membership = await prisma.guildMembership.findUnique({
    where: { guildId_userId: { guildId: guild.id, userId } },
    select: { joinedAt: true },
  });
  if (!membership) return;

  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    include: { stats: true },
  });

  const ctx: AchievementContext = {
    userId,
    playerId: profile?.id,
    stats: profile?.stats
      ? {
          kills: profile.stats.kills,
          deaths: profile.stats.deaths,
          matches: profile.stats.matches,
          wins: profile.stats.wins,
          headshots: profile.stats.headshots,
          mvps: profile.stats.mvps,
          clutchWins: profile.stats.clutchWins,
          mostKillsInMatch: profile.stats.mostKillsInMatch,
          kdRatio: profile.stats.kdRatio,
        }
      : undefined,
    loyaltyDays: Math.floor((Date.now() - membership.joinedAt.getTime()) / 86_400_000),
  };

  const [postCount, teamCount, tournamentWins] = await Promise.all([
    prisma.post.count({ where: { authorId: userId, status: 'PUBLISHED' } }),
    prisma.teamMember.count({ where: { userId } }),
    prisma.tournament.count({ where: { winnerTeamId: { not: null } } }).then((all) =>
      prisma.tournamentParticipant
        .findMany({
          where: { team: { captainId: userId }, tournament: { winnerTeamId: { not: null } } },
          select: { tournamentId: true },
        })
        .then((rows) => rows.length),
    ),
  ]);
  ctx.postCount = postCount;
  ctx.teamCount = teamCount;
  ctx.tournamentWins = tournamentWins;

  const definitions = await prisma.achievement.findMany();
  const rows = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
  });
  const byKey = new Map(rows.map((r) => [r.achievement.key, r]));

  for (const def of definitions) {
    const value = requirementValue(ctx, def.requirementType);
    const progress = Math.min(value, def.requirementValue);
    const existing = byKey.get(def.key);
    if (existing) {
      if (!existing.unlocked && progress !== existing.progress) {
        await prisma.userAchievement.update({ where: { id: existing.id }, data: { progress } });
      }
      continue;
    }
    const created = await prisma.userAchievement.create({
      data: { userId, achievementId: def.id, progress },
    });
    if (progress >= def.requirementValue) {
      await unlock(created.id, def, userId);
    }
  }
}

export async function seedUserAchievements(userId: string, unlockedKeys: string[]): Promise<void> {
  const definitions = await prisma.achievement.findMany();
  for (const def of definitions) {
    const unlocked = unlockedKeys.includes(def.key);
    await prisma.userAchievement.create({
      data: {
        userId,
        achievementId: def.id,
        progress: unlocked ? def.requirementValue : 0,
        unlocked: unlocked,
        unlockedAt: unlocked ? new Date() : null,
      },
    });
  }
}

async function unlock(recordId: string, def: { key: string; name: string; icon: string; rewardXp: number; rarity: string }, userId: string): Promise<void> {
  await prisma.userAchievement.update({
    where: { id: recordId },
    data: { unlocked: true, unlockedAt: new Date() },
  });
  if (def.rewardXp > 0) {
    await grant({ userId, amount: def.rewardXp, reason: 'ACHIEVEMENT', detail: def.key });
  }
  const guild = await getGuild();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
  await prisma.notification.create({
    data: {
      userId,
      type: 'ACHIEVEMENT',
      title: `Achievement Unlocked: ${def.name}`,
      body: `${user?.displayName ?? 'You'} unlocked ${def.name}`,
      link: '/app/achievements',
    },
  });
  await prisma.guildActivity.create({
    data: {
      guildId: guild.id,
      actorId: userId,
      type: 'ACHIEVEMENT',
      message: `${user?.displayName ?? 'A member'} unlocked ${def.name} (${def.rarity})`,
      payload: JSON.stringify({ achievementKey: def.key, icon: def.icon, rarity: def.rarity }),
    },
  });
}

export async function listAchievements(userId: string) {
  const definitions = await prisma.achievement.findMany({ orderBy: { order: 'asc' } });
  const rows = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
  });
  const byKey = new Map(rows.map((r) => [r.achievement.key, r]));
  return definitions.map((def) => {
    const row = byKey.get(def.key);
    return {
      ...def,
      progress: row?.progress ?? 0,
      unlocked: row?.unlocked ?? false,
      unlockedAt: row?.unlockedAt ?? null,
      percent: Math.min(Math.round(((row?.progress ?? 0) / def.requirementValue) * 100), 100),
    };
  });
}

export async function adminCreateAchievement(input: {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  requirementType: string;
  requirementValue: number;
  rewardXp: number;
}): Promise<void> {
  if (input.rewardXp < 0 || input.requirementValue < 1) {
    throw new AppError(400, 'INVALID_ACHIEVEMENT', 'Invalid achievement values');
  }
  const def = ACHIEVEMENTS.find((a) => a.key === input.key);
  const order = def?.order ?? 100;
  await prisma.achievement.upsert({
    where: { key: input.key },
    create: { ...input, order },
    update: { ...input, order },
  });
}