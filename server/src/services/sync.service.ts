import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { env } from '../config/env';
import { getFreeFireProvider } from '../providers/freefire';
import type { FFStats, FFStatsBase } from '../providers/freefire';
import { evaluateAchievements } from './achievement.service';
import { contributeToChallenges } from './challenge.service';
import { grant } from './xp.service';
import { recordActivity } from './activity.service';
import { XP_RULES } from '../utils/constants';

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

function diffStats(prev: FFStatsBase, next: FFStatsBase): FFStatsBase {
  return {
    kills: Math.max(next.kills - prev.kills, 0),
    deaths: Math.max(next.deaths - prev.deaths, 0),
    matches: Math.max(next.matches - prev.matches, 0),
    wins: Math.max(next.wins - prev.wins, 0),
    headshots: Math.max(next.headshots - prev.headshots, 0),
    mvps: Math.max(next.mvps - prev.mvps, 0),
    clutchWins: Math.max(next.clutchWins - prev.clutchWins, 0),
    top10s: Math.max(next.top10s - prev.top10s, 0),
    mostKillsInMatch: next.mostKillsInMatch,
    totalXP: Math.max(next.totalXP - prev.totalXP, 0),
  };
}

export function providerStatus() {
  const provider = getFreeFireProvider();
  return {
    provider: provider.id,
    label: provider.label,
    isLive: provider.isLive,
    syncInterval: env.FF_SYNC_INTERVAL,
  };
}

export async function syncPlayer(playerId: string, triggeredBy: 'MANUAL' | 'SCHEDULED' | 'JOB'): Promise<{
  status: string;
  message: string;
}> {
  const profile = await prisma.playerProfile.findUnique({
    where: { id: playerId },
    include: { stats: true, user: true },
  });
  if (!profile) {
    throw new AppError(404, 'PLAYER_NOT_FOUND', 'Player profile not found');
  }
  if (!profile.ffUid) {
    return { status: 'SKIPPED', message: 'Player has no linked Free Fire UID' };
  }

  const provider = getFreeFireProvider();
  const recentSuccess = await prisma.syncLog.findFirst({
    where: { playerId, status: 'SUCCESS' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (recentSuccess && Date.now() - recentSuccess.createdAt.getTime() < env.FF_SYNC_INTERVAL * 1000) {
    const secondsLeft = Math.ceil((env.FF_SYNC_INTERVAL * 1000 - (Date.now() - recentSuccess.createdAt.getTime())) / 1000);
    return { status: 'SKIPPED', message: `Rate limited — next sync in ${secondsLeft}s` };
  }

  const log = await prisma.syncLog.create({
    data: { playerId, provider: provider.id, status: 'RUNNING', triggeredBy },
  });
  const startedAt = Date.now();

  try {
    const [remoteStats, remoteRank, remoteMatches] = await Promise.all([
      provider.getPlayerStats(profile.ffUid, profile.region),
      provider.getRankData(profile.ffUid, profile.region),
      provider.getMatchHistory(profile.ffUid, profile.region, 12),
    ]);

    const prev = profile.stats ?? {
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
      weeklyKills: 0,
      weeklyWins: 0,
      weeklyMatches: 0,
      weeklyHeadshots: 0,
      weeklyMvps: 0,
      weeklyDeaths: 0,
      monthlyKills: 0,
      monthlyWins: 0,
      monthlyMatches: 0,
      monthlyHeadshots: 0,
      monthlyMvps: 0,
      monthlyDeaths: 0,
      kdRatio: 0,
      winRate: 0,
    };

    const deltaLifetime = diffStats(
      lifetimeOf(prev),
      remoteStats.lifetime,
    );
    const deltaWeekly = diffStats(weeklyOf(prev), remoteStats.weekly);
    const deltaMonthly = diffStats(monthlyOf(prev), remoteStats.monthly);

    const kd = remoteStats.lifetime.deaths > 0 ? remoteStats.lifetime.kills / remoteStats.lifetime.deaths : 0;
    const winRate = remoteStats.lifetime.matches > 0 ? (remoteStats.lifetime.wins / remoteStats.lifetime.matches) * 100 : 0;

    await prisma.freeFireStats.upsert({
      where: { playerId },
      create: {
        playerId,
        ...remoteStats.lifetime,
        kdRatio: Math.round(kd * 100) / 100,
        winRate: Math.round(winRate * 100) / 100,
        weeklyKills: remoteStats.weekly.kills,
        weeklyWins: remoteStats.weekly.wins,
        weeklyMatches: remoteStats.weekly.matches,
        weeklyHeadshots: remoteStats.weekly.headshots,
        weeklyMvps: remoteStats.weekly.mvps,
        weeklyDeaths: remoteStats.weekly.deaths,
        monthlyKills: remoteStats.monthly.kills,
        monthlyWins: remoteStats.monthly.wins,
        monthlyMatches: remoteStats.monthly.matches,
        monthlyHeadshots: remoteStats.monthly.headshots,
        monthlyMvps: remoteStats.monthly.mvps,
        monthlyDeaths: remoteStats.monthly.deaths,
      },
      update: {
        ...remoteStats.lifetime,
        kdRatio: Math.round(kd * 100) / 100,
        winRate: Math.round(winRate * 100) / 100,
        weeklyKills: remoteStats.weekly.kills,
        weeklyWins: remoteStats.weekly.wins,
        weeklyMatches: remoteStats.weekly.matches,
        weeklyHeadshots: remoteStats.weekly.headshots,
        weeklyMvps: remoteStats.weekly.mvps,
        weeklyDeaths: remoteStats.weekly.deaths,
        monthlyKills: remoteStats.monthly.kills,
        monthlyWins: remoteStats.monthly.wins,
        monthlyMatches: remoteStats.monthly.matches,
        monthlyHeadshots: remoteStats.monthly.headshots,
        monthlyMvps: remoteStats.monthly.mvps,
        monthlyDeaths: remoteStats.monthly.deaths,
      },
    });

    const rankChanged = remoteRank.tier !== profile.rank || Math.abs(remoteRank.points - profile.rankPoints) > 50;
    if (rankChanged) {
      const wasUp = remoteRank.points > profile.rankPoints;
      await prisma.playerProfile.update({
        where: { id: playerId },
        data: { rank: remoteRank.tier, rankPoints: remoteRank.points },
      });
      if (deltaWeekly.matches > 0 || deltaLifetime.wins > 0) {
        const guild = await prisma.guild.findFirst();
        if (guild) {
          await recordActivity({
            guildId: guild.id,
            actorId: profile.userId,
            type: 'RANK_UP',
            message: `${profile.user.displayName} reached ${remoteRank.tier}`,
            payload: { rank: remoteRank.tier, points: remoteRank.points, up: wasUp },
          });
        }
        await prisma.notification.create({
          data: {
            userId: profile.userId,
            type: 'GUILD',
            title: wasUp ? `Rank Up: ${remoteRank.tier}` : `Rank Update: ${remoteRank.tier}`,
            body: `${remoteRank.tier} · ${remoteRank.points} points`,
            link: '/app/profile',
          },
        });
      }
    }

    let customRoomCount = 0;
    if (remoteMatches.length > 0) {
      const existing = await prisma.freeFireMatch.findMany({
        where: { playerId, externalId: { in: remoteMatches.map((m) => m.externalId) } },
        select: { externalId: true },
      });
      const existingKeys = new Set(existing.map((m) => m.externalId));
      const fresh = remoteMatches.filter((m) => !existingKeys.has(m.externalId));
      if (fresh.length > 0) {
        await prisma.freeFireMatch.createMany({
          data: fresh.map((m) => ({
            playerId,
            externalId: m.externalId,
            mode: m.mode,
            result: m.result,
            placement: m.placement,
            kills: m.kills,
            assists: m.assists,
            damage: m.damage,
            headshots: m.headshots,
            isMvp: m.isMvp,
            playedAt: m.playedAt,
          })),
        });
        customRoomCount = fresh.filter((m) => m.mode === 'CUSTOM_ROOM').length;
        const guild = await prisma.guild.findFirst();
        if (guild) {
          const best = fresh.sort((a, b) => b.kills - a.kills)[0];
          if (best && best.result === 'BOOYAH') {
            await recordActivity({
              guildId: guild.id,
              actorId: profile.userId,
              type: 'MATCH_WON',
              message: `${profile.user.displayName} won a ${best.mode.replace('_', ' ')} match (${best.kills} kills)`,
              payload: { mode: best.mode, kills: best.kills },
            });
          } else {
            await recordActivity({
              guildId: guild.id,
              actorId: profile.userId,
              type: 'MATCH_PLAYED',
              message: `${profile.user.displayName} finished ${fresh[0]?.result ?? 'a match'} (${fresh[0]?.kills ?? 0} kills)`,
              payload: { mode: fresh[0]?.mode },
            });
          }
        }
      }
    }

    await prisma.playerProfile.update({
      where: { id: playerId },
      data: { lastSyncAt: new Date(), lastSyncProvider: provider.id },
    });

    await contributeToChallenges(profile.userId, {
      kills: deltaWeekly.kills,
      wins: deltaWeekly.wins,
      headshots: deltaWeekly.headshots,
      matches: deltaWeekly.matches,
      mvps: deltaWeekly.mvps,
      customRooms: customRoomCount,
    });

    await evaluateAchievements(profile.userId);

    const xpGained = deltaWeekly.wins * XP_RULES.MATCH_WIN + deltaWeekly.matches * XP_RULES.MATCH_PLAYED;
    if (xpGained > 0) {
      await grant({
        userId: profile.userId,
        amount: Math.min(xpGained, 60),
        reason: 'MATCH',
        detail: `${deltaWeekly.wins} wins, ${deltaWeekly.matches} matches`,
      });
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'SUCCESS', durationMs: Date.now() - startedAt },
    });
    return { status: 'SUCCESS', message: 'Statistics synchronized' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', message: message.slice(0, 500), durationMs: Date.now() - startedAt },
    });
    logger.error(`Sync failed for player ${playerId}: ${message}`);
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'SYNC_FAILED', 'Free Fire statistics could not be synchronized. Try again later.');
  }
}

export async function syncAll(triggeredBy: 'MANUAL' | 'SCHEDULED' | 'JOB'): Promise<{ synced: number; skipped: number; failed: number }> {
  const profiles = await prisma.playerProfile.findMany({
    where: { ffUid: { not: null } },
    include: { user: true },
    orderBy: { lastSyncAt: 'asc' },
  });
  let synced = 0;
  let skipped = 0;
  let failed = 0;
  for (const profile of profiles) {
    try {
      const result = await syncPlayer(profile.id, triggeredBy);
      if (result.status === 'SUCCESS') synced++;
      else skipped++;
    } catch {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return { synced, skipped, failed };
}

export async function recentSyncLogs(limit = 20) {
  return prisma.syncLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { player: { include: { user: { select: { displayName: true } } } } },
  });
}

function lifetimeOf(stats: {
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
}): FFStatsBase {
  return {
    kills: stats.kills,
    deaths: stats.deaths,
    matches: stats.matches,
    wins: stats.wins,
    headshots: stats.headshots,
    mvps: stats.mvps,
    clutchWins: stats.clutchWins,
    top10s: stats.top10s,
    mostKillsInMatch: stats.mostKillsInMatch,
    totalXP: stats.totalXP,
  };
}

function weeklyOf(stats: {
  weeklyKills: number;
  weeklyDeaths: number;
  weeklyMatches: number;
  weeklyWins: number;
  weeklyHeadshots: number;
  weeklyMvps: number;
}): FFStatsBase {
  return {
    ...ZERO,
    kills: stats.weeklyKills,
    deaths: stats.weeklyDeaths,
    matches: stats.weeklyMatches,
    wins: stats.weeklyWins,
    headshots: stats.weeklyHeadshots,
    mvps: stats.weeklyMvps,
  };
}

function monthlyOf(stats: {
  monthlyKills: number;
  monthlyDeaths: number;
  monthlyMatches: number;
  monthlyWins: number;
  monthlyHeadshots: number;
  monthlyMvps: number;
}): FFStatsBase {
  return {
    ...ZERO,
    kills: stats.monthlyKills,
    deaths: stats.monthlyDeaths,
    matches: stats.monthlyMatches,
    wins: stats.monthlyWins,
    headshots: stats.monthlyHeadshots,
    mvps: stats.monthlyMvps,
  };
}