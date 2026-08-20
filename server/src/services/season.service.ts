import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { captureSnapshots } from './leaderboard.service';
import { recordActivity } from './activity.service';

export async function activeSeason(guildId?: string) {
  const guild = guildId
    ? await prisma.guild.findUnique({ where: { id: guildId } })
    : await prisma.guild.findFirst();
  if (!guild) return null;
  const season = await prisma.season.findFirst({
    where: { guildId: guild.id, status: 'ACTIVE' },
  });
  if (!season) return null;
  const remainingMs = season.endsAt.getTime() - Date.now();
  return {
    id: season.id,
    number: season.number,
    name: season.name,
    startsAt: season.startsAt,
    endsAt: season.endsAt,
    remainingDays: Math.max(Math.ceil(remainingMs / 86_400_000), 0),
    status: season.status,
  };
}

export async function seasonHistory() {
  const guild = await prisma.guild.findFirst();
  if (!guild) return [];
  return prisma.season.findMany({
    where: { guildId: guild.id },
    orderBy: { number: 'desc' },
    take: 10,
    include: {
      snapshots: {
        where: { category: 'OVERALL' },
        orderBy: { rank: 'asc' },
        take: 5,
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      },
    },
  });
}

export async function endSeason(seasonId: string, adminId: string): Promise<void> {
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new AppError(404, 'NOT_FOUND', 'Season not found');
  if (season.status !== 'ACTIVE') throw new AppError(400, 'INVALID_STATE', 'Season is not active');
  await captureSnapshots(season.id);
  const guild = await prisma.guild.findUnique({ where: { id: season.guildId } });
  if (!guild) throw new AppError(404, 'GUILD_NOT_FOUND', 'Guild not found');
  await prisma.season.update({ where: { id: seasonId }, data: { status: 'ENDED' } });
  const nextNumber = season.number + 1;
  const startsAt = season.endsAt;
  const endsAt = new Date(startsAt.getTime() + 28 * 86_400_000);
  await prisma.season.create({
    data: {
      guildId: guild.id,
      number: nextNumber,
      name: `SEASON ${String(nextNumber).padStart(2, '0')}`,
      startsAt,
      endsAt,
      status: 'ACTIVE',
    },
  });
  await prisma.guildMembership.updateMany({
    where: { guildId: guild.id },
    data: { seasonXp: 0 },
  });
  await recordActivity({
    guildId: guild.id,
    actorId: adminId,
    type: 'SEASON_END',
    message: `Season ${String(season.number).padStart(2, '0')} ended — ${String(nextNumber).padStart(2, '0')} begins`,
  });
}

export async function getSeasonStats(seasonId: string) {
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new AppError(404, 'NOT_FOUND', 'Season not found');
  const xpRows = await prisma.guildXPTransaction.findMany({
    where: {
      createdAt: { gte: season.startsAt, lte: season.endsAt },
      kind: 'EARN',
    },
  });
  const totalXp = xpRows.reduce((sum, r) => sum + r.amount, 0);
  const [wins, kills, mvps, challenges] = await Promise.all([
    prisma.freeFireStats.aggregate({ _sum: { wins: true } }),
    prisma.freeFireStats.aggregate({ _sum: { kills: true } }),
    prisma.freeFireStats.aggregate({ _sum: { mvps: true } }),
    prisma.challenge.count({ where: { status: 'COMPLETED', completedAt: { gte: season.startsAt, lte: season.endsAt } } }),
  ]);
  return {
    season: { id: season.id, name: season.name, number: season.number },
    totalXp,
    wins: wins._sum.wins ?? 0,
    kills: kills._sum.kills ?? 0,
    mvps: mvps._sum.mvps ?? 0,
    challengesCompleted: challenges,
  };
}