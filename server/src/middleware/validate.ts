import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { AppError } from '../lib/errors';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = (result.error as ZodError).issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      next(new AppError(422, 'VALIDATION_ERROR', 'Invalid request data', details));
      return;
    }
    if (source === 'query') {
      next();
      return;
    }
    req[source] = result.data;
    next();
  };
}