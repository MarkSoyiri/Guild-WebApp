import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { playerSanitized } from '../utils/serializers';

export async function adminMemberList(input: { page?: number; pageSize?: number; search?: string; guildRole?: string }) {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  const where: Record<string, unknown> = { guildId: guild.id };
  if (input.guildRole) where.guildRole = input.guildRole;
  if (input.search) {
    where.user = {
      OR: [
        { displayName: { contains: input.search } },
        { username: { contains: input.search } },
        { email: { contains: input.search } },
        { profile: { ffNickname: { contains: input.search } } },
      ],
    };
  }
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 100);
  const [items, total] = await Promise.all([
    prisma.guildMembership.findMany({
      where,
      orderBy: { joinedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            email: true,
            avatarUrl: true,
            role: true,
            status: true,
            lastSeenAt: true,
            createdAt: true,
            profile: { select: { rank: true, playerRole: true, lastSyncAt: true, lastSyncProvider: true } },
          },
        },
      },
    }),
    prisma.guildMembership.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}

export async function setMemberGuildRole(membershipId: string, guildRole: string): Promise<void> {
  const allowed = ['LEADER', 'OFFICER', 'MEMBER', 'TRIAL'];
  if (!allowed.includes(guildRole)) {
    throw new AppError(400, 'INVALID_ROLE', 'Invalid guild role');
  }
  const membership = await prisma.guildMembership.findUnique({ where: { id: membershipId } });
  if (!membership) throw new AppError(404, 'NOT_FOUND', 'Membership not found');
  await prisma.guildMembership.update({ where: { id: membershipId }, data: { guildRole } });
}

export async function setUserRole(userId: string, role: string): Promise<void> {
  const allowed = ['SUPER_ADMIN', 'GUILD_ADMIN', 'MODERATOR', 'MEMBER'];
  if (!allowed.includes(role)) {
    throw new AppError(400, 'INVALID_ROLE', 'Invalid role');
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  if (user.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
    throw new AppError(400, 'LAST_SUPER_ADMIN', 'Cannot demote the last super admin');
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
}

export async function removeMember(userId: string, adminId: string): Promise<void> {
  if (userId === adminId) throw new AppError(400, 'CANNOT_REMOVE_SELF', 'You cannot remove yourself');
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  const membership = await prisma.guildMembership.findUnique({
    where: { guildId_userId: { guildId: guild.id, userId } },
  });
  if (!membership) throw new AppError(404, 'NOT_FOUND', 'Member not found');
  await prisma.guildMembership.delete({ where: { id: membership.id } });
  await prisma.notification.create({
    data: {
      userId,
      type: 'GUILD',
      title: 'You were removed from KINGS ONLY',
      body: 'Your membership was ended by leadership.',
    },
  });
}

export async function pendingJoinRequests() {
  const guild = await prisma.guild.findFirst();
  if (!guild) return [];
  return prisma.joinRequest.findMany({
    where: { guildId: guild.id, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { id: true, displayName: true, username: true, avatarUrl: true, email: true, createdAt: true },
      },
    },
  });
}

export async function memberActivity(userId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [posts, comments, matches, xp, events] = await Promise.all([
    prisma.post.count({ where: { authorId: userId, createdAt: { gte: since } } }),
    prisma.comment.count({ where: { authorId: userId, createdAt: { gte: since } } }),
    prisma.freeFireMatch.count({ where: { player: { userId }, playedAt: { gte: since } } }),
    prisma.guildXPTransaction.aggregate({
      where: { userId, createdAt: { gte: since }, kind: 'EARN' },
      _sum: { amount: true },
    }),
    prisma.eventParticipant.count({ where: { userId, joinedAt: { gte: since } } }),
  ]);
  return { posts, comments, matches, xp: xp._sum.amount ?? 0, events, days };
}

export async function adminStats() {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  const [members, activeMembers, pending, events, challenges, syncStatus, syncFailures, online] =
    await Promise.all([
      prisma.guildMembership.count({ where: { guildId: guild.id } }),
      prisma.guildMembership.count({
        where: { guildId: guild.id, joinedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      }),
      prisma.joinRequest.count({ where: { guildId: guild.id, status: 'PENDING' } }),
      prisma.event.count({ where: { status: { in: ['SCHEDULED', 'ONGOING'] } } }),
      prisma.challenge.count({ where: { status: 'ACTIVE' } }),
      prisma.syncLog.findFirst({ orderBy: { createdAt: 'desc' } }),
      prisma.syncLog.count({ where: { status: 'FAILED' } }),
      prisma.user.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } } }),
    ]);
  return {
    members,
    activeMembers,
    pendingRequests: pending,
    upcomingEvents: events,
    activeChallenges: challenges,
    online,
    syncFailures,
    lastSync: syncStatus ? { at: syncStatus.createdAt, status: syncStatus.status, provider: syncStatus.provider } : null,
  };
}

export function memberCsvRow(user: {
  displayName: string;
  username: string;
  email: string;
  guildRole: string;
  guildXp: number;
  joinedAt: Date;
  profile: { rank: string; playerRole: string; lastSyncAt: Date | null } | null;
}) {
  return [
    user.displayName,
    user.username,
    user.email,
    user.guildRole,
    String(user.guildXp),
    user.joinedAt.toISOString(),
    user.profile?.rank ?? '',
    user.profile?.playerRole ?? '',
    user.profile?.lastSyncAt?.toISOString() ?? '',
  ];
}