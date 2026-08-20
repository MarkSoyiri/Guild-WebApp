import type { Request } from 'express';
import { AppError } from '../lib/errors';

export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new AppError(404, 'NOT_FOUND', 'Resource not found');
  }
  return value;
}

export function queryString(req: Request, name: string): string | undefined {
  const value = req.query[name];
  return typeof value === 'string' ? value : undefined;
}

export function queryInt(req: Request, name: string): number | undefined {
  const value = queryString(req, name);
  return value === undefined ? undefined : Number(value);
}