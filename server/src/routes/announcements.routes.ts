import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { param, queryInt, queryString } from '../utils/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { PERMISSIONS } from '../utils/constants';
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from '../services/announcement.service';

export const announcementsRouter = Router();

announcementsRouter.use(requireAuth);

announcementsRouter.get(
  '/',
  validate(
    z.object({
      includeExpired: z.enum(['true', 'false']).optional(),
      page: z.coerce.number().int().positive().optional(),
      pageSize: z.coerce.number().int().positive().max(100).optional(),
    }),
    'query',
  ),
  async (req, res) => {
    const data = await listAnnouncements({
      includeExpired: req.query.includeExpired === 'true',
      page: queryInt(req, 'page'),
      pageSize: queryInt(req, 'pageSize'),
    });
    res.json({ data });
  },
);

const announcementSchema = z.object({
  title: z.string().trim().min(3).max(80),
  content: z.string().trim().min(3).max(2000),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  pinned: z.coerce.boolean().default(false),
  expiresAt: z.coerce.date().optional(),
  publish: z.coerce.boolean().default(true),
});

announcementsRouter.post('/', requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE), validate(announcementSchema), async (req: AuthedRequest, res) => {
  const announcement = await createAnnouncement({ ...req.body, authorId: req.user!.id });
  res.status(201).json({ data: announcement });
});

const announcementUpdateSchema = z.object({
  title: z.string().trim().min(3).max(80).optional(),
  content: z.string().trim().min(3).max(2000).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  pinned: z.coerce.boolean().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

announcementsRouter.patch('/:id', requirePermission(PERMISSIONS.ANNOUNCEMENTS_MANAGE), validate(announcementUpdateSchema), async (req, res) => {
  await updateAnnouncement(param(req, 'id'), req.body);
  res.json({ data: { ok: true } });
});

announcementsRouter.delete('/:id', requirePermission(PERMISSIONS.ANNOUNCEMENTS_MANAGE), async (req, res) => {
  await deleteAnnouncement(param(req, 'id'));
  res.json({ data: { ok: true } });
});
