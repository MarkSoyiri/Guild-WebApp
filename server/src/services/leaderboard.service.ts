import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

interface BoardRow {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  guildRole: string;
  guildXp: number;
  seasonXp: number;
  rank: string;
  rankPoints: number;
  playerRole: string;
  level: number;
  lastSyncAt: Date | null;
  lastSyncProvider: string | null;
  stats: unknown;
  weeklyScore: number;
  monthlyScore: number;
  activeScore: number;
  improvedScore: number;
  value: number;
  position: number;
  movement: number;
}

function rowValue(row: Omit<BoardRow, 'value' | 'position' | 'movement'>, category: string): number {
  switch (category) {
    case 'WINS':
      return (row.stats as { wins?: number } | null)?.wins ?? 0;
    case 'KILLS':
      return (row.stats as { kills?: number } | null)?.kills ?? 0;
    case 'KD':
      return (row.stats as { kdRatio?: number } | null)?.kdRatio ?? 0;
    case 'HEADSHOTS':
      return (row.stats as { headshots?: number } | null)?.headshots ?? 0;
    case 'MVP':
      return (row.stats as { mvps?: number } | null)?.mvps ?? 0;
    case 'MATCHES':
      return (row.stats as { matches?: number } | null)?.matches ?? 0;
    case 'GUILD_XP':
      return row.guildXp;
    case 'WEEKLY':
      return row.weeklyScore;
    case 'MONTHLY':
      return row.monthlyScore;
    case 'ACTIVE':
      return row.activeScore;
    case 'IMPROVED':
      return row.improvedScore;
    default:
      return row.rankPoints;
  }
}

export async function getLeaderboard(input: {
  category: string;
  seasonId?: string;
  limit?: number;
  page?: number;
}) {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.limit ?? 20, 1), 100);

  let season = null;
  if (input.seasonId) {
    season = await prisma.season.findUnique({ where: { id: input.seasonId } });
    if (!season) throw new AppError(404, 'NOT_FOUND', 'Season not found');
  } else {
    season = await prisma.season.findFirst({
      where: { status: 'ACTIVE', guildId: guild.id },
    });
  }

  const memberships = await prisma.guildMembership.findMany({
    where: { guildId: guild.id },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
          profile: {
            select: {
              rank: true,
              rankPoints: true,
              playerRole: true,
              level: true,
              lastSyncAt: true,
              lastSyncProvider: true,
              stats: true,
            },
          },
        },
      },
    },
  });

  const activeSeason = season;
  let seasonXpMap = new Map<string, number>();
  if (activeSeason) {
    const snapshots = await prisma.leaderboardSnapshot.findMany({
      where: { seasonId: activeSeason.id, category: 'GUILD_XP' },
      select: { userId: true, value: true },
    });
    seasonXpMap = new Map(snapshots.map((s) => [s.userId, s.value]));
  }

  const rows = memberships.map((m) => {
    const stats = m.user.profile?.stats;
    const weeklyScore = (stats?.weeklyKills ?? 0) + (stats?.weeklyWins ?? 0) * 3;
    const monthlyScore = (stats?.monthlyKills ?? 0) + (stats?.monthlyWins ?? 0) * 3;
    const activeScore =
      (stats?.weeklyMatches ?? 0) + (stats?.weeklyMvps ?? 0) * 2 + (stats?.weeklyWins ?? 0) * 3;
    const improvedScore = (stats?.weeklyKills ?? 0) + (stats?.weeklyWins ?? 0);
    return {
      userId: m.user.id,
      displayName: m.user.displayName,
      username: m.user.username,
      avatarUrl: m.user.avatarUrl,
      guildRole: m.guildRole,
      guildXp: m.guildXp,
      seasonXp: seasonXpMap.get(m.user.id) ?? m.seasonXp,
      rank: m.user.profile?.rank ?? 'BRONZE',
      rankPoints: m.user.profile?.rankPoints ?? 0,
      playerRole: m.user.profile?.playerRole ?? 'FLEX',
      level: m.user.profile?.level ?? 1,
      lastSyncAt: m.user.profile?.lastSyncAt ?? null,
      lastSyncProvider: m.user.profile?.lastSyncProvider ?? null,
      stats,
      weeklyScore,
      monthlyScore,
      activeScore,
      improvedScore,
    };
  });

  const category =
    input.category === 'XP' ? 'GUILD_XP' : input.category === 'MVPS' ? 'MVP' : input.category;

  const ranked = rows
    .map((row) => ({ ...row, value: rowValue(row, category) }))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .map((row, index) => ({ ...row, position: index + 1 }));
  const total = ranked.length;
  const items = ranked.slice((page - 1) * pageSize, page * pageSize);

  const previous = await prisma.leaderboardSnapshot.findMany({
    where: {
      category,
      seasonId: activeSeason?.id ?? undefined,
      capturedAt: { lt: new Date() },
    },
    orderBy: { capturedAt: 'desc' },
    take: ranked.length > 0 ? ranked.length : 1,
  });
  const prevRankByUser = new Map(previous.map((p) => [p.userId, p.rank]));

  return {
    category,
    season: activeSeason
      ? {
          id: activeSeason.id,
          name: activeSeason.name,
          number: activeSeason.number,
          remainingDays: Math.max(0, Math.ceil((activeSeason.endsAt.getTime() - Date.now()) / 86_400_000)),
        }
      : null,
    items: items.map((row) => ({
      ...row,
      movement: (() => {
        const prev = prevRankByUser.get(row.userId);
        if (prev === undefined) return 0;
        return prev - row.position;
      })(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export async function captureSnapshots(seasonId: string): Promise<void> {
  const categories = ['OVERALL', 'WEEKLY', 'MONTHLY', 'WINS', 'KILLS', 'KD', 'HEADSHOTS', 'GUILD_XP', 'MVP', 'ACTIVE', 'IMPROVED'];
  for (const category of categories) {
    const board = await getLeaderboard({ category, seasonId, limit: 100 });
    if (board.items.length === 0) continue;
    await prisma.leaderboardSnapshot.createMany({
      data: board.items.map((row, index) => ({
        seasonId,
        userId: row.userId,
        category,
        rank: index + 1,
        value: Number(row.value ?? 0),
        capturedAt: new Date(),
      })),
    });
  }
}