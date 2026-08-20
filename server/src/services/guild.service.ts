import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { guildProgress } from './xp.service';
import { activeSeason } from './season.service';
import { playerSanitized } from '../utils/serializers';

export async function getGuildOverview() {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  const [memberCount, onlineCount, pendingRequests, upcomingEvents, activeChallenges, progress, season] =
    await Promise.all([
      prisma.guildMembership.count({ where: { guildId: guild.id } }),
      prisma.user.count({
        where: { lastSeenAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
      }),
      prisma.joinRequest.count({ where: { guildId: guild.id, status: 'PENDING' } }),
      prisma.event.count({
        where: { status: { in: ['SCHEDULED', 'ONGOING'] } },
      }),
      prisma.challenge.count({ where: { guildId: guild.id, status: 'ACTIVE' } }),
      guildProgress(guild.id),
      activeSeason(guild.id),
    ]);
  const [weeklyXp, totals] = await Promise.all([
    prisma.guildXPTransaction.aggregate({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
        kind: 'EARN',
      },
      _sum: { amount: true },
    }),
    prisma.freeFireStats.aggregate({ _sum: { kills: true, wins: true } }),
  ]);
  return {
    id: guild.id,
    name: guild.name,
    tag: guild.tag,
    region: guild.region,
    description: guild.description,
    motto: guild.motto,
    level: guild.level,
    xp: guild.xp,
    nextLevelXp: progress.nextLevelXp,
    progressPercent: progress.percent,
    progressToNext: progress.progress,
    memberCount,
    onlineCount,
    pendingRequests,
    upcomingEvents,
    activeChallenges,
    season,
    weeklyXp: weeklyXp._sum.amount ?? 0,
    guildKills: totals._sum.kills ?? 0,
    guildWins: totals._sum.wins ?? 0,
  };
}

export async function getDashboard(userId: string) {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  const membership = await prisma.guildMembership.findUnique({
    where: { guildId_userId: { guildId: guild.id, userId } },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
          lastSeenAt: true,
          profile: {
            select: {
              rank: true,
              rankPoints: true,
              playerRole: true,
              level: true,
              region: true,
              lastSyncAt: true,
              lastSyncProvider: true,
              stats: true,
            },
          },
        },
      },
    },
  });
  if (!membership) {
    throw new AppError(403, 'NOT_A_MEMBER', 'Join the guild to view the dashboard');
  }

  const [overview, nextEvent, activeChallenge, activity, leaderboardPreview, myAchievements, unreadCount, announcements] =
    await Promise.all([
      getGuildOverview(),
      prisma.event.findFirst({
        where: { status: { in: ['SCHEDULED', 'ONGOING'] } },
        orderBy: { startsAt: 'asc' },
        include: { participants: true },
      }),
      prisma.challenge.findFirst({
        where: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
        orderBy: { endsAt: 'asc' },
        include: { progress: { where: { userId } } },
      }),
      prisma.guildActivity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { actor: { select: { id: true, displayName: true, avatarUrl: true } } },
      }),
      prisma.guildMembership.findMany({
        where: { guildId: guild.id },
        orderBy: { guildXp: 'desc' },
        take: 5,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              profile: { select: { rank: true, rankPoints: true, stats: true } },
            },
          },
        },
      }),
      prisma.userAchievement.findMany({
        where: { userId, unlocked: true },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
        take: 5,
      }),
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.announcement.findMany({
        where: {
          publishedAt: { not: null },
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        take: 3,
        include: { author: { select: { displayName: true } } },
      }),
    ]);

  return {
    overview,
    me: {
      ...playerSanitized(membership.user, membership),
      unreadCount,
    },
    nextEvent: nextEvent
      ? {
          id: nextEvent.id,
          title: nextEvent.title,
          type: nextEvent.type,
          startsAt: nextEvent.startsAt,
          endsAt: nextEvent.endsAt,
          status: nextEvent.status,
          joined: nextEvent.participants.some((p) => p.userId === userId),
          participants: nextEvent.participants.length,
          maxParticipants: nextEvent.maxParticipants,
        }
      : null,
    activeChallenge: activeChallenge
      ? {
          id: activeChallenge.id,
          title: activeChallenge.title,
          description: activeChallenge.description,
          metric: activeChallenge.metric,
          goal: activeChallenge.goal,
          rewardXp: activeChallenge.rewardXp,
          endsAt: activeChallenge.endsAt,
          progress: activeChallenge.progress.reduce((s, p) => s + p.progress, 0),
          myProgress: activeChallenge.progress.find((p) => p.userId === userId)?.progress ?? 0,
          percent: Math.min(
            Math.round(
              (activeChallenge.progress.reduce((s, p) => s + p.progress, 0) / activeChallenge.goal) * 100,
            ),
            100,
          ),
        }
      : null,
    activity,
    leaderboardPreview: leaderboardPreview.map((m, i) => ({
      rank: i + 1,
      id: m.user.id,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
      rankTier: m.user.profile?.rank ?? 'BRONZE',
      rankPoints: m.user.profile?.rankPoints ?? 0,
      guildXp: m.guildXp,
      kd: m.user.profile?.stats?.kdRatio ?? 0,
      wins: m.user.profile?.stats?.wins ?? 0,
    })),
    myAchievements: myAchievements.map((a) => ({
      id: a.achievement.id,
      key: a.achievement.key,
      name: a.achievement.name,
      icon: a.achievement.icon,
      rarity: a.achievement.rarity,
      unlockedAt: a.unlockedAt,
    })),
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      priority: a.priority,
      pinned: a.pinned,
      createdAt: a.createdAt,
      author: a.author.displayName,
    })),
  };
}

export async function getGuildActivity(page = 1, pageSize = 20) {
  const guild = await prisma.guild.findFirst();
  if (!guild) return { items: [], total: 0, page, pageSize, totalPages: 1 };
  const [items, total] = await Promise.all([
    prisma.guildActivity.findMany({
      where: { guildId: guild.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { id: true, displayName: true, avatarUrl: true } } },
    }),
    prisma.guildActivity.count({ where: { guildId: guild.id } }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}

export async function updateGuildSettings(input: {
  name?: string;
  tag?: string;
  region?: string;
  description?: string;
  motto?: string;
}) {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name.trim().slice(0, 40);
  if (input.tag !== undefined) data.tag = input.tag.trim().slice(0, 8).toUpperCase();
  if (input.region !== undefined) data.region = input.region;
  if (input.description !== undefined) data.description = input.description.trim().slice(0, 400) || null;
  if (input.motto !== undefined) data.motto = input.motto.trim().slice(0, 120) || null;
  await prisma.guild.update({ where: { id: guild.id }, data });
}