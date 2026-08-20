import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { XP_RULES, guildLevelFromXp, guildXpForLevel } from '../utils/constants';

export interface GrantInput {
  userId: string;
  amount: number;
  reason: string;
  detail?: string;
  kind?: 'EARN' | 'SPEND' | 'ADJUST';
}

export async function getGuild() {
  const guild = await prisma.guild.findFirst();
  if (!guild) {
    throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  }
  return guild;
}

export async function grant(input: GrantInput): Promise<{ guildXp: number; seasonXp: number }> {
  const amount = Math.round(input.amount);
  const guild = await getGuild();
  const membership = await prisma.guildMembership.findUnique({
    where: { guildId_userId: { guildId: guild.id, userId: input.userId } },
  });
  if (!membership) {
    throw new AppError(403, 'NOT_A_MEMBER', 'User is not a guild member');
  }
  const sign = input.kind === 'SPEND' ? -1 : input.kind === 'ADJUST' ? Math.sign(amount) : 1;
  const actual = Math.abs(amount) * sign;
  if (actual === 0) {
    return { guildXp: membership.guildXp, seasonXp: membership.seasonXp };
  }

  await prisma.guildXPTransaction.create({
    data: {
      userId: input.userId,
      amount: actual,
      kind: input.kind ?? 'EARN',
      reason: input.reason,
      detail: input.detail ?? null,
    },
  });

  const updated = await prisma.guildMembership.update({
    where: { id: membership.id },
    data: {
      guildXp: { increment: actual },
      seasonXp: { increment: actual > 0 ? actual : 0 },
    },
  });

  if (actual > 0) {
    const guildShare = Math.max(Math.round(actual * XP_RULES.GUILD_SHARE), 1);
    await prisma.guild.update({ where: { id: guild.id }, data: { xp: { increment: guildShare } } });
    const guildAfter = await prisma.guild.findUnique({ where: { id: guild.id } });
    if (guildAfter && guildLevelFromXp(guildAfter.xp) > guildAfter.level) {
      const newLevel = guildLevelFromXp(guildAfter.xp);
      await prisma.guild.update({ where: { id: guild.id }, data: { level: newLevel } });
      await prisma.guildActivity.create({
        data: {
          guildId: guild.id,
          actorId: input.userId,
          type: 'GUILD_LEVEL',
          message: `KINGS ONLY reached level ${newLevel}`,
        },
      });
      const members = await prisma.guildMembership.findMany({
        where: { guildId: guild.id },
        select: { userId: true },
      });
      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          type: 'GUILD',
          title: `Guild Level ${newLevel}`,
          body: 'The guild levelled up. Everyone earns it together.',
          link: '/app',
        })),
      });
    }
  }

  return { guildXp: updated.guildXp, seasonXp: updated.seasonXp };
}

export async function guildProgress(guildId: string): Promise<{
  xp: number;
  level: number;
  nextLevelXp: number;
  progress: number;
  span: number;
  percent: number;
}> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) throw new AppError(404, 'GUILD_NOT_FOUND', 'Guild not found');
  const level = guild.level;
  const currentFloor = guildXpForLevel(level);
  const nextFloor = guildXpForLevel(level + 1);
  const span = nextFloor - currentFloor;
  const progress = guild.xp - currentFloor;
  return {
    xp: guild.xp,
    level,
    nextLevelXp: nextFloor,
    progress,
    span,
    percent: span > 0 ? Math.min(Math.round((progress / span) * 100), 100) : 100,
  };
}