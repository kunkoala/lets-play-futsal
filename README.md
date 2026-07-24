# Let's Play Futsal

Ships as **Liga Minggu** — that's the name in the navbar, the browser tab, and
on the home screen once installed. "Let's Play Futsal" is just the repo.

A weekly futsal team manager for a student community. The public site shows
registered players, session history, and a semester leaderboard (goals,
assists, wins, games played). A single admin (predefined credentials, no
sign-up) checks in attendees, shuffles them into random teams, runs the game
day match-by-match with a live courtside scoreboard, and the app rolls
everything up into the season leaderboard and end-of-semester awards.

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

## Weekly routine (admin)

1. Open the session for this week (`/admin/sessions` → create, or open an
   existing one).
2. Check in whoever showed up, then hit **Shuffle** to split them into teams.
3. **Lock teams** once everyone's happy with the split.
4. Start each proposed match and tap goals/assists live on the court (an iPad
   in the browser works well) — the app always proposes who plays next.
5. Hit **Complete session** once the last match ends.

## Tests

```
npm test
```

Runs vitest — unit tests cover the shuffle (`src/lib/shuffle.ts`) and
matchmaker (`src/lib/matchmaker.ts`) logic.

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
