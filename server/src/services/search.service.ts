import { prisma } from '../lib/prisma';

export async function searchGuild(query: string) {
  const q = query.trim();
  if (!q || q.length < 2) {
    return { members: [], teams: [], events: [], posts: [], challenges: [] };
  }
  const contains = (field: string) => ({
    contains: q,
  });

  const [members, teams, events, posts, challenges] = await Promise.all([
    prisma.guildMembership.findMany({
      where: {
        user: {
          OR: [
            { displayName: contains('displayName') },
            { username: contains('username') },
            { profile: { ffNickname: contains('ffNickname') } },
          ],
        },
      },
      take: 5,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            profile: { select: { rank: true, playerRole: true } },
          },
        },
      },
    }),
    prisma.team.findMany({ where: { name: contains('name') }, take: 5, select: { id: true, name: true, tag: true, wins: true, matches: true } }),
    prisma.event.findMany({
      where: { OR: [{ title: contains('title') }, { description: contains('description') }] },
      take: 5,
      select: { id: true, title: true, type: true, startsAt: true, status: true },
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED', OR: [{ content: contains('content') }] },
      take: 5,
      select: { id: true, content: true, type: true, createdAt: true, authorId: true },
    }),
    prisma.challenge.findMany({
      where: { OR: [{ title: contains('title') }, { description: contains('description') }] },
      take: 5,
      select: { id: true, title: true, metric: true, status: true, endsAt: true },
    }),
  ]);

  return {
    members: members.map((m) => ({
      id: m.user.id,
      displayName: m.user.displayName,
      username: m.user.username,
      avatarUrl: m.user.avatarUrl,
      rank: m.user.profile?.rank ?? 'BRONZE',
      playerRole: m.user.profile?.playerRole ?? 'FLEX',
      guildRole: m.guildRole,
    })),
    teams,
    events,
    posts,
    challenges,
  };
}