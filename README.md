# Let's Play Futsal

Ships as **Liga Minggu** — that's the name in the navbar, the browser tab, and
on the home screen once installed. "Let's Play Futsal" is just the repo.

A weekly futsal team manager for a student community — runs game day start to
finish and turns it into a season worth bragging about. One admin checks in
whoever showed up, hits **Shuffle**, and a position-aware algorithm seeds one
goalkeeper per team before dealing everyone else out at random, previewing
keeper coverage before it's locked in. From there the matchmaker always
proposes who plays next — fewest matches played first, tie-broken by longest
wait, dodging immediate rematches unless fairness says otherwise — while a live
match clock (duration, pause, break) and courtside scoreboard track every goal
and assist as it happens, MVP included.

All of it rolls up automatically into a public leaderboard: goals, assists,
G+A, points, form, clean sheets, match MVPs, and a single 0-100 player rating
that blends volume and rate stats with a Bayesian prior so one lucky game can't
outrank a season of showing up — capped off with end-of-semester awards.

Want to see it without real data? **`/demo`** runs the whole app on a generated
season — nothing there touches the database.

See `PLAN.md` for the full architecture, domain model, and phased build plan.

## Local development

1. Start Postgres only (the app itself runs on the host for hot reload):
   ```
   docker compose up -d db
   ```
2. Install dependencies and run the dev server:
   ```
   npm install
   npm run dev
   ```
3. Open http://localhost:3000.

Copy `.env.example` to `.env` (or `.env.local`) and fill in real values before
running either command — see that file for what each of the six variables
(`DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
`ADMIN_PASSWORD`, `SESSION_SECRET`) is for.

## Install it on your phone or the courtside iPad

The app is installable — add it to a home screen and it opens like a native app
with no browser chrome, which is worth real screen space on the live match
console. Nothing to download; it's the same site.

**iPhone / iPad** — open the site in **Safari**, tap the Share button, scroll to
**Add to Home Screen**, then **Add**. iOS never prompts on its own, so this is
the only way in. (On iOS 16.4+ Chrome and Edge can do it too, but Safari is the
reliable path.)

**Android** — open in Chrome. It usually offers **Install** on its own after a
visit or two; otherwise **⋮ → Add to Home screen**.

**Desktop (Chrome / Edge)** — click the install icon at the right-hand end of
the address bar, or **⋮ → Cast, save and share → Install page as app**.

Once installed you also get shortcuts: long-press the icon for **Matchday HQ**
(straight into the admin session flow) and **Leaderboard**.

Two things worth knowing:

- **It needs a connection.** There is no offline mode, deliberately — logging a
  goal, shuffling teams and ending a match are all server writes, so a cache
  that served stale screens mid-match would do more harm than offline reading
  would do good. See `PLAN.md` §11e.
- **Install only appears over HTTPS.** That means the real deployed domain, or
  `localhost` during development — it will not show up if you browse to a dev
  machine over the network by IP.

## Weekly routine (admin)

1. Open the session for this week (`/admin/sessions` → create, or open an
   existing one).
2. Check in whoever showed up, then hit **Shuffle** to split them into teams.
3. **Lock teams** once everyone's happy with the split.
4. Start each proposed match and tap goals/assists live on the court (an iPad
   works well — install it, see above) — the app always proposes who plays next.
5. On **End match**, optionally tap a man of the match from either roster. You
   can skip it, or set it later from the session page.
6. Hit **Complete session** once the last match ends.

Set each player's position (outfield / can keep if needed / goalkeeper) on
`/admin/players`. The shuffle seeds one keeper per team before dealing everyone
else out, and the check-in screen previews the coverage before you commit.

## Tests

```
npm test
```

Runs vitest — unit tests cover the shuffle including keeper seeding
(`src/lib/shuffle.ts`), the matchmaker (`src/lib/matchmaker.ts`), the derived
stats (`src/lib/stats.ts`), and the player rating (`src/lib/rating.ts`).

## Deployment

Deployed via [Coolify](https://coolify.io) directly from `docker-compose.yml`
(the `db` and `app` services) — Coolify builds the `Dockerfile`, injects the
env vars, and terminates TLS/routing itself. See `PLAN.md` §8a and Phase 8
for the full deploy walkthrough.

In the Coolify UI, set the six env vars from `.env.example` on the resource
(`DATABASE_URL` should point at the compose `db` service, e.g.
`postgresql://<user>:<pass>@db:5432/<db>`) and assign a domain to the `app`
service. On every deploy, the container runs `prisma migrate deploy`
automatically before starting — no manual migration step.
