import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  role: string;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export const ACCESS_TOKEN_COOKIE = 'ko_access';
export const REFRESH_TOKEN_COOKIE = 'ko_refresh';

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, kind: 'refresh' }, env.JWT_SECRET, {
    expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d`,
  });
}

export function verifyAccessToken(token: string): AuthUser {
  const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid token');
  }
  return { id: payload.sub, role: String(payload.role ?? 'MEMBER') };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    const user = verifyAccessToken(token);
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, status: true },
    });
    if (!dbUser || dbUser.status !== 'ACTIVE') {
      throw new AppError(401, 'UNAUTHORIZED', 'Account unavailable');
    }
    req.user = { id: dbUser.id, role: dbUser.role };
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
    if (token) {
      try {
        const user = verifyAccessToken(token);
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true, status: true },
        });
        if (dbUser && dbUser.status === 'ACTIVE') {
          req.user = { id: dbUser.id, role: dbUser.role };
        }
      } catch {
        // invalid token is treated as anonymous
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to do this'));
      return;
    }
    next();
  };
}