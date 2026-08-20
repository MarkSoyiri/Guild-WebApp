# Deployment Guide

Two Node services: the Express API (`server/`) and the React SPA (`client/`). Workspace root uses npm workspaces. Production runs **everything on Vercel** — the SPA is static hosting, the Express API is a single serverless function, Postgres is Neon (free tier), avatars live in Vercel Blob, and rate limiting uses Upstash Redis.

## Stack

- Express 5 + TypeScript (CommonJS, `tsx` for dev, `tsc` for build)
- React 19 + Vite 6 SPA, TanStack Query, Tailwind v4
- Prisma ORM — SQLite in dev, PostgreSQL in production
- Vercel serverless function (`api/index.js` → `server/dist/serverless.js`)
- Neon Postgres, Vercel Blob, Upstash Redis, Vercel Cron

## Local development

```bash
npm install                 # root installs both workspaces
cp .env.example .env        # defaults are safe for dev
npm run db:push             # create dev.db from schema
npm run db:seed             # idempotent demo data + demo accounts
npm run dev                 # both servers (API :5000, Vite :5173)
```

Demo accounts (from seed, shown in the UI only in dev builds):

| Role        | Email               | Password          |
| ----------- | ------------------- | ---------------- |
| SUPER_ADMIN | admin@kingsonly.gg  | KingsAdmin!2026  |
| MEMBER      | nova@kingsonly.gg   | Nova!2026        |

## QA before shipping

```bash
npm run typecheck   # strict TS, both workspaces
npm run build       # server tsc + client vite build
```

Manually verify the touched screens at 320 / 390 / 768 / 1280 px, including loading, empty, and error states.

## Production build

```bash
npm run build
```

Outputs:

- `server/dist/` — compiled API (both `server.js` for long-running hosts and `serverless.js` for Vercel)
- `client/dist/` — static SPA

## Deploying to Vercel

### 1. One-time: create resources

| Resource            | Provider                | Free tier                                                    |
| ------------------- | ----------------------- | ------------------------------------------------------------ |
| Postgres            | Neon (`console.neon.tech`) | 0.5 GB storage, always-on |
| Rate limit storage  | Upstash Redis (`console.upstash.com`) | 10k requests/day, 256 MB |
| Avatar storage      | Vercel Blob (project settings → Storage) | 1 GB storage, 10 GB bandwidth |
| Cron                | Vercel Cron (free with daily cadence) | 1-2 daily jobs |

### 2. Environment variables (Vercel project settings → Environment Variables)

| Variable                 | Value                                                     |
| ------------------------ | --------------------------------------------------------- |
| `DATABASE_URL`           | Neon connection string (PostgreSQL, with `?sslmode=require`) |
| `JWT_SECRET`             | long random string (min 16 chars)                         |
| `CORS_ORIGIN`            | `https://<project>.vercel.app` (no trailing slash)        |
| `FRONTEND_URL`           | same as `CORS_ORIGIN`                                     |
| `FF_PROVIDER`            | `mock` or `external` (see `docs/FREE_FIRE_INTEGRATION.md`)|
| `FF_API_BASE_URL`        | optional; defaults to the community Free Fire stats API   |
| `FF_API_KEY`             | optional                                                  |
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL                                          |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token                                      |
| `BLOB_READ_WRITE_TOKEN`  | Vercel Blob token (created with the Blob store)           |
| `CRON_SECRET`            | random string; Vercel sends it as `Authorization: Bearer` on cron calls |
| `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` | optional, for password-reset emails             |

Create a second set with the same values (non-encrypted) scoped to **Preview** if you want cron + sync to work on preview deployments.

### 3. Push and deploy

The repo is configured for Vercel via `vercel.json`:

- `buildCommand: node scripts/vercel-build.mjs` — generates the Postgres schema (`prisma/schema.prod.prisma`), runs `prisma migrate deploy`, then builds server + client.
- `outputDirectory: client/dist` — the SPA is served as static files.
- Rewrites: `/api/*` → the serverless function; everything else → SPA fallback.
- Cron: `POST /api/cron/jobs` daily at 01:00 UTC.

Import the repo in the Vercel dashboard (framework preset: **Other**, root directory: repo root). The initial deploy runs the baseline migration against Neon. Every later deploy runs `migrate deploy` again (idempotent).

```bash
vercel            # or push to the connected GitHub repo
```

### 4. Verify

- `https://<project>.vercel.app/api/health` returns `{"data":{"status":"ok",...}}`.
- Sign up a fresh account, log in, and walk Dashboard / Roster / Leaderboard / Events.
- Upload an avatar in Settings → it should return a `*.blob.vercel-storage.com` URL.
- Watch the neon dashboard while hitting the site — reads/writes land in Postgres.
- Trigger a manual sync (`POST /api/freefire/sync/player/:id` as admin) and check `GET /api/freefire/logs`.

## Serverless-specific behavior

| Feature                | Local (long-running)                       | Vercel (serverless)                                    |
| ---------------------- | ------------------------------------------ | ------------------------------------------------------ |
| Background jobs        | `startJobs()` timers in `server.ts`        | Daily `POST /api/cron/jobs` (Vercel Cron)              |
| Rate limiting          | In-memory `express-rate-limit` store       | Upstash Redis store (falls back to memory if unset)    |
| Avatar uploads         | `server/uploads/avatars/` on disk          | Vercel Blob (`avatars/…`), served from blob URL        |
| Avatar size cap        | 4 MB                                       | 4 MB (Vercel body limit ~4.5 MB)                       |
| Weekly stat rollover   | Every Sunday 00:00 via scheduler           | Cron runs daily; rollover fires on the right day       |
| Prisma client          | Generated for SQLite                       | Generated for PostgreSQL (build step)                  |

Notes:

- The Express app is mounted as a serverless function at `api/index.js`; the handler preserves the original URL path so all `/api/*` routes keep working.
- `express.json` caps JSON bodies at 200 kb and multer caps avatar uploads at 4 MB — inside Vercel's request body limits.
- Cookies (`httpOnly` + `SameSite=lax`) work same-origin: the SPA and API share the `*.vercel.app` origin.

## Database migrations

Schema lives in `prisma/schema.prisma` and stays PostgreSQL-compatible (string enums, explicit indexes). Dev uses SQLite + `db:push`; production uses the checked-in baseline migration in `prisma/migrations/`.

- Dev schema change: `npm run db:push`
- Production schema change (from any machine): change `schema.prisma`, then run `npm run db:migrate` (generates `schema.prod.prisma` + a new migration against Neon via `DATABASE_URL`), then commit both. `migrate deploy` at deploy time applies it.
- Seeding: the seed is idempotent. Locally `npm run db:seed`; to seed the Neon DB run `node scripts/prod-schema.mjs && npm run db:seed` (the seed uses the generated client, which must match the target provider).

## Security checklist for the production environment

1. HTTPS everywhere; cookies are `httpOnly` + `SameSite=lax`.
2. `CORS_ORIGIN` lists exactly the production origin.
3. CSRF protection requires `x-csrf-protection: 1` + origin checks on every mutating request (cron path is exempt and instead requires the Bearer `CRON_SECRET`).
4. Rate limiters active: global, auth, and sync (Upstash-backed in production).
5. No secrets in logs; password reset tokens hashed with 1h expiry.
6. `FF_PROVIDER=external` only when a real provider is configured.

## Environment reference

See `.env.example` for the full list with safe defaults.

## Troubleshooting

- `EADDRINUSE` on :5000 — an older API process is still running; kill it by owning PID (`Get-NetTCPConnection -LocalPort 5000`), not by `npx tsx` pattern.
- Prisma client errors after a fresh install — run `npx prisma generate` from the workspace root.
- Sharp errors on Windows — reinstall the binary: `npm install @img/sharp-win32-x64 -w server`.
- Missing vite/plugin-react resolution — `npm install @vitejs/plugin-react -w client` (vite must be hoisted).
- Deploy fails at `prisma migrate deploy` — confirm `DATABASE_URL` is set for the deploy environment and the Neon project is reachable.
- Cron returns 403 — `CRON_SECRET` mismatch between the Vercel env var and what the function sees.
- Blob uploads fail — confirm `BLOB_READ_WRITE_TOKEN` is set in the function environment.