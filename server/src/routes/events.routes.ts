import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { param, queryInt, queryString } from '../utils/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { PERMISSIONS, EVENT_TYPES } from '../utils/constants';
import { createEvent, deleteEvent, getEvent, joinEvent, leaveEvent, listEvents, updateEvent } from '../services/event.service';

export const eventsRouter = Router();

eventsRouter.use(requireAuth);

eventsRouter.get(
  '/',
  validate(
    z.object({
      status: z.string().max(20).optional(),
      upcoming: z.enum(['true', 'false']).optional(),
      page: z.coerce.number().int().positive().optional(),
      pageSize: z.coerce.number().int().positive().max(100).optional(),
    }),
    'query',
  ),
  async (req, res) => {
    const data = await listEvents({
      status: queryString(req, 'status'),
      upcoming: req.query.upcoming === 'true',
      page: queryInt(req, 'page'),
      pageSize: queryInt(req, 'pageSize'),
    });
    res.json({ data });
  },
);

eventsRouter.get('/:id', async (req: AuthedRequest, res) => {
  const data = await getEvent(param(req, 'id'), req.user!.id);
  res.json({ data });
});

const eventSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(80),
  description: z.string().trim().min(3).max(1000),
  type: z.enum(EVENT_TYPES),
  mode: z.string().trim().max(40).optional(),
  location: z.string().trim().max(120).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  maxParticipants: z.coerce.number().int().positive().max(64).nullable().optional(),
});

eventsRouter.post('/', requirePermission(PERMISSIONS.EVENTS_CREATE), validate(eventSchema), async (req: AuthedRequest, res) => {
  const event = await createEvent({ ...req.body, organizerId: req.user!.id });
  res.status(201).json({ data: event });
});

const eventUpdateSchema = eventSchema.partial().extend({
  status: z.enum(['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
});

eventsRouter.patch('/:id', requirePermission(PERMISSIONS.EVENTS_MANAGE), validate(eventUpdateSchema), async (req, res) => {
  await updateEvent(param(req, 'id'), req.body);
  res.json({ data: { ok: true } });
});

eventsRouter.delete('/:id', requirePermission(PERMISSIONS.EVENTS_MANAGE), async (req, res) => {
  await deleteEvent(param(req, 'id'));
  res.json({ data: { ok: true } });
});

eventsRouter.post('/:id/join', async (req: AuthedRequest, res) => {
  await joinEvent(param(req, 'id'), req.user!.id);
  res.json({ data: { ok: true } });
});

eventsRouter.post('/:id/leave', async (req: AuthedRequest, res) => {
  await leaveEvent(param(req, 'id'), req.user!.id);
  res.json({ data: { ok: true } });
});
