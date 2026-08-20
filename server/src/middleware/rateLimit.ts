import rateLimit, { type Store, type ClientRateLimitInfo, type RateLimitRequestHandler } from 'express-rate-limit';
import { Redis } from '@upstash/redis';
import { env } from '../config/env';

class UpstashStore implements Store {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const fullKey = `ko:${key}`;
    const count = await this.redis.incr(fullKey);
    if (count === 1) {
      await this.redis.expire(fullKey, Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000));
    }
    const ttl = await this.redis.ttl(fullKey);
    return {
      totalHits: count,
      resetTime: new Date(Date.now() + ttl * 1000),
    };
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(`ko:${key}`);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(`ko:${key}`);
  }

  localKeys = false;
  prefix = 'ko';
}

function hasUpstash(): boolean {
  return env.UPSTASH_REDIS_REST_URL !== '' && env.UPSTASH_REDIS_REST_TOKEN !== '';
}

function buildLimiter(limit: number, windowMs: number, message: unknown): RateLimitRequestHandler {
  const base = {
    windowMs,
    limit,
    standardHeaders: 'draft-7' as const,
    legacyHeaders: false,
    message,
  };
  return hasUpstash()
    ? rateLimit({ ...base, store: new UpstashStore() })
    : rateLimit(base);
}

export const globalLimiter = buildLimiter(
  env.RATE_LIMIT_MAX,
  env.RATE_LIMIT_WINDOW_MS,
  { error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.' } },
);

export const authLimiter = buildLimiter(
  20,
  15 * 60 * 1000,
  { error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later.' } },
);

export const syncLimiter = buildLimiter(
  10,
  60 * 1000,
  { error: { code: 'RATE_LIMITED', message: 'Sync requests are rate limited.' } },
);