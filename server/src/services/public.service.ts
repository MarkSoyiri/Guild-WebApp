import { prisma } from '../lib/prisma';

export async function publicLanding() {
  const guild = await prisma.guild.findFirst();
  if (!guild) return null;
  const [topPlayers, activity, upcomingEvents, activeChallenge, achievements, memberCount, onlineCount] =
    await Promise.all([
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
              profile: { select: { rank: true, rankPoints: true, playerRole: true, stats: true } },
            },
          },
        },
      }),
      prisma.guildActivity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { actor: { select: { id: true, displayName: true, avatarUrl: true } } },
      }),
      prisma.event.findMany({
        where: { status: { in: ['SCHEDULED', 'ONGOING'] } },
        orderBy: { startsAt: 'asc' },
        take: 4,
        select: { id: true, title: true, type: true, startsAt: true, maxParticipants: true, _count: { select: { participants: true } } },
      }),
      prisma.challenge.findFirst({
        where: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
        orderBy: { endsAt: 'asc' },
        include: { progress: true },
      }),
      prisma.achievement.findMany({ orderBy: { order: 'asc' }, take: 6 }),
      prisma.guildMembership.count({ where: { guildId: guild.id } }),
      prisma.user.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } } }),
    ]);
  const wins = await prisma.freeFireStats.aggregate({ _sum: { wins: true, kills: true } });
  const avgKd = await prisma.freeFireStats.aggregate({ _avg: { kdRatio: true } });
  return {
    guild: {
      id: guild.id,
      name: guild.name,
      tag: guild.tag,
      region: guild.region,
      motto: guild.motto,
      description: guild.description,
      level: guild.level,
      xp: guild.xp,
      memberCount,
      onlineCount,
    },
    wins: wins._sum.wins ?? 0,
    kills: wins._sum.kills ?? 0,
    avgKd: Math.round((avgKd._avg.kdRatio ?? 0) * 100) / 100,
    topPlayers: topPlayers.map((m, i) => ({
      rank: i + 1,
      id: m.user.id,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
      rankTier: m.user.profile?.rank ?? 'BRONZE',
      rankPoints: m.user.profile?.rankPoints ?? 0,
      playerRole: m.user.profile?.playerRole ?? 'FLEX',
      kd: m.user.profile?.stats?.kdRatio ?? 0,
      wins: m.user.profile?.stats?.wins ?? 0,
    })),
    activity: activity.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      payload: a.payload,
      createdAt: a.createdAt,
      actor: a.actor
        ? { id: a.actor.id, displayName: a.actor.displayName, avatarUrl: a.actor.avatarUrl }
        : null,
    })),
    events: upcomingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      startsAt: e.startsAt,
      maxParticipants: e.maxParticipants,
      participants: e._count.participants,
    })),
    challenge: activeChallenge
      ? {
          id: activeChallenge.id,
          title: activeChallenge.title,
          metric: activeChallenge.metric,
          goal: activeChallenge.goal,
          rewardXp: activeChallenge.rewardXp,
          endsAt: activeChallenge.endsAt,
          progress: activeChallenge.progress.reduce((s, p) => s + p.progress, 0),
          percent: Math.min(
            Math.round((activeChallenge.progress.reduce((s, p) => s + p.progress, 0) / activeChallenge.goal) * 100),
            100,
          ),
        }
      : null,
    achievements: achievements.map((a) => ({
      key: a.key,
      name: a.name,
      icon: a.icon,
      rarity: a.rarity,
      description: a.description,
    })),
  };
}