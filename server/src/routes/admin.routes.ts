import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { param, queryInt, queryString } from '../utils/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../utils/constants';
import { prisma } from '../lib/prisma';
import {
  adminMemberList,
  adminStats,
  memberActivity,
  removeMember,
  setMemberGuildRole,
  setUserRole,
} from '../services/member.service';
import { approveJoinRequest, rejectJoinRequest } from '../services/auth.service';
import { endSeason, getSeasonStats, seasonHistory } from '../services/season.service';
import { captureSnapshots } from '../services/leaderboard.service';
import { grant } from '../services/xp.service';
import { moderatePost } from '../services/community.service';

export const adminRouter = Router();

adminRouter.use(requireAuth);

adminRouter.get('/stats', requirePermission(PERMISSIONS.MEMBERS_VIEW), async (req, res) => {
  const data = await adminStats();
  res.json({ data });
});

adminRouter.get(
  '/members',
  requirePermission(PERMISSIONS.MEMBERS_VIEW),
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      pageSize: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().max(60).optional(),
      guildRole: z.string().max(20).optional(),
    }),
    'query',
  ),
  async (req, res) => {
    const data = await adminMemberList({
      search: queryString(req, 'search'),
      guildRole: queryString(req, 'guildRole'),
      page: queryInt(req, 'page'),
      pageSize: queryInt(req, 'pageSize'),
    });
    res.json({ data });
  },
);

adminRouter.get('/members/:userId/activity', requirePermission(PERMISSIONS.MEMBERS_VIEW), async (req, res) => {
  const data = await memberActivity(param(req, 'userId'), Number(queryString(req, 'days')) || 30);
  res.json({ data });
});

adminRouter.patch(
  '/members/:userId/role',
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  validate(z.object({ role: z.enum(['SUPER_ADMIN', 'GUILD_ADMIN', 'MODERATOR', 'MEMBER']) })),
  async (req: AuthedRequest, res) => {
    if (param(req, 'userId') === req.user!.id && req.body.role !== 'SUPER_ADMIN') {
      res.status(400).json({ error: { code: 'CANNOT_DEMOTE_SELF', message: 'You cannot demote yourself' } });
      return;
    }
    await setUserRole(param(req, 'userId'), req.body.role);
    res.json({ data: { ok: true } });
  },
);

adminRouter.patch(
  '/members/:membershipId/guild-role',
  requirePermission(PERMISSIONS.MEMBERS_MANAGE),
  validate(z.object({ guildRole: z.enum(['LEADER', 'OFFICER', 'MEMBER', 'TRIAL']) })),
  async (req, res) => {
    await setMemberGuildRole(param(req, 'membershipId'), req.body.guildRole);
    res.json({ data: { ok: true } });
  },
);

adminRouter.delete('/members/:userId', requirePermission(PERMISSIONS.MEMBERS_MANAGE), async (req: AuthedRequest, res) => {
  await removeMember(param(req, 'userId'), req.user!.id);
  res.json({ data: { ok: true } });
});

adminRouter.get('/join-requests', requirePermission(PERMISSIONS.MEMBERS_VIEW), async (req, res) => {
  const guild = await prisma.guild.findFirst();
  const requests = guild
    ? await prisma.joinRequest.findMany({
        where: { guildId: guild.id, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, displayName: true, username: true, avatarUrl: true, createdAt: true } },
        },
      })
    : [];
  res.json({ data: requests });
});

adminRouter.post('/join-requests/:id/approve', requirePermission(PERMISSIONS.MEMBERS_MANAGE), async (req: AuthedRequest, res) => {
  await approveJoinRequest(param(req, 'id'), req.user!.id);
  res.json({ data: { ok: true } });
});

adminRouter.post('/join-requests/:id/reject', requirePermission(PERMISSIONS.MEMBERS_MANAGE), async (req: AuthedRequest, res) => {
  await rejectJoinRequest(param(req, 'id'), req.user!.id);
  res.json({ data: { ok: true } });
});

adminRouter.get('/roles', requirePermission(PERMISSIONS.ROLES_MANAGE), async (req, res) => {
  const rows = await prisma.guildRole.findMany();
  res.json({
    data: rows.map((row) => ({
      name: row.name,
      description: row.description,
      permissions: JSON.parse(row.permissions) as string[],
    })),
  });
});

adminRouter.post('/roles', requirePermission(PERMISSIONS.ROLES_MANAGE), validate(z.object({ name: z.string().min(2).max(30) })), async (req, res) => {
  const name = req.body.name as string;
  const permissions = ROLE_PERMISSIONS[name] ?? [];
  await prisma.guildRole.upsert({
    where: { name },
    create: { name, permissions: JSON.stringify(permissions) },
    update: { permissions: JSON.stringify(permissions) },
  });
  res.json({ data: { ok: true } });
});

adminRouter.get('/moderation', requirePermission(PERMISSIONS.MODERATE), async (req, res) => {
  const [hiddenPosts, posts] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'HIDDEN' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { author: { select: { id: true, displayName: true, avatarUrl: true } } },
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { author: { select: { id: true, displayName: true, avatarUrl: true } } },
    }),
  ]);
  res.json({ data: { posts, hiddenPosts } });
});

adminRouter.patch(
  '/moderation/posts/:id',
  requirePermission(PERMISSIONS.MODERATE),
  validate(z.object({ hide: z.coerce.boolean() })),
  async (req, res) => {
    await moderatePost(param(req, 'id'), req.body.hide);
    res.json({ data: { ok: true } });
  },
);

adminRouter.post(
  '/xp',
  requirePermission(PERMISSIONS.XP_ADJUST),
  validate(
    z.object({
      userId: z.string(),
      amount: z.coerce.number().int().min(-100000).max(100000),
      reason: z.string().trim().min(2).max(60),
    }),
  ),
  async (req, res) => {
    const result = await grant({
      userId: req.body.userId,
      amount: req.body.amount,
      reason: 'ADMIN',
      detail: req.body.reason,
      kind: 'ADJUST',
    });
    res.json({ data: result });
  },
);

adminRouter.get('/seasons', requirePermission(PERMISSIONS.MEMBERS_VIEW), async (req, res) => {
  const [history, active] = await Promise.all([seasonHistory(), prisma.season.findFirst({ where: { status: 'ACTIVE' } })]);
  res.json({ data: { history, active } });
});

adminRouter.get('/seasons/:id/stats', requirePermission(PERMISSIONS.MEMBERS_VIEW), async (req, res) => {
  const data = await getSeasonStats(param(req, 'id'));
  res.json({ data });
});

adminRouter.post('/seasons/:id/end', requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req: AuthedRequest, res) => {
  await endSeason(param(req, 'id'), req.user!.id);
  res.json({ data: { ok: true } });
});

adminRouter.post('/snapshots', requirePermission(PERMISSIONS.MEMBERS_VIEW), async (req, res) => {
  const active = await prisma.season.findFirst({ where: { status: 'ACTIVE' } });
  if (!active) {
    res.status(400).json({ error: { code: 'NO_ACTIVE_SEASON', message: 'No active season' } });
    return;
  }
  await captureSnapshots(active.id);
  res.json({ data: { ok: true } });
});
