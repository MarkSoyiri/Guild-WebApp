import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../lib/errors';

const MAX_SIZE = 4 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(new AppError(400, 'INVALID_FILE', 'Only JPEG, PNG or WebP images are allowed'));
      return;
    }
    cb(null, true);
  },
});

export function handleMulterError(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    next(new AppError(400, 'UPLOAD_ERROR', err.message));
    return;
  }
  next(err);
}