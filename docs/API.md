# API Reference

Base URL: `http://localhost:5000/api` (dev) — all routes are prefixed with `/api`.

## Conventions

- Success: `{ data: ... }` — failure: `{ error: { code, message, details? } }` (HTTP 4xx/5xx).
- Auth: JWT access token in the `ko_access` httpOnly cookie (15m). Rotating refresh in `ko_refresh` (14d).
- Every mutating request (POST/PATCH/DELETE) must send `x-csrf-protection: 1` and pass origin checks.
- List endpoints return a paginated envelope: `{ items, total, page, pageSize, totalPages }`.
- Validation failures return 422 with field `details`.
- Server never leaks stack traces or DB errors.

## Auth — `/auth`

| Method | Path                    | Auth  | Body / Query                                     | Notes                                |
| ------ | ----------------------- | ----- | ------------------------------------------------ | ------------------------------------ |
| POST   | `/auth/register`        | —     | username, email, password, displayName           | Sets token cookies, 201              |
| POST   | `/auth/login`           | —     | identifier, password                             | Sets token cookies                   |
| POST   | `/auth/refresh`         | —     | refreshToken (or cookie)                         | Rotates refresh token                |
| POST   | `/auth/logout`          | —     | —                                                | Revokes + clears cookies             |
| POST   | `/auth/forgot-password` | —     | email                                            | Rate limited; token via email/console |
| POST   | `/auth/reset-password`  | —     | token, password                                  | 1h expiry, hashed                    |
| GET    | `/auth/me`              | ✔     | —                                                | Current user + membership            |
| POST   | `/auth/guild/join-request` | ✔  | message?                                         | Requests to join the guild, 201      |

## Public — `/public`

| Method | Path              | Notes                       |
| ------ | ----------------- | --------------------------- |
| GET    | `/public/landing` | Guild stats for the landing page |

## Health

`GET /api/health` — always public, returns 200 when the API is up.

## Guild — `/guild`

| Method | Path              | Permission       | Notes                         |
| ------ | ----------------- | ---------------- | ----------------------------- |
| GET    | `/guild/overview` | ✔                | Levels, counts, season       |
| GET    | `/guild/dashboard`| ✔                | Personal dashboard payload   |
| GET    | `/guild/activity` | ✔                | Paginated activity feed      |
| PATCH  | `/guild/settings` | `settings.manage`| name, tag, region, description, motto |

## Players — `/players`

| Method | Path                    | Notes                                         |
| ------ | ----------------------- | --------------------------------------------- |
| GET    | `/players`              | Paginated roster; filters: role, rank, search |
| GET    | `/players/me`           | Full self detail (same shape as `/:userId`)   |
| GET    | `/players/me/matches`   | Paginated match history for self              |
| PATCH  | `/players/me`           | displayName, ffUid, ffNickname, region, playerRole, rank, rankPoints |
| GET    | `/players/:userId`      | Full player detail + achievements + activity  |

## Leaderboards — `/leaderboards`

| Method | Path                     | Notes                                                       |
| ------ | ------------------------ | ----------------------------------------------------------- |
| GET    | `/leaderboards`          | Query: category (KILLS, WINS, KD, XP, HEADSHOTS, MATCHES, MVPS, WEEKLY, MONTHLY, ACTIVE, IMPROVED, OVERALL), seasonId?, limit?, page? |

Each row: `{ userId, displayName, username, avatarUrl, guildRole, guildXp, seasonXp, rank, rankPoints, playerRole, level, stats, weeklyScore, monthlyScore, activeScore, improvedScore, value, position, movement }`. The season object includes `remainingDays`.

## Events — `/events`

| Method | Path             | Permission      | Notes                               |
| ------ | ---------------- | --------------- | ----------------------------------- |
| GET    | `/events`        | ✔               | Filters: status, upcoming, paginated|
| GET    | `/events/:id`    | ✔               | Participants + join state           |
| POST   | `/events`        | `events.create` | title, description, type, startsAt, endsAt, maxParticipants?, mode?, location? |
| PATCH  | `/events/:id`    | `events.manage` | Partial update + status             |
| DELETE | `/events/:id`    | `events.manage` | —                                   |
| POST   | `/events/:id/join`  | ✔            | —                                   |
| POST   | `/events/:id/leave` | ✔            | —                                   |

## Teams — `/teams`

| Method | Path                    | Permission    | Notes                        |
| ------ | ----------------------- | ------------- | ---------------------------- |
| GET    | `/teams`                | ✔             | All teams with records       |
| GET    | `/teams/:id`            | ✔             | Members, tournament slots    |
| POST   | `/teams`                | `teams.manage`| name, tag?, description?     |
| PATCH  | `/teams/:id`            | `teams.manage`| Partial update               |
| DELETE | `/teams/:id`            | `teams.manage`| —                            |
| POST   | `/teams/:id/members`    | `teams.manage`| userId, role? (default PLAYER) |
| DELETE | `/teams/:id/members/:userId` | `teams.manage` | —                        |
| POST   | `/teams/:id/captain`    | `teams.manage`| userId                       |

## Tournaments — `/tournaments`

| Method | Path                          | Permission             | Notes                         |
| ------ | ----------------------------- | ---------------------- | ----------------------------- |
| GET    | `/tournaments`                | ✔                      | Filter: status                |
| GET    | `/tournaments/:id`            | ✔                      | Bracket, teams, matches       |
| POST   | `/tournaments`                | `tournaments.manage`   | name, size (2–16), startsAt, endsAt?, description?, prize? |
| POST   | `/tournaments/:id/register`   | `tournaments.manage`   | teamId                        |
| POST   | `/tournaments/:id/unregister` | `tournaments.manage`   | teamId                        |
| POST   | `/tournaments/:id/start`      | `tournaments.manage`   | Generates bracket             |
| POST   | `/tournaments/:id/cancel`     | `tournaments.manage`   | —                             |
| POST   | `/tournaments/matches/:matchId/result` | `tournaments.manage` | scoreA, scoreB, mvpId? |

## Squad — `/squad`

| Method | Path                | Notes                                               |
| ------ | ------------------- | --------------------------------------------------- |
| GET    | `/squad`            | Paginated; status defaults to OPEN; filters: status, role |
| POST   | `/squad`            | role, rank, mic, playersNeeded (1–3), note?; 6h expiry |
| POST   | `/squad/:id/join`   | Auto-closes when full; XP reward                    |
| POST   | `/squad/:id/leave`  | Reopens if it was full                              |
| POST   | `/squad/:id/close`  | Author only                                         |

## Challenges — `/challenges`

| Method | Path                | Permission          | Notes                              |
| ------ | ------------------- | ------------------- | ---------------------------------- |
| GET    | `/challenges`       | ✔                   | Filter: status; includes my progress |
| POST   | `/challenges`       | `challenges.manage` | title, description, metric, goal, rewardXp, startsAt, endsAt |
| PATCH  | `/challenges/:id`   | `challenges.manage` | Partial update                     |
| POST   | `/challenges/:id/cancel` | `challenges.manage` | —                             |

Metrics: KILLS, WINS, HEADSHOTS, MATCHES, RANKED_MATCHES, CUSTOM_ROOMS, MVPS.

## Achievements — `/achievements`

| Method | Path              | Permission            | Notes                       |
| ------ | ----------------- | --------------------- | --------------------------- |
| GET    | `/achievements`   | ✔                     | All + my unlock state       |
| POST   | `/achievements`   | `achievements.manage` | Define a new achievement    |

## Community — `/posts` (mounted at `/community`)

| Method | Path                          | Notes                              |
| ------ | ----------------------------- | ---------------------------------- |
| GET    | `/community/posts`            | Paginated; filters: authorId, type |
| GET    | `/community/posts/:id`        | Single post                        |
| GET    | `/community/posts/:id/comments` | Comment thread                   |
| GET    | `/community/posts/:id/reactions` | Reaction summary                 |
| POST   | `/community/posts`            | type, content (max 1000), referenceId? |
| DELETE | `/community/posts/:id`        | Author or moderator                |
| PATCH  | `/community/posts/:id/moderation` | MODERATE — hide/unhide         |
| POST   | `/community/posts/:id/comments` | content (max 500)                |
| DELETE | `/community/comments/:id`     | Author or moderator                |
| POST   | `/community/posts/:id/reactions` | type (enum) — toggles           |

## Notifications — `/notifications`

| Method | Path                       | Notes                            |
| ------ | -------------------------- | -------------------------------- |
| GET    | `/notifications`           | Paginated + unread count         |
| GET    | `/notifications/unread-count` | `{ count }`                    |
| PATCH  | `/notifications/:id/read`  | Mark one read                    |
| POST   | `/notifications/read-all`  | Mark all read                    |

## Search — `/search`

| Method | Path          | Notes                       |
| ------ | ------------- | --------------------------- |
| GET    | `/search`     | `q` (min 2 chars); members, teams, events, posts, challenges |

## Announcements — `/announcements`

| Method | Path                 | Permission              | Notes                      |
| ------ | -------------------- | ----------------------- | -------------------------- |
| GET    | `/announcements`     | ✔                       | Paginated; filter includeExpired |
| POST   | `/announcements`     | `announcements.create`  | title, content, priority, pinned, expiresAt?, publish |
| PATCH  | `/announcements/:id` | `announcements.manage`  | Partial update             |
| DELETE | `/announcements/:id` | `announcements.manage`  | —                          |

## Free Fire — `/freefire`

| Method | Path                       | Permission      | Notes                                |
| ------ | -------------------------- | --------------- | ------------------------------------ |
| GET    | `/freefire/status`         | ✔               | Provider info + my last sync         |
| POST   | `/freefire/sync/me`        | ✔ (rate limited)| Manual sync for self                 |
| POST   | `/freefire/sync/player/:playerId` | `sync.run` | Admin sync one player          |
| POST   | `/freefire/sync/all`       | `sync.run`      | Admin sync every linked player       |
| GET    | `/freefire/logs`           | `sync.run`      | Last 50 sync logs                    |
| GET    | `/freefire/players`        | `sync.run`      | All linked players + sync state      |

## Admin — `/admin`

| Method | Path                                 | Permission      | Notes                             |
| ------ | ------------------------------------ | --------------- | --------------------------------- |
| GET    | `/admin/stats`                       | `members.view`  | Counts + recent activity          |
| GET    | `/admin/members`                     | `members.view`  | Paginated; search, guildRole      |
| GET    | `/admin/members/:userId/activity`    | `members.view`  | Activity summary (days, default 30) |
| PATCH  | `/admin/members/:userId/role`        | `roles.manage`  | SUPER_ADMIN/GUILD_ADMIN/MODERATOR/MEMBER; cannot demote self |
| PATCH  | `/admin/members/:membershipId/guild-role` | `members.manage` | LEADER/OFFICER/MEMBER/TRIAL   |
| DELETE | `/admin/members/:userId`             | `members.manage`| Remove member                     |
| GET    | `/admin/join-requests`               | `members.view`  | Pending join requests             |
| POST   | `/admin/join-requests/:id/approve`   | `members.manage`| —                                 |
| POST   | `/admin/join-requests/:id/reject`    | `members.manage`| —                                 |
| GET    | `/admin/roles`                       | `roles.manage`  | Guild roles + permissions         |
| POST   | `/admin/roles`                       | `roles.manage`  | Create role from ROLE_PERMISSIONS |
| GET    | `/admin/moderation`                  | `moderate`      | Published + hidden posts          |
| PATCH  | `/admin/moderation/posts/:id`        | `moderate`      | hide: true/false                  |
| POST   | `/admin/xp`                          | `xp.adjust`     | userId, amount, reason            |
| GET    | `/admin/seasons`                     | `members.view`  | History + active season           |
| GET    | `/admin/seasons/:id/stats`           | `members.view`  | Season snapshot stats             |
| POST   | `/admin/seasons/:id/end`             | `settings.manage`| Ends season + captures records   |
| POST   | `/admin/snapshots`                   | `members.view`  | Capture leaderboard snapshots now |

## Uploads — `/uploads`

| Method | Path             | Notes                                      |
| ------ | ---------------- | ------------------------------------------ |
| POST   | `/uploads/avatar`| multipart `avatar` field; images only; returns URL |

Served statically at `/uploads/**` (dev proxy: `localhost:5173/uploads/**` → `:5000`).

## CSRF + security notes

- Roles are never read from the client; permissions resolve server-side from `ROLE_PERMISSIONS`.
- Rate limits: global (120/min default), `authLimiter` on login/register/password routes, `syncLimiter` on sync routes.
- List endpoints validate `pageSize` (max 100) via zod before hitting the DB.