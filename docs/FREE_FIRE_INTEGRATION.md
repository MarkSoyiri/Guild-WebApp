# Free Fire Integration

KINGS ONLY pulls player stats through a provider abstraction. The UI and API never talk to an external service directly — all Free Fire data flows through `syncService`, which delegates to a single provider.

## Architecture

```
Free Fire (external API)
        │
        ▼
FreeFireProvider  (server/src/providers/freefire/)
        │
        ▼
syncService       (server/src/services/sync.service.ts)
        │
        ▼
Prisma            (playerProfile + freeFireStats + freeFireMatch)
        │
        ▼
REST API          (/freefire/*, /players/*)
        │
        ▼
Client SPA        (lib/api.ts → TanStack Query)
```

## Provider selection

`FF_PROVIDER` in `.env` selects the implementation:

| Value      | Provider                          | Behaviour                                  |
| ---------- | --------------------------------- | ------------------------------------------ |
| `mock`     | `MockFreeFireProvider`            | Deterministic demo data, no network calls  |
| `external` | `ExternalFreeFireProvider`        | Live data via `FF_API_BASE_URL` (community Free Fire stats API) |

The provider is a singleton (`getFreeFireProvider()`). On boot the server logs which one is active:

```
[INFO] Free Fire provider: mock (demo data)
```

## Provider interface

`server/src/providers/freefire/types.ts` defines the contract. A provider must implement:

```ts
getPlayerProfile(uid, region): Promise<FFProfile>
getPlayerStats(uid, region): Promise<FFStats>
getMatchHistory(uid, region, limit?): Promise<FFMatchResult[]>
getRankData(uid, region): Promise<FFRank>
```

Return shapes:

- `FFProfile` — `{ uid, nickname, region, level, rank: { tier, points } }`
- `FFStats` — `{ lifetime, weekly, monthly }` where each is an `FFStatsBase` (kills, deaths, matches, wins, headshots, mvps, clutchWins, top10s, mostKillsInMatch, totalXP)
- `FFMatchResult` — one row per match (mode, result, placement, kills, assists, damage, headshots, isMvp, playedAt)

## The external provider (live data)

`ExternalFreeFireProvider` is a REST client for the Free Fire Community API (`https://developers.freefirecommunity.com/api/v1`, endpoints `/info` and `/stats`). It is a real provider with live stats but **no official relationship to Garena**; treat it as a community data source that can change or go down. An API key is required — get a free one at `developers.freefirecommunity.com` (100 requests/hour on the free tier). Requests also send a custom `User-Agent`; the API rejects generic library user agents.

Configuration (`FF_PROVIDER=external`):

| Env var             | Default                                              | Purpose                            |
| ------------------- | ---------------------------------------------------- | ---------------------------------- |
| `FF_API_BASE_URL`   | `https://developers.freefirecommunity.com/api/v1`    | Base URL of the stats API          |
| `FF_API_KEY`        | (empty)                                              | Required `x-api-key` header        |
| `FF_API_TIMEOUT_MS` | `9000`                                       | Request timeout                    |
| `FF_PROVIDER_RATE_LIMIT` | `30`                                     | Per-minute provider budget         |
| `FF_SYNC_INTERVAL`  | `120`                                        | Per-player sync cooldown (seconds) |

What the provider fetches:

- `GET /api/v1/account?region=&uid=` → profile (nickname, level) + rank (tier + ranking points). Rank numbers are mapped to Free Fire tier names (Bronze III → Grandmaster III).
- `GET /api/v1/playerstats?region=&uid=` → lifetime BR stats aggregated across solo/duo/quad (matches, wins, kills, deaths, top-10s, headshots, highest kills).
- Match history is not exposed by this API — `getMatchHistory` returns an empty list, so per-match feed activity and `freeFireMatch` rows stay empty with this provider.

Regions supported: `IND, BR, SG, RU, ID, TW, US, VN, TH, ME, PK, CIS, BD`. Any other region is normalized to `IND`.

Failure handling: non-2xx responses and network errors are converted to `AppError(502)` (`PROVIDER_ERROR` / `PROVIDER_UNREACHABLE`) so the API contract stays clean. Unresolvable UIDs produce `PLAYER_NOT_FOUND` (404).

### Swapping to another provider

The abstraction makes this a drop-in change:

1. Copy `external.ts` to `your-provider.ts` and implement the four methods against your source (a paid stats service, a scraping pipeline, an in-house data store, etc.).
2. Wire it up in `index.ts` alongside the `mock`/`external` selection, or swap `ExternalFreeFireProvider` for your class.
3. Keep secrets (API keys, tokens) in `.env` via `server/src/config/env.ts`. Never hardcode credentials.
4. Respect the provider rate limit (`FF_PROVIDER_RATE_LIMIT`) and the per-player sync cooldown (`FF_SYNC_INTERVAL`).

## Sync lifecycle

- `syncPlayer(playerId, triggeredBy)` — one player. Triggered by the member ("Sync now"), an admin (`POST /freefire/sync/player/:id`), or `POST /freefire/sync/all`.
- `syncAll(triggeredBy)` — every profile with an `ffUid` in one pass.
- Local dev: the scheduler (`server/src/jobs/scheduler.ts`) runs background jobs on timers; each player respects `FF_SYNC_INTERVAL` so nobody is hammered repeatedly.
- Vercel (serverless): timers do not exist. The same jobs run daily via Vercel Cron hitting `POST /api/cron/jobs` with `Authorization: Bearer $CRON_SECRET` (see `vercel.json`). Individual members can still hit "Sync now" anytime; admins can run `POST /freefire/sync/all`.
- Every sync creates a `SyncLog` row. Admins can inspect the last 50 via `GET /freefire/logs`.
- On success, stats are upserted into `freeFireStats`, matches into `freeFireMatch` (deduped by `externalId`), and guild activity + XP rules fire.

## Security notes

- Only the player's `uid` + region + public stats are stored. Credentials, tokens, and cookies are never persisted.
- `ffUid` is validated by length (max 20) in the player profile update schema.
- Sync endpoints are behind `syncLimiter` and the mutating-request CSRF/origin checks that apply to all non-GET routes.

## Switching to a live provider in production

1. Set `FF_PROVIDER=external`.
2. Set `FF_API_BASE_URL` (defaults to the community API).
3. Verify the boot log shows the live provider.
4. Run one manual sync per member and confirm `GET /freefire/logs` and the leaderboard values update.
5. Leave `FF_PROVIDER=mock` on any staging/preview environment that must not hit the external API.

## Known limitations

- The community API is unofficial, free-tier-hosted, and can be slow or briefly unavailable. Sync failures surface as friendly 502s on the member-facing side and are logged.
- Weekly/monthly deltas come back as zero with this provider (no per-window data), so challenge/XP deltas only accumulate from lifetime totals on first sync after a previous sync.
- Match history is unavailable (see above); the activity feed reflects ranks, events, and posts instead of per-match wins.