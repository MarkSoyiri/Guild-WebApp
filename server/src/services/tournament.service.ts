import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { grant } from './xp.service';
import { notify, notifyMany } from './notification.service';
import { recordActivity } from './activity.service';
import { evaluateAchievements } from './achievement.service';
import { XP_RULES } from '../utils/constants';

export async function listTournaments(status?: string) {
  return prisma.tournament.findMany({
    where: status ? { status } : undefined,
    orderBy: { startsAt: 'desc' },
    include: {
      _count: { select: { participants: true, matches: true } },
    },
  });
}

export async function getTournament(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      _count: { select: { participants: true, matches: true } },
      participants: {
        include: { team: { select: { id: true, name: true, tag: true, captainId: true } } },
      },
      matches: {
        include: {
          teamA: { select: { id: true, name: true, tag: true } },
          teamB: { select: { id: true, name: true, tag: true } },
        },
        orderBy: [{ round: 'desc' }, { position: 'asc' }],
      },
    },
  });
  if (!tournament) throw new AppError(404, 'NOT_FOUND', 'Tournament not found');
  return tournament;
}

export async function createTournament(input: {
  name: string;
  description?: string;
  size: number;
  startsAt: Date;
  endsAt?: Date;
  prize?: string;
  createdBy: string;
}) {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  if (![2, 4, 8, 16].includes(input.size)) {
    throw new AppError(400, 'INVALID_SIZE', 'Tournament size must be 2, 4, 8 or 16');
  }
  const tournament = await prisma.tournament.create({
    data: {
      guildId: guild.id,
      name: input.name.trim(),
      description: input.description?.slice(0, 500) ?? null,
      size: input.size,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      prize: input.prize?.slice(0, 200) ?? null,
      createdBy: input.createdBy,
      format: 'SINGLE_ELIM',
    },
  });
  await recordActivity({
    guildId: guild.id,
    actorId: input.createdBy,
    type: 'ANNOUNCEMENT',
    message: `Tournament announced: ${input.name}`,
    payload: { tournamentId: tournament.id },
  });
  const members = await prisma.guildMembership.findMany({
    where: { guildId: guild.id },
    select: { userId: true },
  });
  await notifyMany(
    members.map((m) => ({
      userId: m.userId,
      type: 'TOURNAMENT',
      title: `Tournament Registration Open: ${input.name}`,
      body: `${input.size} teams · starts ${input.startsAt.toLocaleDateString()}`,
      link: `/app/tournaments/${tournament.id}`,
    })),
  );
  return tournament;
}

export async function registerTeam(tournamentId: string, teamId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { participants: true },
  });
  if (!tournament) throw new AppError(404, 'NOT_FOUND', 'Tournament not found');
  if (tournament.status !== 'REGISTRATION') {
    throw new AppError(400, 'REGISTRATION_CLOSED', 'Registration for this tournament is closed');
  }
  if (tournament.participants.length >= tournament.size) {
    throw new AppError(400, 'TOURNAMENT_FULL', 'The tournament is full');
  }
  const existing = tournament.participants.find((p) => p.teamId === teamId);
  if (existing) throw new AppError(409, 'ALREADY_REGISTERED', 'Team is already registered');
  const seed = tournament.participants.length + 1;
  await prisma.tournamentParticipant.create({
    data: { tournamentId, teamId, seed },
  });
  const captain = await prisma.team.findUnique({
    where: { id: teamId },
    select: { captainId: true, name: true },
  });
  if (captain) {
    await notify({
      userId: captain.captainId,
      type: 'TOURNAMENT',
      title: `${captain.name} registered for ${tournament.name}`,
      body: 'Your team is in.',
      link: `/app/tournaments/${tournamentId}`,
    });
  }
}

export async function unregisterTeam(tournamentId: string, teamId: string): Promise<void> {
  const participant = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId } },
  });
  if (!participant) throw new AppError(404, 'NOT_FOUND', 'Team is not registered');
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (tournament && tournament.status !== 'REGISTRATION') {
    throw new AppError(400, 'REGISTRATION_CLOSED', 'Registration for this tournament is closed');
  }
  await prisma.tournamentParticipant.delete({ where: { id: participant.id } });
}

export async function startTournament(id: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { participants: { orderBy: { seed: 'asc' } } },
  });
  if (!tournament) throw new AppError(404, 'NOT_FOUND', 'Tournament not found');
  if (tournament.status !== 'REGISTRATION') {
    throw new AppError(400, 'INVALID_STATE', 'Only registration-stage tournaments can be started');
  }
  const teams = tournament.participants.map((p) => p.teamId);
  if (teams.length < 2) {
    throw new AppError(400, 'NOT_ENOUGH_TEAMS', 'At least 2 teams are required');
  }
  const bracket = buildBracket(teams);
  await prisma.$transaction(
    bracket.map((match) =>
      prisma.tournamentMatch.create({
        data: {
          tournamentId: id,
          round: match.round,
          position: match.position,
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          status: match.teamAId && match.teamBId ? 'SCHEDULED' : 'PENDING',
        },
      }),
    ),
  );
  await prisma.tournament.update({ where: { id }, data: { status: 'ACTIVE' } });
}

interface BracketMatch {
  round: number;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
}

function buildBracket(teamIds: string[]): BracketMatch[] {
  const size = 2 ** Math.ceil(Math.log2(Math.max(teamIds.length, 2)));
  const topRound = Math.log2(size) - 1;
  const matches: BracketMatch[] = [];
  let entrants: (string | null)[] = [];
  for (let position = 0; position < size / 2; position++) {
    const teamAId = teamIds[position * 2] ?? null;
    const teamBId = teamIds[position * 2 + 1] ?? null;
    matches.push({ round: topRound, position, teamAId, teamBId });
    entrants.push(teamAId !== null && teamBId !== null ? null : (teamAId ?? teamBId));
  }
  for (let round = topRound - 1; round >= 0; round--) {
    const winners: (string | null)[] = [];
    for (let position = 0; position * 2 < entrants.length; position++) {
      const teamAId = entrants[position * 2] ?? null;
      const teamBId = entrants[position * 2 + 1] ?? null;
      matches.push({ round, position, teamAId, teamBId });
      winners.push(teamAId !== null && teamBId !== null ? null : (teamAId ?? teamBId));
    }
    entrants = winners;
  }
  return matches;
}

export async function recordMatchResult(
  matchId: string,
  input: { scoreA: number; scoreB: number; mvpId?: string },
): Promise<void> {
  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    include: { tournament: true },
  });
  if (!match) throw new AppError(404, 'NOT_FOUND', 'Match not found');
  if (!match.teamAId || !match.teamBId) {
    throw new AppError(400, 'MATCH_INCOMPLETE', 'Both teams must be assigned');
  }
  const winnerId = input.scoreA > input.scoreB ? match.teamAId : match.teamBId;
  const loserId = winnerId === match.teamAId ? match.teamBId : match.teamAId;

  await prisma.$transaction([
    prisma.tournamentMatch.update({
      where: { id: matchId },
      data: {
        scoreA: input.scoreA,
        scoreB: input.scoreB,
        winnerId,
        status: 'COMPLETED',
        mvpId: input.mvpId ?? null,
        playedAt: new Date(),
      },
    }),
    prisma.tournamentParticipant.updateMany({
      where: { tournamentId: match.tournamentId, teamId: loserId },
      data: { status: 'ELIMINATED' },
    }),
    prisma.team.update({ where: { id: winnerId }, data: { wins: { increment: 1 }, matches: { increment: 1 } } }),
    prisma.team.update({ where: { id: loserId }, data: { matches: { increment: 1 } } }),
  ]);

  if (match.round > 0) {
    const nextRound = match.round - 1;
    const nextPosition = Math.floor(match.position / 2);
    const isLeft = match.position % 2 === 0;
    const nextMatch = await prisma.tournamentMatch.findUnique({
      where: {
        tournamentId_round_position: {
          tournamentId: match.tournamentId,
          round: nextRound,
          position: nextPosition,
        },
      },
    });
    if (nextMatch) {
      await prisma.tournamentMatch.update({
        where: { id: nextMatch.id },
        data: isLeft ? { teamAId: winnerId, status: nextMatch.teamBId ? 'SCHEDULED' : 'PENDING' } : { teamBId: winnerId, status: nextMatch.teamAId ? 'SCHEDULED' : 'PENDING' },
      });
    }
  } else {
    const team = await prisma.team.findUnique({ where: { id: winnerId } });
    const mvp = input.mvpId
      ? await prisma.user.findUnique({ where: { id: input.mvpId }, select: { displayName: true } })
      : null;
    await prisma.$transaction([
      prisma.tournament.update({
        where: { id: match.tournamentId },
        data: { status: 'COMPLETED', winnerTeamId: winnerId, mvpId: input.mvpId ?? null },
      }),
      prisma.tournamentParticipant.updateMany({
        where: { tournamentId: match.tournamentId, teamId: winnerId },
        data: { status: 'CHAMPION' },
      }),
    ]);
    const guild = await prisma.guild.findFirst();
    if (guild) {
      await recordActivity({
        guildId: guild.id,
        type: 'TOURNAMENT_WON',
        message: `${team?.name ?? 'A team'} won ${match.tournament.name}${mvp ? ` — MVP ${mvp.displayName}` : ''}`,
        payload: { tournamentId: match.tournamentId, teamId: winnerId },
      });
    }
    const captain = team?.captainId ? await prisma.user.findUnique({ where: { id: team.captainId } }) : null;
    if (captain) {
      await grant({ userId: captain.id, amount: XP_RULES.TOURNAMENT_WIN, reason: 'TOURNAMENT', detail: match.tournament.name });
    }
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId: match.tournamentId },
      include: { team: { select: { captainId: true } } },
    });
    for (const p of participants) {
      await grant({
        userId: p.team.captainId,
        amount: XP_RULES.TOURNAMENT_PARTICIPATION,
        reason: 'TOURNAMENT',
        detail: match.tournament.name,
      });
      await evaluateAchievements(p.team.captainId);
    }
  }
}

export async function cancelTournament(id: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) throw new AppError(404, 'NOT_FOUND', 'Tournament not found');
  if (tournament.status === 'COMPLETED') {
    throw new AppError(400, 'ALREADY_COMPLETED', 'Completed tournaments cannot be cancelled');
  }
  await prisma.tournament.update({ where: { id }, data: { status: 'CANCELLED' } });
}