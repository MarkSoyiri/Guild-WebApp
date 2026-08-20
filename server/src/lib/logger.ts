import { env, isProd } from '../config/env';

const LEVELS: Record<string, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function levelOf(level: string): number {
  return LEVELS[level] ?? 20;
}

function fmt(level: string, message: string, extra?: unknown): string {
  const time = new Date().toISOString();
  const base = `${time} [${level.toUpperCase()}] ${message}`;
  if (extra === undefined) return base;
  if (typeof extra === 'string') return `${base} ${extra}`;
  try {
    return `${base} ${JSON.stringify(extra)}`;
  } catch {
    return base;
  }
}

function redact(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (/password|token|secret|authorization|email/i.test(k)) out[k] = '[REDACTED]';
    else if (typeof v === 'object') out[k] = redact(v);
    else out[k] = v;
  }
  return out;
}

export const logger = {
  debug(message: string, extra?: unknown) {
    if (!isProd) console.log(fmt('debug', message, extra));
  },
  info(message: string, extra?: unknown) {
    console.log(fmt('info', message, redact(extra)));
  },
  warn(message: string, extra?: unknown) {
    console.warn(fmt('warn', message, redact(extra)));
  },
  error(message: string, extra?: unknown) {
    console.error(fmt('error', message, redact(extra)));
  },
  level(level: string, message: string, extra?: unknown) {
    if (levelOf(level) >= levelOf('info')) console.log(fmt(level, message, redact(extra)));
  },
};