import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  const status = (err as { status?: number }).status;
  const code = (err as { code?: string }).code;
  if (status === 401) {
    res.status(401).json({ error: { code: code ?? 'UNAUTHORIZED', message: 'Unauthorized' } });
    return;
  }
  if (status === 403) {
    res.status(403).json({ error: { code: code ?? 'FORBIDDEN', message: 'Forbidden' } });
    return;
  }
  if (status === 404) {
    res.status(404).json({ error: { code: code ?? 'NOT_FOUND', message: 'Not found' } });
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected error';
  logger.error(`Unhandled error on ${req.method} ${req.path}: ${message}`, { stack: err instanceof Error ? err.stack : undefined });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}