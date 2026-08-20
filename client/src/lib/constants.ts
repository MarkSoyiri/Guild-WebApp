export const RANKS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'HEROIC', 'GRANDMASTER'] as const;
export type Rank = (typeof RANKS)[number];

export const RANK_LABELS: Record<Rank, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
  DIAMOND: 'Diamond',
  HEROIC: 'Heroic',
  GRANDMASTER: 'Grand Master',
};

export const RANK_ORDER: Record<Rank, number> = {
  BRONZE: 0,
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
  DIAMOND: 4,
  HEROIC: 5,
  GRANDMASTER: 6,
};

export const PLAYER_ROLES = ['RUSHER', 'SNIPER', 'SUPPORT', 'IGL', 'FLEX', 'ENTRY', 'OTHER'] as const;
export type PlayerRole = (typeof PLAYER_ROLES)[number];

export const PLAYER_ROLE_LABELS: Record<string, string> = {
  RUSHER: 'Rusher',
  SNIPER: 'Sniper',
  SUPPORT: 'Support',
  IGL: 'IGL',
  FLEX: 'Flex',
  ENTRY: 'Entry',
  OTHER: 'Other',
};

export const GUILD_ROLES = ['LEADER', 'OFFICER', 'MODERATOR', 'MEMBER', 'TRIAL'] as const;
export type GuildRole = (typeof GUILD_ROLES)[number];

export const GUILD_ROLE_LABELS: Record<string, string> = {
  LEADER: 'Leader',
  OFFICER: 'Officer',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
  TRIAL: 'Trial',
};

export const USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'MEMBER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EVENT_TYPES = ['CUSTOM_ROOM', 'TOURNAMENT', 'PRACTICE', 'MEETING', 'COMMUNITY'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  CUSTOM_ROOM: 'Custom Room',
  TOURNAMENT: 'Tournament',
  PRACTICE: 'Practice',
  MEETING: 'Meeting',
  COMMUNITY: 'Community',
};

export const EVENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  ONGOING: 'Live now',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const POST_TYPES = ['TEXT', 'ACHIEVEMENT', 'MATCH_RESULT', 'ANNOUNCEMENT', 'TOURNAMENT_RESULT'] as const;
export type PostType = (typeof POST_TYPES)[number];

export const POST_TYPE_LABELS: Record<PostType, string> = {
  TEXT: 'Post',
  ACHIEVEMENT: 'Achievement',
  MATCH_RESULT: 'Match result',
  ANNOUNCEMENT: 'Announcement',
  TOURNAMENT_RESULT: 'Tournament result',
};

export const REACTION_TYPES = ['LIKE', 'FIRE', 'CLUTCH', 'GG', 'BOOYAH'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_EMOJI: Record<ReactionType, string> = {
  LIKE: '+1',
  FIRE: 'FIRE',
  CLUTCH: 'CLUTCH',
  GG: 'GG',
  BOOYAH: 'BOOYAH',
};

export const LEADERBOARD_CATEGORIES = ['KILLS', 'WINS', 'KD', 'XP', 'HEADSHOTS', 'MATCHES', 'MVPS'] as const;
export type LeaderboardCategory = (typeof LEADERBOARD_CATEGORIES)[number];

export const LEADERBOARD_LABELS: Record<LeaderboardCategory, string> = {
  KILLS: 'Kills',
  WINS: 'Wins',
  KD: 'K/D',
  XP: 'Guild XP',
  HEADSHOTS: 'Headshots',
  MATCHES: 'Matches',
  MVPS: 'MVPs',
};

export const CHALLENGE_METRICS = ['KILLS', 'WINS', 'HEADSHOTS', 'MATCHES', 'RANKED_MATCHES', 'CUSTOM_ROOMS', 'MVPS'] as const;
export type ChallengeMetric = (typeof CHALLENGE_METRICS)[number];

export const CHALLENGE_METRIC_LABELS: Record<ChallengeMetric, string> = {
  KILLS: 'Kills',
  WINS: 'Wins',
  HEADSHOTS: 'Headshots',
  MATCHES: 'Matches',
  RANKED_MATCHES: 'Ranked matches',
  CUSTOM_ROOMS: 'Custom rooms',
  MVPS: 'MVPs',
};

export const ACHIEVEMENT_RARITIES = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const;
export type AchievementRarity = (typeof ACHIEVEMENT_RARITIES)[number];

export const RARITY_LABELS: Record<AchievementRarity, string> = {
  COMMON: 'Common',
  RARE: 'Rare',
  EPIC: 'Epic',
  LEGENDARY: 'Legendary',
};

export const RARITY_ORDER: Record<AchievementRarity, number> = {
  COMMON: 0,
  RARE: 1,
  EPIC: 2,
  LEGENDARY: 3,
};

export const TOURNAMENT_FORMATS = ['SINGLE_ELIM', 'DOUBLE_ELIM', 'ROUND_ROBIN'] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  SINGLE_ELIM: 'Single elimination',
  DOUBLE_ELIM: 'Double elimination',
  ROUND_ROBIN: 'Round robin',
};

export const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  REGISTRATION: 'Registration',
  ACTIVE: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const TOURNAMENT_STATUS_STYLES: Record<string, string> = {
  DRAFT: 'border-border bg-elevated text-muted',
  REGISTRATION: 'border-success/40 bg-success/10 text-success',
  ACTIVE: 'border-electric/40 bg-electric/10 text-electric',
  COMPLETED: 'border-border-strong bg-elevated text-muted',
  CANCELLED: 'border-danger/40 bg-danger/10 text-danger',
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  ACHIEVEMENT: 'Achievement unlocked',
  CHALLENGE: 'Challenge',
  EVENT: 'Event',
  TOURNAMENT: 'Tournament',
  TEAM: 'Team',
  SQUAD: 'Squad',
  SYSTEM: 'System',
  MODERATION: 'Moderation',
  MEMBERSHIP: 'Membership',
};

export const REGIONS = ['MENA', 'NA', 'SA', 'EU', 'ASIA', 'IN', 'SEA', 'LATAM'] as const;

export const DEMO_ACCOUNTS = [
  { label: 'Leader', identifier: 'admin@kingsonly.gg', password: 'KingsAdmin!2026' },
  { label: 'Member', identifier: 'nova@kingsonly.gg', password: 'Nova!2026' },
];

export const QUERY_KEYS = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  guildActivity: (page: number) => ['guild-activity', page] as const,
  leaderboard: (category: string, seasonId?: string) => ['leaderboard', category, seasonId ?? 'current'] as const,
  players: (params: string) => ['players', params] as const,
  player: (id: string) => ['player', id] as const,
  myMatches: (page: number) => ['my-matches', page] as const,
  events: (params: string) => ['events', params] as const,
  event: (id: string) => ['event', id] as const,
  challenges: (status?: string) => ['challenges', status ?? 'all'] as const,
  achievements: ['achievements'] as const,
  teams: ['teams'] as const,
  team: (id: string) => ['team', id] as const,
  tournaments: (status?: string) => ['tournaments', status ?? 'all'] as const,
  tournament: (id: string) => ['tournament', id] as const,
  squad: (params: string) => ['squad', params] as const,
  posts: (params: string) => ['posts', params] as const,
  post: (id: string) => ['post', id] as const,
  comments: (postId: string) => ['comments', postId] as const,
  notifications: (params: string) => ['notifications', params] as const,
  unreadCount: ['unread-count'] as const,
  search: (q: string) => ['search', q] as const,
  syncStatus: ['sync-status'] as const,
  syncLogs: (page: number) => ['sync-logs', page] as const,
  adminStats: ['admin-stats'] as const,
  joinRequests: ['join-requests'] as const,
  adminRoles: ['admin-roles'] as const,
  moderation: (params: string) => ['moderation', params] as const,
  seasons: ['seasons'] as const,
  landing: ['landing'] as const,
};