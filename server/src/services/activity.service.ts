import { prisma } from '../lib/prisma';

export interface ActivityInput {
  guildId: string;
  actorId?: string;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
}

export async function recordActivity(input: ActivityInput): Promise<void> {
  await prisma.guildActivity.create({
    data: {
      guildId: input.guildId,
      actorId: input.actorId ?? null,
      type: input.type,
      message: input.message,
      payload: input.payload ? JSON.stringify(input.payload) : null,
    },
  });
}

export async function recordActivityMany(inputs: ActivityInput[]): Promise<void> {
  if (inputs.length === 0) return;
  await prisma.guildActivity.createMany({
    data: inputs.map((i) => ({
      guildId: i.guildId,
      actorId: i.actorId ?? null,
      type: i.type,
      message: i.message,
      payload: i.payload ? JSON.stringify(i.payload) : null,
    })),
  });
}

export async function getDefaultGuildId(): Promise<string> {
  const guild = await prisma.guild.findFirst({ select: { id: true } });
  return guild?.id ?? '';
}