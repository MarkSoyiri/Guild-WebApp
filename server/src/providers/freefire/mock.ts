import type {
  FFMatchResult,
  FFProfile,
  FFRank,
  FFStats,
  FFStatsBase,
  FreeFireProvider,
} from './types';

export const MOCK_STAGE_KEYS = [
  '2018-01-01',
  '2018-06-01',
  '2018-12-01',
  '2019-06-01',
  '2019-12-01',
  '2020-06-01',
  '2020-12-01',
  '2021-06-01',
  '2021-12-01',
  '2022-06-01',
  '2022-12-01',
  '2023-06-01',
  '2023-12-01',
  '2024-06-01',
  '2024-12-01',
  '2025-06-01',
  '2025-12-01',
  '2026-06-01',
] as const;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rng(seedKey: string): () => number {
  return mulberry32(hashString(seedKey));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function intFrom(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function weekKeyOf(date: Date): string {
  const t = new Date(date);
  const day = (t.getDay() + 6) % 7;
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() - day);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(
    t.getDate(),
  ).padStart(2, '0')}`;
}

function syncCountFor(uid: string, region: string, stage: string): number {
  return intFrom(rng(`${uid}:${region}:stage:${stage}`), 24, 42);
}

interface TierRange {
  tier: string;
  min: number;
  max: number;
}

const TIER_RANGES: TierRange[] = [
  { tier: 'BRONZE', min: 0, max: 399 },
  { tier: 'SILVER', min: 400, max: 799 },
  { tier: 'GOLD', min: 800, max: 1199 },
  { tier: 'PLATINUM', min: 1200, max: 1599 },
  { tier: 'DIAMOND', min: 1600, max: 1999 },
  { tier: 'HEROIC', min: 2000, max: 2599 },
  { tier: 'GRANDMASTER', min: 2600, max: 3200 },
];

export function rankFromPoints(points: number): FFRank {
  for (let i = TIER_RANGES.length - 1; i >= 0; i--) {
    const range = TIER_RANGES[i] as TierRange;
    if (points >= range.min) return { tier: range.tier, points };
  }
  return { tier: 'BRONZE', points };
}

export function skillFactorOf(uid: string, region: string): number {
  return 0.5 + rng(`${uid}:${region}:skill`)() * 0.5;
}

export function lifetimeStats(uid: string, region: string): FFStatsBase {
  const rand = rng(`${uid}:${region}:lifetime`);
  const skill = skillFactorOf(uid, region);
  const matches = intFrom(rand, 380, 1400);
  const winRate = 0.07 + skill * 0.09;
  const wins = Math.round(matches * winRate);
  const kd = 1.05 + skill * 1.75;
  const deaths = Math.max(matches - wins, 1);
  const kills = Math.round(deaths * kd);
  const headshots = Math.round(kills * (0.16 + skill * 0.1));
  const mvps = Math.round(wins * (0.1 + skill * 0.12));
  const clutchWins = Math.round(wins * 0.06);
  const top10s = Math.round(matches * 0.32);
  const mostKillsInMatch = 6 + intFrom(rand, 0, 9);
  const totalXP = Math.round(matches * (30 + skill * 30));
  return {
    kills,
    deaths,
    matches,
    wins,
    headshots,
    mvps,
    clutchWins,
    top10s,
    mostKillsInMatch,
    totalXP,
  };
}

function baseDelta(uid: string, region: string, syncIndex: number, skill: number): FFStatsBase {
  const rand = rng(`${uid}:${region}:delta:${syncIndex}`);
  const matches = intFrom(rand, 1, 3);
  const winRate = 0.1 + skill * 0.12;
  const wins = rand() < winRate ? 1 : 0;
  const kills = intFrom(rand, 0, 8);
  const headshots = rand() < 0.5 ? intFrom(rand, 1, 4) : 0;
  const mvps = wins === 1 && rand() < 0.25 ? 1 : 0;
  const clutchWins = wins === 1 && rand() < 0.2 ? 1 : 0;
  return {
    kills,
    deaths: Math.max(matches - wins, 1),
    matches,
    wins,
    headshots,
    mvps,
    clutchWins,
    top10s: rand() < 0.35 ? 1 : 0,
    mostKillsInMatch: kills,
    totalXP: intFrom(rand, 40, 160),
  };
}

function summedDeltas(uid: string, region: string, count: number, skill: number): FFStatsBase {
  const acc: FFStatsBase = {
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
  for (let i = 0; i < count; i++) {
    const d = baseDelta(uid, region, i, skill);
    acc.kills += d.kills;
    acc.deaths += d.deaths;
    acc.matches += d.matches;
    acc.wins += d.wins;
    acc.headshots += d.headshots;
    acc.mvps += d.mvps;
    acc.clutchWins += d.clutchWins;
    acc.top10s += d.top10s;
    acc.mostKillsInMatch = Math.max(acc.mostKillsInMatch, d.mostKillsInMatch);
    acc.totalXP += d.totalXP;
  }
  return acc;
}

function baseWeekly(uid: string, region: string, weekKey: string, skill: number): FFStatsBase {
  const rand = rng(`${uid}:${region}:week:${weekKey}`);
  const matches = intFrom(rand, 6, 14);
  const winRate = 0.1 + skill * 0.12;
  const wins = Math.round(matches * winRate);
  const kills = intFrom(rand, 12, 48);
  return {
    kills,
    deaths: Math.max(matches - wins, 1),
    matches,
    wins,
    headshots: Math.round(kills * 0.2),
    mvps: Math.round(wins * 0.2),
    clutchWins: Math.round(wins * 0.15),
    top10s: Math.round(matches * 0.35),
    mostKillsInMatch: 0,
    totalXP: 0,
  };
}

function aggregateWeekly(uid: string, region: string, syncCount: number): FFStatsBase {
  const skill = skillFactorOf(uid, region);
  const weekKey = weekKeyOf(new Date());
  const base = baseWeekly(uid, region, weekKey, skill);
  const deltas = summedDeltas(uid, region, syncCount, skill);
  return {
    kills: base.kills + deltas.kills,
    deaths: base.deaths + deltas.deaths,
    matches: base.matches + deltas.matches,
    wins: base.wins + deltas.wins,
    headshots: base.headshots + deltas.headshots,
    mvps: base.mvps + deltas.mvps,
    clutchWins: base.clutchWins + deltas.clutchWins,
    top10s: base.top10s + deltas.top10s,
    mostKillsInMatch: deltas.mostKillsInMatch,
    totalXP: 0,
  };
}

function aggregateMonthly(uid: string, region: string): FFStatsBase {
  const skill = skillFactorOf(uid, region);
  const rand = rng(`${uid}:${region}:month:${new Date().getFullYear()}-${new Date().getMonth()}`);
  const matches = intFrom(rand, 34, 68);
  const winRate = 0.1 + skill * 0.12;
  const wins = Math.round(matches * winRate);
  const kills = intFrom(rand, 70, 220);
  return {
    kills,
    deaths: Math.max(matches - wins, 1),
    matches,
    wins,
    headshots: Math.round(kills * 0.2),
    mvps: Math.round(wins * 0.2),
    clutchWins: 0,
    top10s: 0,
    mostKillsInMatch: 0,
    totalXP: 0,
  };
}

function rankOf(uid: string, region: string): FFRank {
  const skill = skillFactorOf(uid, region);
  const tierIndex = clamp(Math.floor(skill * TIER_RANGES.length), 0, TIER_RANGES.length - 1);
  const range = TIER_RANGES[tierIndex] as TierRange;
  const rand = rng(`${uid}:${region}:rank:${weekKeyOf(new Date())}`);
  const points = Math.round(range.min + rand() * (range.max - range.min));
  return { tier: range.tier, points };
}

const MATCH_MODES = ['BR_RANKED', 'CS_RANKED', 'BR_CLASSIC', 'CUSTOM_ROOM', 'CLASH_SQUAD'];

function resultFor(placement: number, kills: number): string {
  if (placement === 1) return 'BOOYAH';
  if (placement <= 5) return 'TOP5';
  if (placement <= 10) return 'TOP10';
  return 'ELIMINATED';
}

function matchesFor(uid: string, region: string, count: number): FFMatchResult[] {
  const skill = skillFactorOf(uid, region);
  const out: FFMatchResult[] = [];
  const dayKey = Math.floor(Date.now() / DAY_MS);
  const rand = rng(`${uid}:${region}:matches:${dayKey}`);
  const startOffset = intFrom(rand, 0, 10) * 3;
  for (let i = 0; i < count; i++) {
    const kills = intFrom(rand, 0, 12);
    const winRoll = rand();
    const placement =
      winRoll < 0.14 + skill * 0.08
        ? 1
        : winRoll < 0.3
          ? intFrom(rand, 2, 5)
          : winRoll < 0.5
            ? intFrom(rand, 6, 10)
            : intFrom(rand, 11, 48);
    const playedAt = new Date(Date.now() - (startOffset + i) * 3 * 60 * 60 * 1000);
    const isMvp = placement === 1 && kills >= 5 && rand() < 0.4;
    out.push({
      externalId: `mock-${uid}-${dayKey}-${i}`,
      mode: MATCH_MODES[intFrom(rand, 0, MATCH_MODES.length - 1)] as string,
      result: resultFor(placement, kills),
      placement,
      kills,
      assists: intFrom(rand, 0, 4),
      damage: intFrom(rand, 300, 2400),
      headshots: kills > 0 ? intFrom(rand, 0, Math.max(kills, 3)) : 0,
      isMvp,
      playedAt,
    });
  }
  return out.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
}

export function seedStats(uid: string, region: string, stage: string): {
  lifetime: FFStatsBase;
  weekly: FFStatsBase;
  monthly: FFStatsBase;
  rank: FFRank;
  level: number;
  nickname: string;
  syncCount: number;
} {
  const lifetime = lifetimeStats(uid, region);
  const syncCount = syncCountFor(uid, region, stage);
  const skill = skillFactorOf(uid, region);
  const weeklyBase = baseWeekly(uid, region, weekKeyOf(new Date()), skill);
  const deltas = summedDeltas(uid, region, syncCount, skill);
  const weekly: FFStatsBase = {
    kills: weeklyBase.kills + deltas.kills,
    deaths: weeklyBase.deaths + deltas.deaths,
    matches: weeklyBase.matches + deltas.matches,
    wins: weeklyBase.wins + deltas.wins,
    headshots: weeklyBase.headshots + deltas.headshots,
    mvps: weeklyBase.mvps + deltas.mvps,
    clutchWins: weeklyBase.clutchWins + deltas.clutchWins,
    top10s: weeklyBase.top10s + deltas.top10s,
    mostKillsInMatch: deltas.mostKillsInMatch,
    totalXP: 0,
  };
  const monthly = aggregateMonthly(uid, region);
  const rank = rankOf(uid, region);
  const rand = rng(`${uid}:${region}:level`);
  const level = 24 + Math.round(skill * 80);
  const nickname = `KO_${uid.slice(-6)}`;
  return { lifetime, weekly, monthly, rank, level, nickname, syncCount };
}

export class MockFreeFireProvider implements FreeFireProvider {
  readonly id = 'mock';
  readonly label = 'Mock Provider (demo data)';
  readonly isLive = false;

  private simulateLatency(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 80 + Math.random() * 220));
  }

  async getPlayerProfile(uid: string, region: string): Promise<FFProfile> {
    await this.simulateLatency();
    const seed = seedStats(uid, region, MOCK_STAGE_KEYS[MOCK_STAGE_KEYS.length - 1] as string);
    return {
      uid,
      nickname: seed.nickname,
      region,
      level: seed.level,
      rank: seed.rank,
    };
  }

  async getPlayerStats(uid: string, region: string): Promise<FFStats> {
    await this.simulateLatency();
    const seed = seedStats(uid, region, MOCK_STAGE_KEYS[MOCK_STAGE_KEYS.length - 1] as string);
    return {
      lifetime: seed.lifetime,
      weekly: aggregateWeekly(uid, region, seed.syncCount + 1),
      monthly: aggregateMonthly(uid, region),
    };
  }

  async getMatchHistory(uid: string, region: string, limit = 12): Promise<FFMatchResult[]> {
    await this.simulateLatency();
    return matchesFor(uid, region, limit);
  }

  async getRankData(uid: string, region: string): Promise<FFRank> {
    await this.simulateLatency();
    return rankOf(uid, region);
  }
}
