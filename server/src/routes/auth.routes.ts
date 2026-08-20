import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import {
  forgotPassword,
  getMe,
  issueTokens,
  login,
  register,
  requestJoinGuild,
  resetPassword,
  revokeRefresh,
  rotateRefresh,
} from '../services/auth.service';

export const authRouter = Router();

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
  email: z.string().trim().email('Invalid email').max(120),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  displayName: z.string().trim().min(2, 'Display name must be at least 2 characters').max(24),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(2).max(120),
  password: z.string().min(1).max(100),
});

const forgotSchema = z.object({ email: z.string().trim().email().max(120) });

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(100),
});

const joinRequestSchema = z.object({ message: z.string().trim().max(300).optional() });

const refreshSchema = z.object({ refreshToken: z.string().min(10).optional() });

function setTokenCookies(res: import('express').Response, accessToken: string, refreshToken: string): void {
  res.cookie('ko_access', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('ko_refresh', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 14 * 24 * 60 * 60 * 1000,
  });
}

function clearTokenCookies(res: import('express').Response): void {
  res.clearCookie('ko_access', { path: '/' });
  res.clearCookie('ko_refresh', { path: '/' });
}

authRouter.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const result = await register(req.body);
  const tokens = await issueTokens(result.user.id);
  setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
  res.status(201).json({ data: { id: result.user.id } });
});

authRouter.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const result = await login(req.body.identifier, req.body.password);
  const tokens = await issueTokens(result.userId);
  setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ data: { id: result.userId } });
});

authRouter.post('/refresh', validate(refreshSchema), async (req, res) => {
  const raw = (req.body as { refreshToken?: string }).refreshToken ?? req.cookies?.ko_refresh;
  if (!raw) {
    clearTokenCookies(res);
    res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Session expired, sign in again' } });
    return;
  }
  const tokens = await rotateRefresh(raw);
  if (!tokens) {
    clearTokenCookies(res);
    res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Session expired, sign in again' } });
    return;
  }
  setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ data: { ok: true } });
});

authRouter.post('/logout', async (req, res) => {
  const raw = (req.body as { refreshToken?: string }).refreshToken ?? req.cookies?.ko_refresh;
  if (raw) {
    await revokeRefresh(raw);
  }
  clearTokenCookies(res);
  res.json({ data: { ok: true } });
});

authRouter.post('/forgot-password', authLimiter, validate(forgotSchema), async (req, res) => {
  const result = await forgotPassword(req.body.email);
  res.json({ data: result });
});

authRouter.post('/reset-password', authLimiter, validate(resetSchema), async (req, res) => {
  await resetPassword(req.body.token, req.body.password);
  res.json({ data: { ok: true } });
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const me = await getMe(req.user!.id);
  res.json({ data: me });
});

authRouter.post('/guild/join-request', requireAuth, validate(joinRequestSchema), async (req: AuthedRequest, res) => {
  await requestJoinGuild(req.user!.id, req.body.message);
  res.status(201).json({ data: { status: 'PENDING' } });
});
