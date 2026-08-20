import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { param, queryInt, queryString } from '../utils/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get(
  '/',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      pageSize: z.coerce.number().int().positive().max(100).optional(),
      unreadOnly: z.enum(['true', 'false']).optional(),
    }),
    'query',
  ),
  async (req: AuthedRequest, res) => {
    const page = Math.max(queryInt(req, 'page') ?? 1, 1);
    const pageSize = Math.min(Math.max(queryInt(req, 'pageSize') ?? 20, 1), 100);
    const where = {
      userId: req.user!.id,
      ...(queryString(req, 'unreadOnly') === 'true' ? { read: false } : {}),
    };
    const [items, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId: req.user!.id } }),
      prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
    ]);
    res.json({
      data: { items, total, unread, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  },
);

notificationsRouter.get('/unread-count', async (req: AuthedRequest, res) => {
  const count = await prisma.notification.count({ where: { userId: req.user!.id, read: false } });
  res.json({ data: { count } });
});

notificationsRouter.patch('/:id/read', async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({
    where: { id: param(req, 'id'), userId: req.user!.id },
    data: { read: true },
  });
  res.json({ data: { ok: true } });
});

notificationsRouter.post('/read-all', async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true },
  });
  res.json({ data: { ok: true } });
});
