import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { notify } from './notification.service';
import { recordActivity } from './activity.service';
import { evaluateAchievements } from './achievement.service';

export async function listTeams() {
  return prisma.team.findMany({
    orderBy: { wins: 'desc' },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              profile: { select: { rank: true, playerRole: true } },
            },
          },
        },
      },
      _count: { select: { members: true } },
    },
  });
}

export async function getTeam(id: string) {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              profile: { select: { rank: true, playerRole: true, stats: true } },
            },
          },
        },
      },
      tournamentParticipants: {
        include: { tournament: { select: { id: true, name: true, status: true, startsAt: true } } },
      },
    },
  });
  if (!team) throw new AppError(404, 'NOT_FOUND', 'Team not found');
  return team;
}

export async function createTeam(input: {
  name: string;
  tag?: string;
  description?: string;
  captainId: string;
}) {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  const existing = await prisma.team.findUnique({
    where: { guildId_name: { guildId: guild.id, name: input.name.trim() } },
  });
  if (existing) throw new AppError(409, 'ALREADY_EXISTS', 'A team with that name already exists');
  const team = await prisma.team.create({
    data: {
      guildId: guild.id,
      name: input.name.trim(),
      tag: input.tag?.trim() ?? null,
      description: input.description?.slice(0, 300) ?? null,
      captainId: input.captainId,
    },
  });
  await prisma.teamMember.create({
    data: { teamId: team.id, userId: input.captainId, role: 'CAPTAIN' },
  });
  await recordActivity({
    guildId: guild.id,
    actorId: input.captainId,
    type: 'TEAM_FORMED',
    message: `Team ${team.name} was formed`,
    payload: { teamId: team.id },
  });
  await evaluateAchievements(input.captainId);
  return team;
}

export async function updateTeam(
  id: string,
  input: Partial<{ name: string; tag: string; description: string; wins: number; matches: number }>,
): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) throw new AppError(404, 'NOT_FOUND', 'Team not found');
  await prisma.team.update({ where: { id }, data: input });
}

export async function deleteTeam(id: string): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) throw new AppError(404, 'NOT_FOUND', 'Team not found');
  await prisma.team.delete({ where: { id } });
}

export async function addTeamMember(teamId: string, userId: string, role = 'PLAYER'): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError(404, 'NOT_FOUND', 'Team not found');
  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (existing) throw new AppError(409, 'ALREADY_MEMBER', 'User is already on this team');
  await prisma.teamMember.create({ data: { teamId, userId, role } });
  await notify({
    userId,
    type: 'INVITE',
    title: `You joined ${team.name}`,
    body: 'Welcome to the roster.',
    link: `/app/teams/${teamId}`,
  });
  await evaluateAchievements(userId);
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError(404, 'NOT_FOUND', 'Team not found');
  if (team.captainId === userId) {
    throw new AppError(400, 'CAPTAIN_CANNOT_LEAVE', 'Transfer the captain role before removing the captain');
  }
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!member) throw new AppError(404, 'NOT_FOUND', 'User is not on this team');
  await prisma.teamMember.delete({ where: { id: member.id } });
}

export async function setCaptain(teamId: string, userId: string): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError(404, 'NOT_FOUND', 'Team not found');
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!member) throw new AppError(404, 'NOT_FOUND', 'User is not on this team');
  await prisma.$transaction([
    prisma.team.update({ where: { id: teamId }, data: { captainId: userId } }),
    prisma.teamMember.updateMany({ where: { teamId, role: 'CAPTAIN' }, data: { role: 'PLAYER' } }),
    prisma.teamMember.update({ where: { id: member.id }, data: { role: 'CAPTAIN' } }),
  ]);
}