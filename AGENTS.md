# AGENTS.md — Engineering rules for KINGS ONLY

How this project is built. These rules are binding for all code in this repository.

## 1. Repository layout

```
Guild WebApp/
├── prisma/            # schema.prisma + seed.ts (database owns everything relational)
├── server/            # Express 5 + TypeScript API (CommonJS, tsx for dev)
├── client/            # React 19 + Vite SPA
├── docs/              # integration & deployment guides
├── DESIGN.md          # visual source of truth (read before any UI work)
├── PRODUCT.md         # product vision
└── .env.example       # template; never commit .env
```

## 2. General rules

- TypeScript `strict` on both sides. No `any` unless forced by a third-party boundary, then isolate it.
- **No code comments.** Code must be self-explanatory; names carry meaning. Docs live in markdown.
- No dead code: unused imports, exports, or branches are removed.
- Prefer small focused modules over large ones. One responsibility per file.
- Never duplicate a constant; shared enums/lists live in one module per side (`server/src/utils/constants.ts`, `client/src/lib/constants.ts`).
- API response contract: success `{ data: ... }`, failure `{ error: { code, message, details? } }`. Never leak stack traces or DB errors.

## 3. Backend rules

- All route handlers are async and rely on Express 5's automatic rejected-promise forwarding to the error middleware.
- Every request body is validated with a zod schema defined next to its route. `validate` middleware returns 422 with field details.
- Auth middleware populates `req.user` (id + role) from the access token. Roles are **never** accepted from the client.
- Authorization uses `requirePermission('permission.key')` resolved from `ROLE_PERMISSIONS` in constants. Check inside the route, not only in controllers.
- Mutating requests (non-GET) require the `x-csrf-protection: 1` header and must pass origin checks.
- Passwords: bcryptjs, cost 10. Refresh tokens stored hashed. Password reset tokens hashed, 1h expiry.
- All DB writes that affect XP go through `xpService.grant()` — never direct field increments.
- Provider abstraction: Free Fire data flows Frontend → API → `syncService` → `freefireProvider`. UI code never talks to a provider directly.
- Rate limiting: global limiter + stricter limiters on auth and sync routes.
- Logging: `lib/logger` (morgan access logs + structured console). No secrets in logs.
- Services never return Prisma error types to controllers; they throw `AppError(status, code, message)`.

## 4. Frontend rules

- Mobile-first: build each page at 360px, then widen. No horizontal overflow — verify at 320px.
- Data fetching exclusively through TanStack Query. Mutations use `useMutation` + optimistic updates where safe.
- API client is centralized in `lib/api.ts` (axios, credentials, CSRF header, error normalization). Pages never call axios directly.
- Components: UI primitives in `components/ui/`, domain components in `features/<domain>/`. Pages compose, never implement logic inline.
- Every data view has: loading skeleton, empty state, error state, success state.
- Motion via framer-motion only; respect `prefers-reduced-motion`.
- Icons: lucide-react only. Charts: recharts only. Dates/numbers via `lib/format.ts` (relative time, compact numbers).
- Tailwind v4 semantic tokens from `styles/globals.css` — no raw hex values in components.

## 5. Database

- Schema lives in `prisma/schema.prisma`. Dev uses SQLite (`file:./dev.db`); the schema stays PostgreSQL-compatible (string enums, explicit indexes).
- Dev: `npm run db:push`. Production: `npm run db:migrate` generates `prisma/schema.prod.prisma` + a new migration in `prisma/migrations/`, applied at deploy time with `prisma migrate deploy` (see `scripts/vercel-build.mjs`).
- Queries must use the indexes defined in the schema; leaderboards/feeds are the hot paths.
- Seed (`prisma/seed.ts`) is idempotent — safe to run repeatedly.
- Never store Free Fire credentials; only UID + region + public stats.

## 6. Hosting (Vercel serverless)

- Everything deploys to Vercel: SPA static files (`client/dist`), the Express API as one function (`api/index.js` → `server/dist/serverless.js`), Neon Postgres, Vercel Blob for avatars, Upstash Redis for rate limits, Vercel Cron for daily jobs.
- No long-running processes: timers live only in `server.ts` (local dev). Serverless jobs run through the cron route (`/api/cron/jobs`, Bearer `CRON_SECRET`).
- Storage/rate-limit adapters must fall back to local behaviour when their env var is empty (blob → disk, Upstash → memory) so `npm run dev` keeps working.
- The serverless handler in `serverless.ts` normalizes the request URL so Express routes keep their `/api` prefix; never mount the app at `/` on Vercel.
- Add new production-only env vars to `server/src/config/env.ts` with safe empty defaults and to `.env.example`.

## 7. Security checklist (every endpoint)

1. Auth required? (except documented public routes)
2. Permission enforced server-side?
3. Input validated (zod) and length-capped?
4. Output sanitized (no secrets, no internal fields)?
5. Rate limit appropriate for the route?
6. CSV/HTML content escaped where user content is echoed?

## 8. QA commands

```
npm run typecheck     # both workspaces, strict TS
npm run build         # server tsc + client vite build
npm run db:seed       # idempotent demo data
npm run dev           # both servers
```

Before considering work complete: run typecheck, run build, and manually verify the touched screens at 320/390/768/1280px including loading, empty, and error states.