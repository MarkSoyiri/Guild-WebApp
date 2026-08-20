import type { NextFunction, Response } from 'express';
import { AppError } from '../lib/errors';
import { ROLE_PERMISSIONS, type Permission } from '../utils/constants';
import type { AuthedRequest } from './auth';

export function requirePermission(permission: Permission) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }
    const allowed = ROLE_PERMISSIONS[req.user.role] ?? [];
    if (!allowed.includes(permission)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to do this'));
      return;
    }
    next();
  };
}