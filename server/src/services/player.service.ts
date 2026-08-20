import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { playerSanitized } from '../utils/serializers';

export async function listPlayers(input: { page?: number; pageSize?: number; role?: string; rank?: string; search?: string }) {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  const where: Record<string, unknown> = { guildId: guild.id };
  if (input.role) where.user = { profile: { playerRole: input.role } };
  if (input.rank) where.user = { ...(where.user as Record<string, unknown>), profile: { playerRole: input.role ?? undefined, rank: input.rank } };
  if (input.search) {
    where.user = {
      OR: [
        { displayName: { contains: input.search } },
        { username: { contains: input.search } },
        { profile: { ffNickname: { contains: input.search } } },
      ],
    };
  }
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 100);
  const [memberships, total] = await Promise.all([
    prisma.guildMembership.findMany({
      where,
      orderBy: { guildXp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    }),
    prisma.guildMembership.count({ where }),
  ]);
  return {
    items: memberships.map((m) => ({ ...playerSanitized(m.user, m), isMember: true })),
    total,
    page,
    pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export async function getPlayer(userId: string, viewerId?: string) {
  const isSelf = viewerId === userId;
  const membership = await prisma.guildMembership.findFirst({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
          lastSeenAt: true,
          createdAt: true,
          profile: {
            include: {
              stats: true,
            },
          },
        },
      },
      guild: true,
    },
  });
  const user = membership?.user ?? (await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      role: true,
      lastSeenAt: true,
      createdAt: true,
      profile: {
        include: {
          stats: true,
        },
      },
    },
  }));
  if (!membership && !isSelf) throw new AppError(404, 'NOT_FOUND', 'Player not found');
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Player not found');

  const [achievements, recentMatches, team, recentActivity] = await Promise.all([
    prisma.userAchievement.findMany({
      where: { userId, unlocked: true },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
      take: 12,
    }),
    prisma.freeFireMatch.findMany({
      where: { playerId: user.profile?.id ?? '' },
      orderBy: { playedAt: 'desc' },
      take: 10,
    }),
    prisma.teamMember.findFirst({
      where: { userId },
      include: { team: { select: { id: true, name: true, tag: true } } },
    }),
    prisma.guildActivity.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  const player = {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role,
    lastSeenAt: user.lastSeenAt,
    createdAt: user.createdAt,
    guildRole: membership?.guildRole ?? null,
    guildXp: membership?.guildXp ?? 0,
    seasonXp: membership?.seasonXp ?? 0,
    joinedAt: membership?.joinedAt ?? null,
    profile: user.profile,
    team: team ? { id: team.team.id, name: team.team.name, tag: team.team.tag } : null,
    isViewer: isSelf,
  };

  return {
    ...player,
    achievements: achievements.map((a) => ({
      id: a.achievement.id,
      key: a.achievement.key,
      name: a.achievement.name,
      icon: a.achievement.icon,
      rarity: a.achievement.rarity,
      unlockedAt: a.unlockedAt,
    })),
    recentMatches,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      createdAt: a.createdAt,
    })),
  };
}

export async function updateMyProfile(
  userId: string,
  input: {
    displayName?: string;
    ffUid?: string;
    ffNickname?: string;
    region?: string;
    playerRole?: string;
    rank?: string;
    rankPoints?: number;
  },
): Promise<void> {
  const profile = await prisma.playerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Player profile not found');

  const data: Record<string, unknown> = {};
  if (input.displayName !== undefined) {
    const displayName = input.displayName.trim();
    if (displayName.length < 2 || displayName.length > 24) {
      throw new AppError(400, 'INVALID_NAME', 'Display name must be 2–24 characters');
    }
    await prisma.user.update({ where: { id: userId }, data: { displayName } });
  }
  if (input.ffUid !== undefined) {
    const ffUid = input.ffUid.trim();
    if (ffUid && !/^\d{4,20}$/.test(ffUid)) {
      throw new AppError(400, 'INVALID_UID', 'Free Fire UID must be numeric');
    }
    if (ffUid) {
      const taken = await prisma.playerProfile.findUnique({ where: { ffUid } });
      if (taken && taken.userId !== userId) {
        throw new AppError(409, 'UID_TAKEN', 'That Free Fire UID is linked to another account');
      }
    }
    data.ffUid = ffUid || null;
  }
  if (input.ffNickname !== undefined) data.ffNickname = input.ffNickname.trim().slice(0, 24) || null;
  if (input.region !== undefined) data.region = input.region;
  if (input.playerRole !== undefined) data.playerRole = input.playerRole;
  if (input.rank !== undefined) data.rank = input.rank;
  if (input.rankPoints !== undefined) data.rankPoints = input.rankPoints;

  await prisma.playerProfile.update({ where: { userId }, data });
}

export async function getMyMatches(userId: string, page = 1) {
  const profile = await prisma.playerProfile.findUnique({ where: { userId } });
  if (!profile) return { items: [], total: 0, page, pageSize: 20, totalPages: 1 };
  const pageSize = 20;
  const [items, total] = await Promise.all([
    prisma.freeFireMatch.findMany({
      where: { playerId: profile.id },
      orderBy: { playedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.freeFireMatch.count({ where: { playerId: profile.id } }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}