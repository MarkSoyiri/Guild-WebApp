import { Router, type Response } from 'express';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { avatarUpload, handleMulterError } from '../middleware/upload';
import { deleteStaleAvatar, saveAvatar, validateImageSize } from '../services/upload.service';
import { prisma } from '../lib/prisma';

export const uploadRouter = Router();

uploadRouter.post('/avatar', requireAuth, avatarUpload.single('avatar'), handleMulterError, async (req: AuthedRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: { code: 'NO_FILE', message: 'No image provided' } });
    return;
  }
  validateImageSize(req.file.buffer);
  const previous = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { avatarUrl: true },
  });
  const url = await saveAvatar(req.user!.id, req.file.buffer);
  if (previous && previous.avatarUrl !== url) {
    deleteStaleAvatar(previous.avatarUrl);
  }
  res.json({ data: { avatarUrl: url } });
});
