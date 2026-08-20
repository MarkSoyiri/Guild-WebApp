import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import type { FFMatchResult, FFProfile, FFRank, FFStats, FFStatsBase, FreeFireProvider } from './types';

const REGIONS = ['IND', 'BR', 'SG', 'RU', 'ID', 'TW', 'US', 'VN', 'TH', 'ME', 'PK', 'CIS', 'BD'] as const;
type Region = (typeof REGIONS)[number];

const TIER_BY_RANK: Record<number, string> = {
  0: 'Bronze III',
  1: 'Bronze II',
  2: 'Bronze I',
  3: 'Silver III',
  4: 'Silver II',
  5: 'Silver I',
  6: 'Gold III',
  7: 'Gold II',
  8: 'Gold I',
  9: 'Platinum III',
  10: 'Platinum II',
  11: 'Platinum I',
  12: 'Diamond III',
  13: 'Diamond II',
  14: 'Diamond I',
  15: 'Heroic III',
  16: 'Heroic II',
  17: 'Heroic I',
  18: 'Grandmaster',
  19: 'Grandmaster II',
  20: 'Grandmaster III',
};

function tierFor(rank: number): string {
  if (rank >= 20) return 'Grandmaster III';
  return TIER_BY_RANK[rank] ?? 'Bronze III';
}

const ZERO: FFStatsBase = {
  kills: 0,
  deaths: 0,
  matches: 0,
  wins: 0,
  headshots: 0,
  mvps: 0,
  clutchWins: 0,
  top10s: 0,
  mostKillsInMatch: 0,
  totalXP: 0,
};

interface AccountResponse {
  basicInfo?: {
    accountId?: string;
    nickname?: string;
    region?: string;
    level?: number;
    rank?: number;
    rankingPoints?: number;
  };
}

interface ModeStats {
  gamesPlayed?: number;
  wins?: number;
  kills?: number;
  detailedStats?: {
    deaths?: number;
    topNTimes?: number;
    highestKills?: number;
    headshots?: number;
    headshotKills?: number;
  };
}

interface StatsResponse {
  soloStats?: ModeStats;
  duoStats?: ModeStats;
  quadStats?: ModeStats;
}

function normalizeRegion(region: string): Region {
  const upper = region.trim().toUpperCase();
  return (REGIONS as readonly string[]).includes(upper) ? (upper as Region) : 'IND';
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export class ExternalFreeFireProvider implements FreeFireProvider {
  readonly id = 'external';
  readonly label = 'Free Fire Stats API';
  readonly isLive = true;

  private async request<T>(path: string, uid: string, region: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.FF_API_TIMEOUT_MS);
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (env.FF_API_KEY) headers['x-api-key'] = env.FF_API_KEY;
      const response = await fetch(`${env.FF_API_BASE_URL}${path}?region=${normalizeRegion(region)}&uid=${encodeURIComponent(uid)}`, {
        headers,
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as T & { error?: string; message?: string };
      if (!response.ok) {
        throw new AppError(502, 'PROVIDER_ERROR', body?.message ?? `Free Fire provider returned ${response.status}`);
      }
      if (body && body.error) {
        throw new AppError(502, 'PROVIDER_ERROR', body.message ?? body.error);
      }
      return body;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = error instanceof Error && error.name === 'AbortError' ? 'Free Fire provider timed out' : 'Free Fire provider unreachable';
      logger.warn(`ExternalFreeFireProvider request failed: ${message}`);
      throw new AppError(502, 'PROVIDER_UNREACHABLE', message);
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchAccount(uid: string, region: string): Promise<AccountResponse> {
    return this.request<AccountResponse>('/api/v1/account', uid, region);
  }

  private async fetchStats(uid: string, region: string): Promise<StatsResponse> {
    return this.request<StatsResponse>('/api/v1/playerstats', uid, region);
  }

  async getPlayerProfile(uid: string, region: string): Promise<FFProfile> {
    const account = await this.fetchAccount(uid, region);
    const basic = account.basicInfo;
    if (!basic?.nickname) {
      throw new AppError(404, 'PLAYER_NOT_FOUND', 'No Free Fire account found for that UID');
    }
    return {
      uid: String(basic.accountId ?? uid),
      nickname: basic.nickname,
      region: normalizeRegion(region),
      level: num(basic.level),
      rank: { tier: tierFor(num(basic.rank)), points: num(basic.rankingPoints) },
    };
  }

  async getPlayerStats(uid: string, region: string): Promise<FFStats> {
    const stats = await this.fetchStats(uid, region);
    const modes = [stats.soloStats, stats.duoStats, stats.quadStats].filter((m): m is ModeStats => Boolean(m));
    const aggregate: FFStatsBase = modes.reduce<FFStatsBase>(
      (acc, mode) => {
        const detailed = mode.detailedStats ?? {};
        acc.matches += num(mode.gamesPlayed);
        acc.wins += num(mode.wins);
        acc.kills += num(mode.kills);
        acc.deaths += num(detailed.deaths);
        acc.top10s += num(detailed.topNTimes);
        acc.headshots += num(detailed.headshotKills ?? detailed.headshots);
        acc.mostKillsInMatch = Math.max(acc.mostKillsInMatch, num(detailed.highestKills));
        return acc;
      },
      { ...ZERO },
    );
    if (aggregate.matches === 0) {
      throw new AppError(404, 'PLAYER_STATS_NOT_FOUND', 'No statistics available for that UID');
    }
    return { lifetime: aggregate, weekly: { ...ZERO }, monthly: { ...ZERO } };
  }

  async getMatchHistory(): Promise<FFMatchResult[]> {
    return [];
  }

  async getRankData(uid: string, region: string): Promise<FFRank> {
    const account = await this.fetchAccount(uid, region);
    const basic = account.basicInfo;
    return { tier: tierFor(num(basic?.rank)), points: num(basic?.rankingPoints) };
  }
}