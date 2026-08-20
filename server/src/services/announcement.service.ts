import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { notifyMany } from './notification.service';
import { recordActivity } from './activity.service';

export async function listAnnouncements(input: { includeExpired?: boolean; page?: number; pageSize?: number }) {
  const where: Record<string, unknown> = { publishedAt: { not: null } };
  if (!input.includeExpired) {
    where.OR = [{ expiresAt: null }, { expiresAt: { gte: new Date() } }];
  }
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 100);
  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { author: { select: { id: true, displayName: true, avatarUrl: true } } },
    }),
    prisma.announcement.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}

export async function createAnnouncement(input: {
  title: string;
  content: string;
  priority: string;
  pinned: boolean;
  expiresAt?: Date;
  authorId: string;
  publish: boolean;
}) {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  const announcement = await prisma.announcement.create({
    data: {
      title: input.title.trim(),
      content: input.content.trim(),
      priority: input.priority,
      pinned: input.pinned,
      expiresAt: input.expiresAt ?? null,
      publishedAt: input.publish ? new Date() : null,
      authorId: input.authorId,
    },
  });
  if (input.publish) {
    await recordActivity({
      guildId: guild.id,
      actorId: input.authorId,
      type: 'ANNOUNCEMENT',
      message: `New announcement: ${input.title}`,
      payload: { announcementId: announcement.id },
    });
    const members = await prisma.guildMembership.findMany({
      where: { guildId: guild.id },
      select: { userId: true },
    });
    await notifyMany(
      members.map((m) => ({
        userId: m.userId,
        type: 'ANNOUNCEMENT',
        title: input.title,
        body: input.content.slice(0, 140),
        link: '/app/community',
      })),
    );
  }
  return announcement;
}

export async function updateAnnouncement(
  id: string,
  input: Partial<{
    title: string;
    content: string;
    priority: string;
    pinned: boolean;
    expiresAt: Date;
    publishedAt: Date;
  }>,
): Promise<void> {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) throw new AppError(404, 'NOT_FOUND', 'Announcement not found');
  await prisma.announcement.update({ where: { id }, data: input });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) throw new AppError(404, 'NOT_FOUND', 'Announcement not found');
  await prisma.announcement.delete({ where: { id } });
}