import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { env, isProd } from '../config/env';
import { logger } from '../lib/logger';
import { sendMail } from './email.service';
import { notify } from './notification.service';
import { recordActivity } from './activity.service';
import { signAccessToken } from '../middleware/auth';

const BCRYPT_COST = 10;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function randomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function cookieOptions(): Record<string, unknown> {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
  };
}

export async function register(input: {
  username: string;
  email: string;
  password: string;
  displayName: string;
}): Promise<{ user: { id: string } }> {
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true, email: true },
  });
  if (existing) {
    const field = existing.username === username ? 'username' : 'email';
    throw new AppError(409, 'ALREADY_EXISTS', `That ${field} is already taken`);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const user = await prisma.user.create({
    data: { username, email, displayName, passwordHash },
  });
  await prisma.playerProfile.create({ data: { userId: user.id } });

  const guild = await prisma.guild.findFirst();
  if (guild) {
    await recordActivity({
      guildId: guild.id,
      actorId: user.id,
      type: 'MEMBER_JOINED',
      message: `${displayName} joined the guild`,
      payload: { displayName },
    });
  }

  return { user: { id: user.id } };
}

export async function login(identifier: string, password: string): Promise<{ userId: string }> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
    },
  });
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/username or password');
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/username or password');
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  return { userId: user.id };
}

export async function issueTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Account not found');
  const accessToken = signAccessToken({ id: user.id, role: user.role });
  const rawRefresh = randomToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawRefresh),
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return { accessToken, refreshToken: rawRefresh };
}

export function cookieNames() {
  return { access: 'ko_access', refresh: 'ko_refresh' };
}

export async function rotateRefresh(rawToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    return null;
  }
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });
  return issueTokens(record.userId);
}

export async function revokeRefresh(rawToken: string): Promise<void> {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (record && !record.revokedAt) {
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
  }
}

export async function forgotPassword(email: string): Promise<{ devLink?: string }> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return {};
  }
  const token = randomToken();
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });
  const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  const sent = await sendMail(
    user.email,
    'Reset your KINGS ONLY password',
    `Use this link to reset your password (valid for 1 hour):\n${link}\nIf you did not request this, ignore this email.`,
  );
  if (!sent && !isProd) {
    logger.info(`Password reset link for ${user.email}: ${link}`);
    return { devLink: link };
  }
  return {};
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or expired');
  }
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await prisma.$transaction([
    prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revokedAt: new Date() } }),
  ]);
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      memberships: {
        include: { guild: true },
      },
    },
  });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  const membership = user.memberships[0];
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    lastSeenAt: user.lastSeenAt,
    createdAt: user.createdAt,
    membership: membership
      ? {
          guildId: membership.guildId,
          guildName: membership.guild.name,
          guildTag: membership.guild.tag,
          guildRole: membership.guildRole,
          guildXp: membership.guildXp,
          seasonXp: membership.seasonXp,
          joinedAt: membership.joinedAt,
        }
      : null,
    profile: user.profile,
  };
}

export async function requestJoinGuild(userId: string, message?: string): Promise<void> {
  const guild = await prisma.guild.findFirst();
  if (!guild) throw new AppError(503, 'GUILD_NOT_SETUP', 'Guild has not been set up yet');
  const existing = await prisma.joinRequest.findFirst({
    where: { guildId: guild.id, userId, status: 'PENDING' },
  });
  if (existing) throw new AppError(409, 'ALREADY_PENDING', 'You already have a pending join request');
  const membership = await prisma.guildMembership.findUnique({
    where: { guildId_userId: { guildId: guild.id, userId } },
  });
  if (membership) throw new AppError(409, 'ALREADY_MEMBER', 'You are already a guild member');
  await prisma.joinRequest.create({
    data: { guildId: guild.id, userId, message: message?.slice(0, 300) ?? null },
  });
}

export async function approveJoinRequest(requestId: string, adminId: string): Promise<void> {
  const request = await prisma.joinRequest.findUnique({ where: { id: requestId }, include: { user: true } });
  if (!request || request.status !== 'PENDING') {
    throw new AppError(404, 'NOT_FOUND', 'Join request not found');
  }
  const membership = await prisma.guildMembership.findUnique({
    where: { guildId_userId: { guildId: request.guildId, userId: request.userId } },
  });
  if (membership) {
    throw new AppError(409, 'ALREADY_MEMBER', 'User is already a member');
  }
  await prisma.$transaction([
    prisma.joinRequest.update({ where: { id: requestId }, data: { status: 'APPROVED', decidedBy: adminId, decidedAt: new Date() } }),
    prisma.guildMembership.create({
      data: { guildId: request.guildId, userId: request.userId, guildRole: 'MEMBER' },
    }),
  ]);
  await notify({
    userId: request.userId,
    type: 'JOIN_REQUEST',
    title: 'Welcome to KINGS ONLY',
    body: 'Your join request was approved. Complete your player profile to get started.',
    link: '/app/profile',
  });
  await recordActivity({
    guildId: request.guildId,
    type: 'MEMBER_JOINED',
    actorId: request.userId,
    message: `${request.user.displayName} joined the guild`,
    payload: { displayName: request.user.displayName },
  });
}

export async function rejectJoinRequest(requestId: string, adminId: string): Promise<void> {
  const request = await prisma.joinRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== 'PENDING') {
    throw new AppError(404, 'NOT_FOUND', 'Join request not found');
  }
  await prisma.joinRequest.update({
    where: { id: requestId },
    data: { status: 'REJECTED', decidedBy: adminId, decidedAt: new Date() },
  });
  await notify({
    userId: request.userId,
    type: 'JOIN_REQUEST',
    title: 'Join request declined',
    body: 'Your join request for KINGS ONLY was declined.',
  });
}