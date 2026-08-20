import { prisma } from '../lib/prisma';

export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

export async function notify(input: NotificationInput): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    },
  });
}

export async function notifyMany(inputs: NotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;
  await prisma.notification.createMany({
    data: inputs.map((i) => ({
      userId: i.userId,
      type: i.type,
      title: i.title,
      body: i.body ?? null,
      link: i.link ?? null,
    })),
  });
}