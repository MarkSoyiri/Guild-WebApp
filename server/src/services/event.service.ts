import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { grant } from './xp.service';
import { notify } from './notification.service';
import { recordActivity } from './activity.service';
import { XP_RULES } from '../utils/constants';

export async function listEvents(input: { status?: string; upcoming?: boolean; page?: number; pageSize?: number }) {
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;
  if (input.upcoming) {
    where.status = { in: ['SCHEDULED', 'ONGOING'] };
    where.endsAt = { gte: new Date() };
  }
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 100);
  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        organizer: { select: { id: true, displayName: true } },
        participants: {
          include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
          take: 50,
        },
      },
    }),
    prisma.event.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}

export async function getEvent(id: string, userId?: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, displayName: true, avatarUrl: true } },
      participants: {
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
    },
  });
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found');
  const me = userId ? event.participants.find((p) => p.userId === userId) : undefined;
  return { ...event, joined: Boolean(me), participantCount: event.participants.length };
}

export async function createEvent(input: {
  title: string;
  description: string;
  type: string;
  mode?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  maxParticipants?: number;
  organizerId: string;
}) {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  if (input.endsAt <= input.startsAt) {
    throw new AppError(400, 'INVALID_EVENT', 'End time must be after start time');
  }
  if (input.maxParticipants !== undefined && input.maxParticipants !== null && input.maxParticipants < 1) {
    throw new AppError(400, 'INVALID_EVENT', 'Max participants must be positive');
  }
  const event = await prisma.event.create({ data: { ...input } });
  await recordActivity({
    guildId: guild.id,
    actorId: input.organizerId,
    type: 'EVENT_CREATED',
    message: `New ${input.type.replace('_', ' ')}: ${input.title}`,
    payload: { eventId: event.id },
  });
  const members = await prisma.guildMembership.findMany({
    where: { guildId: guild.id },
    select: { userId: true },
  });
  await prisma.notification.createMany({
    data: members.map((m) => ({
      userId: m.userId,
      type: 'EVENT',
      title: `New Event: ${input.title}`,
      body: `${input.startsAt.toLocaleDateString()} · ${input.type.replace('_', ' ')}`,
      link: `/app/events/${event.id}`,
    })),
  });
  return event;
}

export async function updateEvent(
  id: string,
  input: Partial<{
    title: string;
    description: string;
    type: string;
    mode: string;
    location: string;
    startsAt: Date;
    endsAt: Date;
    maxParticipants: number;
    status: string;
  }>,
): Promise<void> {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found');
  await prisma.event.update({ where: { id }, data: input });
}

export async function deleteEvent(id: string): Promise<void> {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found');
  await prisma.event.delete({ where: { id } });
}

export async function joinEvent(eventId: string, userId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { participants: true },
  });
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found');
  if (event.status === 'CANCELLED') throw new AppError(400, 'EVENT_CANCELLED', 'This event was cancelled');
  if (event.status === 'COMPLETED') throw new AppError(400, 'EVENT_ENDED', 'This event has ended');
  if (event.participants.some((p) => p.userId === userId)) {
    throw new AppError(409, 'ALREADY_JOINED', 'You already joined this event');
  }
  if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
    throw new AppError(400, 'EVENT_FULL', 'This event is full');
  }
  const guild = await prisma.guild.findFirst();
  if (guild) {
    const actual = await prisma.guildMembership.findUnique({
      where: { guildId_userId: { guildId: guild.id, userId } },
    });
    if (!actual) throw new AppError(403, 'NOT_A_MEMBER', 'Only guild members can join events');
  }
  await prisma.eventParticipant.create({ data: { eventId, userId } });
  await grant({ userId, amount: XP_RULES.EVENT_JOIN, reason: 'EVENT', detail: event.title });
  await notify({
    userId,
    type: 'EVENT',
    title: `You joined: ${event.title}`,
    body: `Reminder: ${event.startsAt.toLocaleString()}`,
    link: `/app/events/${event.id}`,
  });
}

export async function leaveEvent(eventId: string, userId: string): Promise<void> {
  const participant = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (!participant) throw new AppError(404, 'NOT_FOUND', 'You are not joined to this event');
  await prisma.eventParticipant.delete({ where: { id: participant.id } });
}