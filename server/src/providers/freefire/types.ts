export interface FFRank {
  tier: string;
  points: number;
}

export interface FFProfile {
  uid: string;
  nickname: string;
  region: string;
  level: number;
  rank: FFRank;
}

export interface FFStatsBase {
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
}

export interface FFStats {
  lifetime: FFStatsBase;
  weekly: FFStatsBase;
  monthly: FFStatsBase;
}

export interface FFMatchResult {
  externalId: string;
  mode: string;
  result: string;
  placement: number;
  kills: number;
  assists: number;
  damage: number;
  headshots: number;
  isMvp: boolean;
  playedAt: Date;
}

export interface FreeFireProvider {
  readonly id: string;
  readonly label: string;
  readonly isLive: boolean;
  getPlayerProfile(uid: string, region: string): Promise<FFProfile>;
  getPlayerStats(uid: string, region: string): Promise<FFStats>;
  getMatchHistory(uid: string, region: string, limit?: number): Promise<FFMatchResult[]>;
  getRankData(uid: string, region: string): Promise<FFRank>;
}