# Let's Play Futsal — Build Plan

A weekly futsal manager for a student community. Public site shows players, sessions, and a
semester leaderboard; a single admin (predefined credentials in env vars) manages everything.

**How to use this document:** it is written to be executed phase by phase by implementation
workers. Each phase lists its tasks and acceptance criteria. Do not start a phase before the
previous one's acceptance criteria pass. Keep the scope exactly as written — no extra features.

---

## 1. Product summary

- The community rents a futsal court weekly. ~10–20 registered players; each week a subset shows up.
- Admin marks who showed up, hits **Shuffle** → attendees are split into random teams of ~5.
- The app then **runs the game day**: it algorithmically proposes which two teams play next
  (so every team gets a fair, near-equal number of matches), the admin taps **Start**, and a
  **live match screen** (operated from an iPad in the browser) logs goals and assists with
  taps as they happen. End the match → the app immediately proposes the next pairing →
  repeat until the admin completes the session.
- Everything rolls up into a **season (semester) leaderboard**: goals, assists, wins, games played.
- End of semester: awards page — Top Scorer / Top Assists / Most Wins are computed; **MVP is
  hand-picked by the admin**.
- Public read-only for everyone; one admin account, password from env. No user registration.
  (Player consent is collected out-of-band via Google Form; the app just stores names the admin enters.)

## 2. Stack (decided — do not change)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router, TypeScript)** via `create-next-app` | One deployable unit for UI + API, best-documented path for workers |
| Styling/UI | **Tailwind CSS + Mantine** (functional components) **+ React Bits** (visual flourish) | Mantine ships Table/Modal/Tabs/Notifications/DatePicker/Form as real components — least code for an admin-heavy app; React Bits supplies the "cool" animated bits (hero text, backgrounds, transitions) for the public pages. See §2a. |
| ORM | **Prisma** | Type-safe, best-in-class DX and migration tooling, first-class Postgres support |
| Database | **Postgres**, self-hosted as a container | Runs as its own service in the same `docker-compose.yml` Coolify deploys — persists via a named volume, zero external accounts |
| Auth | **Custom minimal**: `ADMIN_PASSWORD` env var → signed JWT cookie via `jose` | The user explicitly wants trivial env-based auth, no auth library |
| Validation | **zod** on all mutation inputs | |
| Hosting | **Coolify** (self-hosted PaaS), deployed from `docker-compose.yml` | Coolify already terminates TLS/routing via its own Traefik instance and handles the git-push → build → deploy loop; the compose file just needs an `app` service and a `db` service |

Same Prisma schema, same Postgres engine, in every environment. Locally, run only the `db`
service from `docker-compose.yml` (`docker compose up -d db`) and run the Next.js app with
`npm run dev` for hot reload — `DATABASE_URL` in `.env.local` points at `localhost`. In
production, Coolify builds and runs the whole compose file (`app` + `db`) on its host network;
`DATABASE_URL` there points at the `db` service's compose hostname, set as an env var in the
Coolify UI (not committed). See §8a and Phase 8 for the compose file itself.

### Environment variables

```
DATABASE_URL=            # postgresql://user:pass@localhost:5432/futsal locally;
                          # postgresql://user:pass@db:5432/futsal in prod (compose service name)
POSTGRES_USER=            # only needed to configure the db container itself
POSTGRES_PASSWORD=
POSTGRES_DB=
ADMIN_PASSWORD=          # the one admin password
SESSION_SECRET=          # 32+ random chars, signs the JWT cookie
```

### 2a. UI approach: Mantine + React Bits

- **Mantine** (`@mantine/core`, `@mantine/hooks`, `@mantine/notifications`, `@mantine/dates`,
  `@mantine/form`) is the workhorse for every functional surface: forms, tables, modals,
  tabs, checkboxes, the admin dashboard, the live match console. Wrap the root layout in
  `MantineProvider` with a custom theme: primary color matched to the app's identity, and
  the five team colors (§6) registered as Mantine theme colors so `Badge`/`Card` accents
  can reference them by name.
- **React Bits** components (copied in, like shadcn — not an npm dependency) are used
  *sparingly* for visual flourish on public/marketing-feel surfaces only: an animated
  headline or background on `/` (landing/leaderboard hero) and a celebratory effect on
  `/awards`. **Do not** use React Bits animated effects on the admin live match console —
  that screen is tap-and-respond, so it stays plain Mantine for maximum snappiness.
- Respect `prefers-reduced-motion` for every React Bits effect; keep any canvas/WebGL
  pieces off the critical path (lazy-load them, no layout shift, no impact on Lighthouse
  mobile score for the pages that matter — session/live/leaderboard).
- Design goal: intuitive and a little bit fun on the public pages (this is for a student
  community, it should feel alive), fully solid and thumb-friendly on mobile, and the
  admin console prioritizes speed/clarity over aesthetics.

Provide `.env.example` with all six keys. Never commit `.env` or `.env.local`.

## 3. Domain model

All IDs are integer autoincrement. Timestamps use Postgres `timestamptz`.

```
season      id, name ("Odd Semester 2026"), starts_on, ends_on, is_active (bool)
player      id, name (unique), is_active (bool), created_at
session     id, season_id → season, date, notes?, status: 'draft' | 'teams_set' | 'completed'
attendance  session_id → session, player_id → player          (PK: composite)
team        id, session_id → session, name ("Red"/"Blue"/"Green"), color (hex)
team_player team_id → team, player_id → player                (PK: composite)
match       id, session_id → session, seq (int, order within the day),
            home_team_id → team, away_team_id → team,
            status: 'in_progress' | 'finished', started_at, ended_at?
goal_event  id, match_id → match, seq (int, order within the match),
            team_id → team (the team the goal COUNTS FOR),
            scorer_id → player (nullable — null means own goal / unattributed),
            assist_id → player (nullable), created_at
award       id, season_id → season, type: 'mvp', player_id → player   (UNIQUE season_id+type)
```

Rules and derivations:
- **Goals are events, not aggregates.** The live screen appends `goal_event` rows; a match's
  score is `COUNT` of its events per team, and a player's goals/assists are counts over their
  events. This makes "undo last goal" a simple row delete and keeps score/stats impossible to
  disagree with each other. There is no stored score and no `stat` table.
- Own goals: an event whose `team_id` is the benefiting team and `scorer_id` is NULL.
  An event's `scorer_id`/`assist_id`, when set, must belong to `team_id`'s roster (validate).
- **Win/draw/loss is derived** from event counts + team membership — never stored per player.
- A player's *games played* for the season = number of completed sessions they attended.
- Leaderboard aggregates (per season): goals, assists, wins, draws, losses, games played,
  win rate. Computed with SQL queries at request time — no caching, no denormalized counters.
  At this scale (≤20 players, ≤20 sessions) it is trivially fast.
- Only players marked attending can be placed on teams; only rostered players can appear on events.
- At most one match per session may be `in_progress` at a time (enforce in the start action).
- Deleting a player is not allowed once they have any attendance; deactivate instead
  (`is_active = false` hides them from the check-in list but keeps history).

## 4. Auth design

- `POST /login`: compare submitted password to `ADMIN_PASSWORD` (constant-time compare).
  On success, set an HTTP-only, `Secure`, `SameSite=Lax` cookie containing a `jose`-signed JWT
  (`{ role: 'admin' }`, 30-day expiry) signed with `SESSION_SECRET`.
- Next.js `middleware.ts` guards every route under `/admin/*` → redirect to `/login` if the
  cookie is missing/invalid.
- **Every server action / mutation route must independently verify the cookie** — middleware
  alone is not sufficient protection for mutations.
- Logout button clears the cookie.
- No rate limiting, no user table, no password reset — deliberately out of scope.

## 5. Routes & pages

### Public (read-only, no auth)

| Route | Content |
|---|---|
| `/` | Season leaderboard (default sort: goals). Tabs/sort for assists, wins, win rate. Season switcher if >1 season. |
| `/players/[id]` | Player profile: season + all-time totals, per-session history (attended, team, goals/assists that day). |
| `/sessions` | List of sessions in the active season, newest first, with date + attendee count + status. |
| `/sessions/[id]` | Session detail: teams with rosters (team colors), match results, per-match scorers/assisters. |
| `/awards` | Per season: Top Scorer, Top Assists, Most Wins (computed, show top 3 each) + MVP if the admin has picked one. |

### Admin (guarded)

| Route | Content |
|---|---|
| `/login` | Password-only form. |
| `/admin` | Dashboard: active season, next/latest session shortcut, quick links. |
| `/admin/players` | Player CRUD: add (name), rename, toggle active. |
| `/admin/seasons` | Create season, set active season, edit dates, pick MVP when closing a season. |
| `/admin/sessions` | Create session (date within active season), list, delete **draft** sessions only. |
| `/admin/sessions/[id]` | **The core screen** — the game-day flow (see §6). |
| `/admin/sessions/[id]/live` | Live match console for the in-progress match (iPad-first, see §6). |

Mutations are Next.js **server actions** colocated with the admin pages (no separate REST API
needed except `/login`). Every action revalidates the affected public pages.

## 6. Game-day flow (admin session screen)

The session screen walks through three stages matching `session.status`:

**Stage 1 — Check-in (`draft`)**
- Checklist of all active players; admin ticks who showed up. Live count shown.
- Team-size selector (default **5**) and computed team count preview
  (e.g. "15 attending → 3 teams of 5", "13 attending → 2×5 + 1×4" — remainder spreads across
  teams so sizes differ by at most 1; minimum 2 teams).
- **Shuffle** button: Fisher–Yates shuffle of attendees, chunk into teams, assign fixed
  name/color pairs in order (Red `#ef4444`, Blue `#3b82f6`, Green `#22c55e`, Yellow `#eab308`,
  Purple `#a855f7`). Result shown immediately; **Re-shuffle** replaces it; **Lock teams**
  advances status to `teams_set` and deletes nothing afterward.
- Editing attendance after lock requires unlocking (allowed only if no matches recorded yet).
- Manual drag/swap between teams after shuffle: **out of scope v1** — reshuffle instead.

**Stage 2 — Live play (`teams_set`)** — designed for an iPad in the browser at courtside.
- The screen shows the day's matches so far (scores, tap to view/fix events) and a
  **"Next match: Red vs Green"** card computed by the matchmaker (§7), with per-team
  played-counts visible so the fairness is legible. Buttons: **Start this match** (creates the
  `in_progress` match and opens the live screen) and **Pick different teams** (manual override —
  two team selects — for when reality disagrees with the algorithm).
- **Live match screen** (`/admin/sessions/[id]/live` — routes to the in-progress match):
  - Big scoreboard on top: `RED 3 — 2 GREEN` (derived from events), team colors everywhere.
  - Below, the two rosters side by side as **large tap targets** (min ~64px, thumb-friendly).
  - Tap a player → +1 goal for their team → an inline "Assist?" strip appears with that
    player's teammates + a "No assist" button (auto-dismisses to "no assist" on next action).
  - Per-team **"Own goal / unknown scorer +1"** button (creates a scorer-less event).
  - **Undo** button reverting the latest event; a scrollable event feed ("3. Fikri ⚽ (Raka 🅰)")
    where any event can be deleted, for fixing mistakes older than the last one.
  - **End match** → confirm dialog with final score → match becomes `finished`, back to the
    session screen, which already shows the next proposed pairing. This loop continues until:
- **Complete session** button (blocked while a match is `in_progress`) → status `completed`.
  A "Reopen" button back to `teams_set` is allowed for fixing mistakes.
- No match timer in v1 — the group plays by its own clock; the app only records what happened.

**Stage 3 — Done (`completed`)** — read-only summary, same content as the public session page.

### iPad/live-screen implementation notes
- The live screen is the one place where snappy feedback matters. Use server actions with
  `useOptimistic` (tap registers instantly, syncs in background); refresh event feed via
  router revalidation. **No websockets** — a single admin device is operating it.
- Buttons must be `touch-action: manipulation` (no 300ms delay / double-tap zoom), and the
  page sets `viewport` correctly; test in landscape and portrait.
- Guard against accidental double-taps: disable a tapped player button ~600ms after firing.

## 7. Matchmaker — who plays next

Pure function in `src/lib/matchmaker.ts`, unit-tested:

```
proposeNext(teams: TeamId[], playedMatches: {home: TeamId, away: TeamId}[]) => [TeamId, TeamId]
```

Selection rule, applied to the session's teams:
1. Sort teams by **matches played ascending** (primary — fairness), then by
   **longest time since last match** (`seq` of their last match, ascending; never-played first),
   then random.
2. Take the top two as the proposed pairing.
3. **Rematch avoidance:** if the top two also played each other in the immediately previous
   match and a swap with the 3rd-ranked team keeps the max played-count difference ≤ 1,
   swap it in. Otherwise allow the rematch (with 2 teams it's always a rematch — fine).

With the typical 3 teams this produces the natural rotation A-B, C-A, C-B, then repeats fairly
regardless of results (it is intentionally **not** "winner stays" — fairness of playtime beats
rewarding streaks; note this in the README). Works for any team count ≥ 2. The proposal is
computed on the fly from existing match rows — nothing stored.

Unit tests to include: 3 teams over 6 matches → each plays 4 with counts never differing by
more than 1; 2 teams → always the same pairing; 4 teams → no immediate rematch when avoidable;
manual-override matches are absorbed into the counts and fairness recovers.

## 8. Leaderboard queries (reference)

Per season, one aggregate per player (write as Prisma `groupBy`/aggregate queries, or raw SQL
via `prisma.$queryRaw` where a single query is clearer than several):
- goals: `COUNT` of `goal_event` rows where `scorer_id = player`, joined through
  `match → session` filtered by season (and `match.status = 'finished'`); assists likewise
  via `assist_id`.
- wins/draws/losses: score each finished match by counting its events per team; players of
  the winning team (via `team_player`) get a win, etc. Draws count for both teams.
- games played: `COUNT` of attendance rows on `completed` sessions in the season.
- win rate = wins / matches played (matches, not sessions), shown as % with 0 guard.

## 8a. Docker / Coolify deployment shape

Two files at the repo root drive deployment; write them in Phase 0 so local dev and prod never
diverge, then leave them alone until Phase 8 actually deploys.

**`Dockerfile`** — multi-stage, targeting Next.js `output: 'standalone'` (set that in
`next.config.ts`):
1. `deps` stage: install with `npm ci`.
2. `builder` stage: copy source, run `npx prisma generate`, then `npm run build`.
3. `runner` stage: minimal `node:20-alpine`, copy the standalone server + `public` + `.next/static`,
   copy the generated Prisma client/engine, run migrations then start the server via a small
   entrypoint script: `npx prisma migrate deploy && node server.js`. This is what makes "the db
   immediately spawns [with the right schema]" true on every deploy — no manual migration step.

**`docker-compose.yml`** — two services:
- `db`: `postgres:16-alpine`, env from `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`,
  a named volume (`pgdata:/var/lib/postgresql/data`) so data survives redeploys, a healthcheck
  (`pg_isready`).
- `app`: `build: .`, `depends_on: db: condition: service_healthy`, `env_file: .env` (Coolify
  injects the real values at deploy time; locally you'd only ever run this service inside
  Coolify, not on your laptop), restart `unless-stopped`.
- Do **not** hardcode Traefik labels — Coolify manages its own reverse proxy/TLS for
  docker-compose resources via its UI (domain assignment, generated FQDN env vars). Consult
  whatever Coolify version is deployed for the exact convention when wiring the app service in
  Phase 8; the compose file otherwise needs nothing proxy-related.
- For plain local development (fast iteration, hot reload), don't run the `app` service at all:
  `docker compose up -d db` for just Postgres, then `npm run dev` on the host talking to
  `localhost:5432`. The `app` service in compose exists for Coolify/prod parity, not laptop use.

## 9. Phased execution plan

### Phase 0 — Scaffold
1. `npx create-next-app@latest` (TypeScript, Tailwind, App Router, ESLint, `src/` dir, alias `@/*`).
2. Install Mantine (`@mantine/core @mantine/hooks @mantine/notifications @mantine/dates
   @mantine/form`) + `dayjs` (Mantine dates peer dep); wrap root layout in `MantineProvider`
   with a custom theme per §2a. Copy in the two or three React Bits pieces identified in §2a
   (hero effect, awards celebration) as local components — don't wire them into real pages yet.
3. Add `prisma`, `@prisma/client`, `zod`, `jose`. `npx prisma init` → `prisma/schema.prisma`,
   `.env.example` with all six keys from §2. Write `Dockerfile` and `docker-compose.yml` per
   §8a now (even though nothing deploys yet) — this is what Phase 8 will just point at Coolify.
   Replace the placeholder README with a real one (what the app is, local dev steps
   incl. `docker compose up -d db`, env vars, deploy notes).
- ✅ *Accept:* `docker compose up -d db` starts Postgres locally; `npm run dev` renders a
  Mantine-styled page against it; `npm run build` passes; `docker build .` succeeds.

### Phase 1 — Schema & seed
1. `prisma/schema.prisma` with all models from §3, relations and unique constraints included.
2. `npx prisma migrate dev --name init` against the local `db` container; commit the generated
   migration under `prisma/migrations`.
3. `prisma/seed.ts` (wired to `npm run db:seed` via the `prisma.seed` config): one active
   season, 16 fake players, 2 completed example sessions with teams, finished matches, and
   goal events (including one own goal and some no-assist goals) — enough to develop the
   public pages against realistic data.
- ✅ *Accept:* migrate + seed run cleanly against the local Postgres container; data visible
  via `npx prisma studio`.

### Phase 2 — Auth
1. `/login` page + login server action per §4; `src/lib/auth.ts` with `createSession()`,
   `verifySession()`, `requireAdmin()` (throws/redirects).
2. `middleware.ts` guarding `/admin/*`. Logout action.
- ✅ *Accept:* wrong password rejected; right password reaches `/admin` (placeholder page);
  direct visit to `/admin/*` without cookie redirects to `/login`; every later server action
  starts with `requireAdmin()`.

### Phase 3 — Players & seasons (admin)
1. `/admin/players`: list, add, rename, toggle active (server actions + zod).
2. `/admin/seasons`: create, edit, set active (exactly one active at a time — setting one
   active clears the others in the same transaction).
- ✅ *Accept:* CRUD works with validation errors surfaced as toasts; duplicate player name rejected.

### Phase 4 — Session flow: check-in & shuffle
1. `/admin/sessions` list + create (date picker, defaults to next occurrence of the usual weekday).
2. `/admin/sessions/[id]` Stage 1 per §6, including `src/lib/shuffle.ts`
   (pure function: `(playerIds: number[], teamSize: number) => number[][]`) with unit tests
   covering 15→[5,5,5], 13→[5,4,4], 7→[4,3], and n < 2×2 rejected.
3. Lock/unlock transitions with the guards from §6.
- ✅ *Accept:* shuffle tests pass (`npm test`, use vitest); full check-in → shuffle → lock
  flow works in the browser; unlock blocked once a match exists.

### Phase 5 — Matchmaker & live match console
1. `src/lib/matchmaker.ts` per §7 with the listed unit tests.
2. Stage 2 session screen per §6: proposed-next-match card with played counts, start action
   (creates `in_progress` match; rejects if one already is), manual team-pick override.
3. Live match screen per §6: tap-to-score with assist follow-up, own-goal button, undo,
   event feed with per-event delete, end-match confirm. Server actions validate rosters and
   `requireAdmin()`; `useOptimistic` for instant feedback; double-tap guard.
4. Complete/reopen session transitions (complete blocked while a match is in progress).
- ✅ *Accept:* matchmaker tests pass; simulate a full game day on an iPad-sized viewport
  (1024×768 and portrait): check in → shuffle → lock → play 4+ matches via proposals →
  scores/stats correct → complete; undo removes the right event; refresh mid-match loses nothing.

### Phase 6 — Public site
1. `/` leaderboard with season switcher and sort tabs, per §8.
2. `/players/[id]`, `/sessions`, `/sessions/[id]`, `/awards` per §5.
3. Mobile-first layout (players will open this on phones); navbar with the community name.
- ✅ *Accept:* with seed data, all pages render correct numbers (hand-check one player's
  totals against the seed); pages usable at 375px width; no auth leaks (no admin links/actions
  visible logged out).

### Phase 7 — Awards & polish
1. MVP picker on `/admin/seasons` (writes `award` row); `/awards` shows computed top-3s + MVP.
2. Empty states everywhere (no season, no sessions, no stats yet).
3. Basic metadata (title, description, favicon/emoji ⚽).
- ✅ *Accept:* awards correct against seed data; blank-database walkthrough (fresh db →
  create season → players → session → completed match) hits no crashes or dead ends.

### Phase 8 — Deploy (Coolify)
1. Push the repo to whatever git remote Coolify is connected to. In Coolify, create a new
   resource from `docker-compose.yml` (not a generic Node/Nixpacks app — the compose file
   already defines both services).
2. In the Coolify UI, set the six env vars from §2 (`DATABASE_URL` using the compose service
   hostname `db`, `POSTGRES_*` for the db container, `ADMIN_PASSWORD`, `SESSION_SECRET`) and
   assign the domain/FQDN to the `app` service per §8a.
3. Deploy. Coolify builds the `Dockerfile`, starts `db`, waits for its healthcheck, starts
   `app` (which runs `prisma migrate deploy` on boot — schema is applied automatically, no
   manual migration step).
4. Smoke test in production: login, create a session, run through check-in → shuffle →
   a couple of live matches → complete, from an actual phone/iPad on the real domain.
5. Confirm the named volume persists data across a redeploy (redeploy once, verify seeded/
   entered data is still there).
6. Document the weekly routine in the README (5 lines: open session → check in → shuffle →
   start proposed matches & tap goals live on the iPad → complete).
- ✅ *Accept:* production URL works end-to-end over HTTPS; leaderboard visible logged-out;
  a redeploy does not lose data.

## 10. Explicitly out of scope (v1)

- Player self-service accounts, sign-ups, or RSVPs in-app (Google Form handles consent/RSVP).
- Skill-based/balanced team shuffling (pure random only), drag-and-drop team editing.
- Match timer/clock, "winner stays" mode, spectator real-time score updates (public pages
  show finished matches only; websockets not needed for a single admin device).
- Photos/avatars, payments/fees tracking, notifications, i18n.
- Multiple admins, roles, audit logs, rate limiting.

---

## 11. Post-v1 additions

Two features added after the v1 walkthrough. Everything below stays inside the original
"derive it, don't store it" rule from §3 — with two deliberate exceptions, noted as such.

### 11a. Match MVP and extended stats

- **Man of the match** is picked by the admin on the way out of a match: the "End match?"
  confirmation on the live console lists both rosters as chips, one tap selects, tapping
  again clears, and skipping is fine. `match.mvp_player_id` (nullable FK to player) stores
  it. It can be set or cleared afterwards from the session page's match list.
  This *is* stored state — a human decision, not something goal events can reconstruct.
- **Season MVP** is now derived from the overall rating (§11c). The existing `award` row still
  exists and, when set, overrides the derived winner — the `/admin/seasons` picker is
  relabelled "MVP override".
- **Extended stats**, all derived from the same goal events plus the MVP column, live in
  `src/lib/stats.ts` and are shared by the leaderboard and the player profile so the two
  can't disagree: G+A, per-match rates (G/M, A/M, G+A/M, PTS/M), points (3/1/0), last-5
  form guide, clean sheets, plus/minus, braces, hat-tricks, MVP count and MVP rate.
- Vocabulary: **matchday** = a session attended (`gamesPlayed`); **match** = one game within
  it (`matchesPlayed`). Per-match rates divide by the latter.

### 11b. Goalkeepers in the shuffle

- `player.keeper_pref` is one of `outfield` / `flexible` / `goalkeeper`, set when adding or
  editing a player on `/admin/players`.
- The shuffle (`shuffleIntoTeamsWithKeepers`) seeds keepers before dealing anyone else:
  dedicated keepers go one per team, teams still without one are covered by a `flexible`
  player, and everybody left — including surplus keepers, who just play out that day — is
  Fisher–Yates shuffled into the remaining slots. With no keepers in the mix it degrades to
  the original random split. Team sizes are unchanged either way.
- `team_player.is_keeper` records who actually went in goal for that team on that day — the
  second deliberate exception to §3, and what the clean-sheet / goals-conceded stats key off.
  A player's preference is a standing choice; this is what happened on the night.
- The check-in list shows keeper markers, and the shuffle panel previews coverage
  ("2 dedicated · 1 team without") before you commit.

### 11c. Overall player rating

`src/lib/rating.ts` blends the stats into one 0-100 number, used to sort the leaderboard by
default and to decide the season MVP. Three things it has to get right:

- **Different units.** Every metric is normalised against the season's best, so each one
  contributes 0..1 of its weight and the category leader scores full marks for it.
- **Volume vs. rate.** Counting stats (goals, points, matchdays) and per-match rates are both
  included, so neither the ever-present plodder nor the one-game hotshot runs away with it.
- **Small samples.** Rate metrics are shrunk toward the league average with a prior worth
  `PRIOR_MATCHES` (3) matches, so 2 goals in a single appearance can't top the table.

Weights sum to 100. Match MVPs carry the most, being the only input that comes from people
who watched the game rather than from arithmetic on the scoresheet:

| Metric | Weight | Metric | Weight |
|---|---|---|---|
| Match MVPs | 20 | Goals | 10 |
| Goals + assists | 14 | Assists per match | 9 |
| Win % | 13 | Wins | 6 |
| Points | 12 | Matchdays | 5 |
| Goals per match | 11 | | |

Players with no finished matches are rated 0 and shown as "—". The rating is never presented
bare: `/` gets an `RTG` column, `/players/[id]` gets a per-metric breakdown with bars, and the
`/awards` MVP banner lists its top contributors — a blended score invites "why am I below
him?", so the answer ships alongside it.

Every leaderboard column also carries a hover/tap tooltip (`StatTooltip`, with `touch: true`
so it works on phones) explaining what that column measures.
