import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { notify } from './notification.service';
import { grant } from './xp.service';
import { XP_RULES } from '../utils/constants';

export async function listSquadRequests(input: { status?: string; role?: string; page?: number; pageSize?: number }) {
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;
  if (input.role) where.role = input.role;
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 100);
  const [items, total] = await Promise.all([
    prisma.squadRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            profile: { select: { rank: true, playerRole: true } },
          },
        },
        participants: {
          include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
        },
      },
    }),
    prisma.squadRequest.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}

export async function createSquadRequest(input: {
  userId: string;
  role: string;
  rank: string;
  mic: boolean;
  playersNeeded: number;
  note?: string;
}) {
  const active = await prisma.squadRequest.findFirst({
    where: { userId: input.userId, status: 'OPEN' },
  });
  if (active) throw new AppError(409, 'ALREADY_ACTIVE', 'You already have an open squad request');
  if (input.playersNeeded < 1 || input.playersNeeded > 3) {
    throw new AppError(400, 'INVALID_COUNT', 'Players needed must be between 1 and 3');
  }
  return prisma.squadRequest.create({
    data: {
      userId: input.userId,
      role: input.role,
      rank: input.rank,
      mic: input.mic,
      playersNeeded: input.playersNeeded,
      note: input.note?.slice(0, 200) ?? null,
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
  });
}

export async function joinSquadRequest(requestId: string, userId: string): Promise<void> {
  const request = await prisma.squadRequest.findUnique({
    where: { id: requestId },
    include: { participants: true },
  });
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Squad request not found');
  if (request.status !== 'OPEN') throw new AppError(400, 'REQUEST_CLOSED', 'This squad request is closed');
  if (request.userId === userId) throw new AppError(400, 'OWN_REQUEST', 'You cannot join your own request');
  if (request.participants.some((p) => p.userId === userId)) {
    throw new AppError(409, 'ALREADY_JOINED', 'You already joined this squad');
  }
  const slotsFilled = request.participants.length + 1;
  await prisma.squadRequestParticipant.create({ data: { requestId, userId } });
  if (slotsFilled >= request.playersNeeded) {
    await prisma.squadRequest.update({ where: { id: requestId }, data: { status: 'FULL' } });
  }
  const owner = await prisma.user.findUnique({ where: { id: request.userId }, select: { displayName: true } });
  const joiner = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
  await notify({
    userId: request.userId,
    type: 'SYSTEM',
    title: `${joiner?.displayName ?? 'Someone'} joined your squad`,
    body: `${slotsFilled}/${request.playersNeeded} slots filled`,
    link: '/app/squad',
  });
  await notify({
    userId,
    type: 'SYSTEM',
    title: `Squad request joined`,
    body: `You joined ${owner?.displayName ?? 'a member'}'s squad request`,
    link: '/app/squad',
  });
  await grant({ userId, amount: XP_RULES.COMMENT, reason: 'COMMUNITY', detail: 'Squad join' });
}

export async function leaveSquadRequest(requestId: string, userId: string): Promise<void> {
  const participant = await prisma.squadRequestParticipant.findUnique({
    where: { requestId_userId: { requestId, userId } },
  });
  if (!participant) throw new AppError(404, 'NOT_FOUND', 'You are not in this squad');
  await prisma.squadRequestParticipant.delete({ where: { id: participant.id } });
  const request = await prisma.squadRequest.findUnique({ where: { id: requestId } });
  if (request && request.status === 'FULL') {
    await prisma.squadRequest.update({ where: { id: requestId }, data: { status: 'OPEN' } });
  }
}

export async function closeSquadRequest(requestId: string, userId: string): Promise<void> {
  const request = await prisma.squadRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Squad request not found');
  if (request.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Only the author can close this request');
  await prisma.squadRequest.update({ where: { id: requestId }, data: { status: 'CLOSED' } });
}

export async function expireStaleRequests(): Promise<number> {
  const result = await prisma.squadRequest.updateMany({
    where: { status: 'OPEN', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
  return result.count;
}