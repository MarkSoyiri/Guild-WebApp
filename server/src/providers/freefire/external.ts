import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import type { FFMatchResult, FFProfile, FFRank, FFStats, FFStatsBase, FreeFireProvider } from './types';

const USER_AGENT = 'KINGS-ONLY-Guild/1.0 (+https://kings-only-guild.vercel.app)';

const SG_REGIONS = ['SG', 'RU', 'ID', 'TW', 'VN', 'TH', 'ME', 'PK', 'CIS', 'BD'];
const BR_REGIONS = ['BR', 'US'];

function regionBucket(region: string): 'ind' | 'br' | 'sg' {
  const upper = region.trim().toUpperCase();
  if (upper === 'IND') return 'ind';
  if (BR_REGIONS.includes(upper)) return 'br';
  if (SG_REGIONS.includes(upper)) return 'sg';
  return 'sg';
}

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

function tierFor(rank: unknown): string {
  if (typeof rank === 'string' && rank.trim()) return rank.trim();
  const numeric = num(rank);
  if (numeric >= 20) return 'Grandmaster III';
  return TIER_BY_RANK[numeric] ?? 'Bronze III';
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

type InfoBody = Record<string, unknown>;
type StatsBody = Record<string, unknown>;

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function pick<T>(body: Record<string, unknown>, keys: string[]): T | null {
  for (const key of keys) {
    const value = body[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as T;
  }
  return null;
}

export class ExternalFreeFireProvider implements FreeFireProvider {
  readonly id = 'external';
  readonly label = 'Free Fire Community API';
  readonly isLive = true;

  private async request<T>(path: string, uid: string, region: string): Promise<T> {
    if (!env.FF_API_KEY) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'Free Fire data source is not configured. An API key is required.');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.FF_API_TIMEOUT_MS);
    try {
      const url = `${env.FF_API_BASE_URL}${path}?region=${regionBucket(region)}&uid=${encodeURIComponent(uid)}`;
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
          'x-api-key': env.FF_API_KEY,
        },
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as (T & { success?: boolean; error?: string; message?: string }) | null;
      if (!response.ok || (body && body.success === false)) {
        throw new AppError(502, 'PROVIDER_ERROR', body?.message ?? `Free Fire provider returned ${response.status}`);
      }
      if (!body) {
        throw new AppError(502, 'PROVIDER_ERROR', 'Free Fire provider returned an unreadable response');
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

  async getPlayerProfile(uid: string, region: string): Promise<FFProfile> {
    const body = await this.request<InfoBody>('/info', uid, region);
    const basic = pick<Record<string, unknown>>(body, ['basicInfo', 'accountInfo', 'playerInfo', 'profile']) ?? body;
    const nickname = typeof basic.nickname === 'string' ? basic.nickname : null;
    if (!nickname) {
      throw new AppError(404, 'PLAYER_NOT_FOUND', 'No Free Fire account found for that UID');
    }
    return {
      uid,
      nickname,
      region: regionBucket(region),
      level: num(basic.level),
      rank: { tier: tierFor(basic.rank ?? basic.rankTier), points: num(basic.rankingPoints ?? basic.rankPoints) },
    };
  }

  async getPlayerStats(uid: string, region: string): Promise<FFStats> {
    const body = await this.request<StatsBody>('/stats', uid, region);
    const modes = pick<Record<string, unknown>>(body, ['stats', 'modeStats', 'careerStats']) ?? body;
    const groups = [
      pick<ModeStats>(modes, ['soloStats', 'solo']),
      pick<ModeStats>(modes, ['duoStats', 'duo']),
      pick<ModeStats>(modes, ['quadStats', 'squadStats', 'quad', 'squad']),
    ].filter((m): m is ModeStats => Boolean(m));
    const aggregate = groups.reduce<FFStatsBase>((acc, mode) => {
      const detailed = mode.detailedStats ?? {};
      acc.matches += num(mode.gamesPlayed);
      acc.wins += num(mode.wins);
      acc.kills += num(mode.kills);
      acc.deaths += num(detailed.deaths);
      acc.top10s += num(detailed.topNTimes);
      acc.headshots += num(detailed.headshotKills ?? detailed.headshots);
      acc.mostKillsInMatch = Math.max(acc.mostKillsInMatch, num(detailed.highestKills));
      return acc;
    }, { ...ZERO });
    if (aggregate.matches === 0) {
      throw new AppError(404, 'PLAYER_STATS_NOT_FOUND', 'No statistics available for that UID');
    }
    return { lifetime: aggregate, weekly: { ...ZERO }, monthly: { ...ZERO } };
  }

  async getMatchHistory(): Promise<FFMatchResult[]> {
    return [];
  }

  async getRankData(uid: string, region: string): Promise<FFRank> {
    const body = await this.request<InfoBody>('/info', uid, region);
    const basic = pick<Record<string, unknown>>(body, ['basicInfo', 'accountInfo', 'playerInfo', 'profile']) ?? body;
    return { tier: tierFor(basic.rank ?? basic.rankTier), points: num(basic.rankingPoints ?? basic.rankPoints) };
  }
}
