import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { param, queryInt, queryString } from '../utils/http';
import { requirePermission } from '../middleware/role';
import { PERMISSIONS } from '../utils/constants';
import { syncLimiter } from '../middleware/rateLimit';
import { providerStatus, recentSyncLogs, syncAll, syncPlayer } from '../services/sync.service';
import { prisma } from '../lib/prisma';

export const freefireRouter = Router();

freefireRouter.use(requireAuth);

freefireRouter.get('/status', async (req: AuthedRequest, res) => {
  const mine = await prisma.playerProfile.findUnique({
    where: { userId: req.user!.id },
    select: { lastSyncAt: true, lastSyncProvider: true, ffUid: true },
  });
  res.json({ data: { ...providerStatus(), me: mine } });
});

freefireRouter.post('/sync/me', syncLimiter, async (req: AuthedRequest, res) => {
  const profile = await prisma.playerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!profile) {
    res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Player profile not found' } });
    return;
  }
  const result = await syncPlayer(profile.id, 'MANUAL');
  res.json({ data: result });
});

freefireRouter.post('/sync/player/:playerId', syncLimiter, requirePermission(PERMISSIONS.SYNC_RUN), async (req, res) => {
  const result = await syncPlayer(param(req, 'playerId'), 'MANUAL');
  res.json({ data: result });
});

freefireRouter.post('/sync/all', syncLimiter, requirePermission(PERMISSIONS.SYNC_RUN), async (req, res) => {
  const result = await syncAll('MANUAL');
  res.json({ data: result });
});

freefireRouter.get('/logs', requirePermission(PERMISSIONS.SYNC_RUN), async (req, res) => {
  const data = await recentSyncLogs(50);
  res.json({ data });
});

freefireRouter.get('/players', requirePermission(PERMISSIONS.SYNC_RUN), async (req, res) => {
  const players = await prisma.playerProfile.findMany({
    where: { ffUid: { not: null } },
    select: {
      id: true,
      ffUid: true,
      ffNickname: true,
      region: true,
      lastSyncAt: true,
      lastSyncProvider: true,
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { lastSyncAt: 'asc' },
  });
  res.json({ data: players });
});
