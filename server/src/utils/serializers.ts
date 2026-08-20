import type { FreeFireStats, PlayerProfile, User } from '@prisma/client';

type UserSelect = Pick<
  User,
  'id' | 'displayName' | 'username' | 'avatarUrl' | 'role' | 'lastSeenAt'
> & { profile: (Pick<PlayerProfile, 'rank' | 'rankPoints' | 'playerRole' | 'level' | 'region' | 'lastSyncAt' | 'lastSyncProvider'> & { stats: FreeFireStats | null }) | null };

export function playerSanitized(
  user: UserSelect,
  membership: { guildRole: string; guildXp: number; seasonXp: number; joinedAt: Date },
) {
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role,
    lastSeenAt: user.lastSeenAt,
    guildRole: membership.guildRole,
    guildXp: membership.guildXp,
    seasonXp: membership.seasonXp,
    joinedAt: membership.joinedAt,
    rank: user.profile?.rank ?? 'BRONZE',
    rankPoints: user.profile?.rankPoints ?? 0,
    playerRole: user.profile?.playerRole ?? 'FLEX',
    level: user.profile?.level ?? 1,
    region: user.profile?.region ?? 'MENA',
    lastSyncAt: user.profile?.lastSyncAt ?? null,
    lastSyncProvider: user.profile?.lastSyncProvider ?? null,
    stats: user.profile?.stats ?? null,
  };
}