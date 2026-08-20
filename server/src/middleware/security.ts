import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

const ALLOWED_ORIGINS = env.CORS_ORIGIN.split(',').map((o) => o.trim());

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  if (req.path.startsWith('/api/cron/')) {
    next();
    return;
  }
  if (req.headers['x-csrf-protection'] !== '1') {
    next(new AppError(403, 'CSRF_FAILED', 'Missing CSRF protection header'));
    return;
  }
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    next(new AppError(403, 'ORIGIN_REJECTED', 'Request origin not allowed'));
    return;
  }
  if (!origin && referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!ALLOWED_ORIGINS.includes(refererOrigin)) {
        next(new AppError(403, 'ORIGIN_REJECTED', 'Request origin not allowed'));
        return;
      }
    } catch {
      next(new AppError(403, 'ORIGIN_REJECTED', 'Request origin not allowed'));
      return;
    }
  }
  next();
}