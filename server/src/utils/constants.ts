export const RANKS = [
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'DIAMOND',
  'HEROIC',
  'GRANDMASTER',
] as const;

export type Rank = (typeof RANKS)[number];

export const RANK_POINT_FLOORS: Record<Rank, number> = {
  BRONZE: 0,
  SILVER: 400,
  GOLD: 800,
  PLATINUM: 1200,
  DIAMOND: 1600,
  HEROIC: 2000,
  GRANDMASTER: 2600,
};

export const PLAYER_ROLES = ['RUSHER', 'SNIPER', 'SUPPORT', 'IGL', 'FLEX', 'ENTRY', 'OTHER'] as const;

export const REGIONS = ['MENA', 'NA', 'SA', 'EU', 'ASIA', 'IN', 'SEA', 'LATAM'] as const;

export const EVENT_TYPES = ['CUSTOM_ROOM', 'TOURNAMENT', 'PRACTICE', 'MEETING', 'COMMUNITY'] as const;

export const POST_TYPES = ['TEXT', 'ACHIEVEMENT', 'MATCH_RESULT', 'ANNOUNCEMENT', 'TOURNAMENT_RESULT'] as const;

export const REACTION_TYPES = ['LIKE', 'FIRE', 'CLUTCH', 'GG', 'BOOYAH'] as const;

export const NOTIFICATION_TYPES = [
  'ACHIEVEMENT',
  'INVITE',
  'EVENT',
  'GUILD',
  'MENTION',
  'CHALLENGE',
  'ANNOUNCEMENT',
  'TOURNAMENT',
  'JOIN_REQUEST',
  'SYNC',
  'SYSTEM',
] as const;

export const LEADERBOARD_CATEGORIES = [
  'OVERALL',
  'WEEKLY',
  'MONTHLY',
  'WINS',
  'KILLS',
  'KD',
  'HEADSHOTS',
  'GUILD_XP',
  'MVP',
  'ACTIVE',
  'IMPROVED',
] as const;

export const PERMISSIONS = {
  MEMBERS_VIEW: 'members.view',
  MEMBERS_MANAGE: 'members.manage',
  EVENTS_CREATE: 'events.create',
  EVENTS_MANAGE: 'events.manage',
  CHALLENGES_MANAGE: 'challenges.manage',
  ACHIEVEMENTS_MANAGE: 'achievements.manage',
  TEAMS_MANAGE: 'teams.manage',
  TOURNAMENTS_MANAGE: 'tournaments.manage',
  ANNOUNCEMENTS_CREATE: 'announcements.create',
  ANNOUNCEMENTS_MANAGE: 'announcements.manage',
  SYNC_RUN: 'sync.run',
  MODERATE: 'moderation',
  XP_ADJUST: 'xp.adjust',
  SETTINGS_MANAGE: 'settings.manage',
  ROLES_MANAGE: 'roles.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: [...ALL_PERMISSIONS],
  GUILD_ADMIN: [...ALL_PERMISSIONS],
  MODERATOR: [
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.EVENTS_CREATE,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.CHALLENGES_MANAGE,
    PERMISSIONS.TEAMS_MANAGE,
    PERMISSIONS.TOURNAMENTS_MANAGE,
    PERMISSIONS.ANNOUNCEMENTS_CREATE,
    PERMISSIONS.SYNC_RUN,
    PERMISSIONS.MODERATE,
  ],
  MEMBER: [PERMISSIONS.MEMBERS_VIEW],
};

export const GUILD_ROLE_LABELS: Record<string, string> = {
  LEADER: 'Leader',
  OFFICER: 'Officer',
  MEMBER: 'Member',
  TRIAL: 'Trial',
};

export const RANK_LABELS: Record<Rank, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
  DIAMOND: 'Diamond',
  HEROIC: 'Heroic',
  GRANDMASTER: 'Grandmaster',
};

export const ROLE_LABELS: Record<string, string> = {
  RUSHER: 'Rusher',
  SNIPER: 'Sniper',
  SUPPORT: 'Support',
  IGL: 'IGL',
  FLEX: 'Flex',
  ENTRY: 'Entry',
  OTHER: 'Other',
};

export const XP_RULES = {
  MATCH_WIN: 10,
  MATCH_PLAYED: 2,
  EVENT_JOIN: 25,
  EVENT_ATTEND: 15,
  CHALLENGE_COMPLETE_BONUS: 50,
  TOURNAMENT_PARTICIPATION: 50,
  TOURNAMENT_WIN: 150,
  POST: 5,
  POST_DAILY_CAP: 20,
  COMMENT: 2,
  COMMENT_DAILY_CAP: 20,
  GUILD_SHARE: 0.1,
} as const;

export function guildLevelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 250)) + 1;
}

export function guildXpForLevel(level: number): number {
  return 250 * (level - 1) * (level - 1);
}