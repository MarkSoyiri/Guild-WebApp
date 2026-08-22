import type { AchievementRarity, GuildRole, PlayerRole, Rank, UserRole } from './constants';

export interface FreeFireStats {
  id: string;
  playerId: string;
  kills: number;
  deaths: number;
  matches: number;
  wins: number;
  headshots: number;
  mvps: number;
  clutchWins: number;
  top10s: number;
  mostKillsInMatch: number;
  totalXP: number;
  kdRatio: number;
  winRate: number;
  weeklyKills: number;
  weeklyWins: number;
  weeklyMatches: number;
  weeklyHeadshots: number;
  weeklyMvps: number;
  weeklyDeaths: number;
  monthlyKills: number;
  monthlyWins: number;
  monthlyMatches: number;
  monthlyHeadshots: number;
  monthlyMvps: number;
  monthlyDeaths: number;
  updatedAt: string;
}

export interface PlayerSummary {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  role: UserRole;
  lastSeenAt: string | null;
  guildRole: GuildRole;
  guildXp: number;
  seasonXp: number;
  joinedAt: string;
  rank: Rank;
  rankPoints: number;
  playerRole: PlayerRole;
  level: number;
  region: string;
  lastSyncAt: string | null;
  lastSyncProvider: string | null;
  stats: FreeFireStats | null;
}

export interface PlayerProfile {
  id: string;
  userId: string;
  ffUid: string | null;
  ffNickname: string | null;
  region: string;
  playerRole: PlayerRole;
  rank: Rank;
  rankPoints: number;
  level: number;
  lastSyncAt: string | null;
  lastSyncProvider: string | null;
  createdAt: string;
  updatedAt: string;
  stats: FreeFireStats | null;
}

export interface Membership {
  guildId: string;
  guildName: string;
  guildTag: string;
  guildRole: GuildRole;
  guildXp: number;
  seasonXp: number;
  joinedAt: string;
}

export interface Me {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  lastSeenAt: string | null;
  createdAt: string;
  membership: Membership | null;
  profile?: PlayerProfile | null;
}

export interface Season {
  id: string;
  number: number;
  name: string;
  startsAt: string;
  endsAt: string;
  remainingDays: number;
}

export interface GuildOverview {
  id: string;
  name: string;
  tag: string;
  region: string;
  description: string | null;
  motto: string | null;
  level: number;
  xp: number;
  nextLevelXp: number;
  progressPercent: number;
  progressToNext: number;
  memberCount: number;
  onlineCount: number;
  pendingRequests: number;
  upcomingEvents: number;
  activeChallenges: number;
  season: Season | null;
  weeklyXp: number;
  guildKills: number;
  guildWins: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  payload: unknown;
  createdAt: string;
  actor: { id: string; displayName: string; avatarUrl: string | null } | null;
}

export interface EventBrief {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string;
  status: string;
  joined: boolean;
  participants: number;
  maxParticipants: number;
}

export interface ChallengeBrief {
  id: string;
  title: string;
  description: string;
  metric: string;
  goal: number;
  rewardXp: number;
  endsAt: string;
  progress: number;
  myProgress: number;
  percent: number;
}

export interface AnnouncementBrief {
  id: string;
  title: string;
  content: string;
  priority: string;
  pinned: boolean;
  createdAt: string;
  author: string;
}

export interface DashboardPreviewRow {
  rank: number;
  id: string;
  displayName: string;
  avatarUrl: string | null;
  rankTier: Rank;
  rankPoints: number;
  guildXp: number;
  kd: number;
  wins: number;
}

export interface Dashboard {
  overview: GuildOverview;
  me: PlayerSummary & { unreadCount: number };
  nextEvent: EventBrief | null;
  activeChallenge: ChallengeBrief | null;
  activity: ActivityItem[];
  leaderboardPreview: DashboardPreviewRow[];
  myAchievements: { id: string; key: string; name: string; icon: string; rarity: AchievementRarity; unlockedAt: string }[];
  announcements: AnnouncementBrief[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LeaderboardRow {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  guildRole: GuildRole;
  guildXp: number;
  seasonXp: number;
  rank: Rank;
  rankPoints: number;
  playerRole: PlayerRole;
  level: number;
  lastSyncAt: string | null;
  lastSyncProvider: string | null;
  stats: FreeFireStats | null;
  value: number;
}

export interface LeaderboardResponse {
  category: string;
  season: Season | null;
  items: LeaderboardRow[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string | null;
  joinedAt: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    profile: { rank: Rank; playerRole: PlayerRole } | null;
  };
}

export interface Team {
  id: string;
  guildId: string;
  name: string;
  tag: string;
  description: string | null;
  captainId: string;
  wins: number;
  matches: number;
  createdAt: string;
  members: TeamMember[];
  _count: { members: number };
}

export interface TeamDetail extends Team {
  tournamentParticipants: { tournament: { id: string; name: string; status: string; startsAt: string } }[];
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
  status: string;
  scheduledAt: string | null;
  playedAt: string | null;
  teamA?: { id: string; name: string; tag: string } | null;
  teamB?: { id: string; name: string; tag: string } | null;
}

export interface Tournament {
  id: string;
  guildId: string;
  name: string;
  description: string;
  format: string;
  size: number;
  status: string;
  startsAt: string;
  endsAt: string;
  prize: string | null;
  winnerTeamId: string | null;
  mvpId: string | null;
  mvp?: { displayName: string } | null;
  createdAt: string;
  _count: { participants: number; matches: number };
  participants?: { id: string; team: { id: string; name: string; tag: string; captainId: string } }[];
  matches?: TournamentMatch[];
}

export interface SquadParticipant {
  id: string;
  userId: string;
  user: { id: string; displayName: string; avatarUrl: string | null };
}

export interface SquadRequest {
  id: string;
  userId: string;
  role: string;
  rank: string;
  mic: boolean;
  playersNeeded: number;
  note: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    profile: { rank: Rank; playerRole: PlayerRole } | null;
  };
  participants: SquadParticipant[];
}

export interface ReactionSummary {
  type: string;
  count: number;
  mine: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  type: string;
  content: string;
  referenceId: string | null;
  status: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl: string | null };
  _count: { comments: number; reactions: number };
  reactions: ReactionSummary[];
}

export interface PostDetail extends Post {
  comments?: Comment[];
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl: string | null };
}

export interface EventParticipant {
  id: string;
  userId: string;
  user: { id: string; displayName: string; avatarUrl: string | null };
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  type: string;
  mode: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  maxParticipants: number | null;
  status: string;
  createdAt: string;
  organizer: { id: string; displayName: string; avatarUrl?: string | null };
  participants: EventParticipant[];
  joined?: boolean;
  participantCount?: number;
}

export interface ChallengeProgressRow {
  userId: string;
  progress: number;
}

export interface Challenge {
  id: string;
  guildId: string;
  title: string;
  description: string;
  metric: string;
  goal: number;
  rewardXp: number;
  status: string;
  startsAt: string;
  endsAt: string;
  createdBy: string | null;
  createdAt: string;
  progress: number;
  myProgress: number;
  percent: number;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  requirementType: string;
  requirementValue: number;
  rewardXp: number;
  order: number;
  createdAt: string;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
  percent: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface SearchResponse {
  members: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    rank: Rank;
    playerRole: PlayerRole;
    guildRole: GuildRole;
  }[];
  teams: { id: string; name: string; tag: string; wins: number; matches: number }[];
  events: { id: string; title: string; type: string; startsAt: string; status: string }[];
  posts: { id: string; content: string; type: string; createdAt: string; authorId: string }[];
  challenges: { id: string; title: string; metric: string; status: string; endsAt: string }[];
}

export interface AdminStats {
  members: number;
  activeMembers: number;
  pendingRequests: number;
  upcomingEvents: number;
  activeChallenges: number;
  online: number;
  syncFailures: number;
  lastSync: { at: string; status: string; provider: string } | null;
}

export interface JoinRequest {
  id: string;
  userId: string;
  message: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    createdAt: string;
  };
}

export interface GuildRoleRow {
  id: string;
  name: string;
  permissions: string[];
  createdAt: string;
}

export interface ModerationItem {
  id: string;
  type: string;
  reason: string | null;
  createdAt: string;
  actor: { id: string; displayName: string; avatarUrl: string | null };
  post?: Post;
}

export interface SeasonRow {
  id: string;
  number: number;
  name: string;
  status: string;
  startsAt: string;
  endsAt: string;
  endedAt: string | null;
}

export interface SeasonStats {
  season: { id: string; number: number; name: string; status: string };
  snapshots: { id: string; capturedAt: string; rankings: unknown }[];
  topMembers: { id: string; displayName: string; avatarUrl: string | null; seasonXp: number; guildRole: GuildRole }[];
}

export interface SyncLog {
  id: string;
  playerId: string;
  provider: string;
  status: string;
  error: string | null;
  triggeredBy: string;
  createdAt: string;
  player?: { user: { displayName: string } };
}

export interface SyncStatus {
  provider: string;
  label: string;
  isLive: boolean;
  syncInterval: number;
  me: { lastSyncAt: string | null; lastSyncProvider: string | null; ffUid: string | null } | null;
}

export interface Landing {
  guild: {
    id: string;
    name: string;
    tag: string;
    region: string;
    motto: string | null;
    description: string | null;
    level: number;
    xp: number;
    memberCount: number;
    onlineCount: number;
  };
  wins: number;
  kills: number;
  avgKd: number;
  topPlayers: {
    rank: number;
    id: string;
    displayName: string;
    avatarUrl: string | null;
    rankTier: Rank;
    rankPoints: number;
    playerRole: PlayerRole;
    kd: number;
    wins: number;
  }[];
  activity: ActivityItem[];
  events: { id: string; title: string; type: string; startsAt: string; maxParticipants: number; participants: number }[];
  challenge: {
    id: string;
    title: string;
    metric: string;
    goal: number;
    rewardXp: number;
    endsAt: string;
    progress: number;
    percent: number;
  } | null;
  achievements: { key: string; name: string; icon: string; rarity: AchievementRarity; description: string }[];
}

export interface FreeFireMatch {
  id: string;
  playerId: string;
  mode: string;
  map: string;
  rank: number;
  kills: number;
  deaths: number;
  headshots: number;
  isWin: boolean;
  mvp: boolean;
  playedAt: string;
}

export interface PlayerDetail {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  role: UserRole;
  lastSeenAt: string | null;
  createdAt: string;
  guildRole: GuildRole | null;
  guildXp: number;
  seasonXp: number;
  joinedAt: string | null;
  profile: (PlayerProfile & { stats: FreeFireStats | null }) | null;
  team: { id: string; name: string; tag: string } | null;
  isViewer: boolean;
  achievements: { id: string; key: string; name: string; icon: string; rarity: AchievementRarity; unlockedAt: string }[];
  recentMatches: FreeFireMatch[];
  recentActivity: { id: string; type: string; message: string; createdAt: string }[];
}