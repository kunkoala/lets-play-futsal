# Backlog — post-launch round 1

Work items derived from user feedback after the first live sessions. `PLAN.md` stays the
source of truth for the domain model; this file is the queue of changes *against* it.

Ordering below is the recommended build order, not priority order. Items are independent
unless a **Depends on** line says otherwise.

**All seven items are shipped.** Details and the decisions taken are under each heading.

> ⚠️ **Two migrations are written but not applied** — the dev database wasn't
> running while this was built. Run `npx prisma migrate deploy` before starting the app,
> or Prisma will report drift:
> - `20260823000000_session_mvp` — backfills the session MVP, then drops `match.mvp_player_id`.
> - `20260823010000_match_lineups` — creates `match_player` and backfills every existing
>   match from its two team rosters, so no existing figure changes.
>
> Both backfill before they destroy anything, so they are safe on live data. Back up first
> regardless: the first one drops a column, and there is no down migration.

| # | Item | Size | Schema change | Status |
|---|------|------|---------------|--------|
| 1 | [Match MVP → Session MVP, out of the rating](#1--match-mvp--session-mvp-and-out-of-the-rating) | L | yes | done |
| 2 | [Per-match lineups + in-session substitutions](#2--per-match-lineups--in-session-substitutions) | XL | yes | done |
| 3 | [Games played column on the leaderboard](#3--games-played-column-on-the-leaderboard) | S | no | done |
| 4 | [Add-player combobox + players page responsiveness](#4--add-player-combobox--players-page-responsiveness) | M | no | done |
| 5 | [Session recap cards](#5--session-recap-cards) | M | no | done |
| 6 | [Rank/rating movement, player graphs, Most Improved](#6--rankrating-movement-player-graphs-most-improved) | L | no | done |
| 7 | [Public changelog page](#7--public-changelog-page) | S | no | done |

---

## 1 · Match MVP → Session MVP, and out of the rating

> **Status: done.** Decisions taken: weights redistributed by proportional scale-up
> rounded to integers (`goalContributions` 14 → 18 now leads); user-facing copy is
> **"Player of the Day"** (session) vs **"Season MVP"** (the `Award` row); achievement
> thresholds rescaled to 1 / 3 / 2-in-a-season. `mvpRate` was deleted rather than
> redefined — nothing outside the tests read it.

**Ask:** remove MVP from individual matches; keep exactly one MVP per session. MVP no
longer feeds the rating at all — match performance alone is enough.

**Why it's not a one-liner:** `mvps` is currently the single heaviest metric in the
rating (weight 20 of 100, `src/lib/rating.ts:70-77`), and `Match.mvpPlayerId` is one of
only two human-decision columns in the schema (see the modeling notes in
`prisma/schema.prisma`).

### 1a. Rating

- Delete the `mvps` metric from `METRICS` in `src/lib/rating.ts`. Remaining weights sum
  to **80** — they must be renormalised back to 100.
- Rewrite the module doc comment (`src/lib/rating.ts:1-28`), which currently explains
  that "Match MVPs carry the single largest share".
- `src/lib/rating.test.ts:29-38` asserts MVP weight is 20 and is the largest; `:88`
  asserts MVPs outrank an identical MVP-less season. Both go.
- `src/components/RatingBreakdown.tsx:92,101` special-cases the `mvps` bar colour and
  says "Match MVPs are worth…" in the caption.

**Open question — how to redistribute the 20 points.** Recommendation: proportional
scale-up of the remaining eight (each × 1.25), so relative emphasis is unchanged and the
change reads as "MVP removed" rather than "formula rebalanced". Alternative: hand-tune,
e.g. push `goalContributions` 14 → 22 and `winRate` 13 → 18 to lean the rating harder
toward on-pitch output. **Ratings will shift for everyone either way** — worth a line on
the changelog page (item 7).

### 1b. Schema

```
Match.mvpPlayerId      → drop (+ its @@index, + Player.matchMvps relation)
Session.mvpPlayerId    → add, Int? , FK Player, SET NULL, @@index
Player.sessionMvps     → add, relation("SessionMvp")
```

Migration must **backfill** before dropping: for each session with any match MVPs, set
`Session.mvpPlayerId` to the player with the most match MVPs that day, ties broken by
(goal contributions that session, then lowest player id) so the backfill is
deterministic. Sessions with zero match MVPs stay null.

Naming collision to resolve up front: `Award` + `AwardType.mvp` already means **season**
MVP (the admin's hand pick, `src/app/admin/seasons/actions.ts:113-127`). After this
change the app has *season MVP* and *session MVP* and no match MVP. Pick user-facing
copy that keeps them apart ("Player of the Season" / "Player of the Day"?) before
writing any UI.

### 1c. Stats plumbing

`applyMatch` in `src/lib/stats.ts:103,128` takes `mvp: boolean` per match. A session MVP
can't ride along on a per-match call — it needs a separate accumulation step:

- `src/lib/stats.ts` — drop `mvp` from `MatchContribution`; keep `mvps` on
  `PlayerTotals` but increment it from the session loop. `mvpRate` (`:64,161`) is
  currently per-match — redefine as per-matchday or delete it.
- `src/lib/seasonAggregate.ts` — `AggregateSession` gains `mvpPlayerId` at the session
  level and drops it from `matches[]`; increment in the per-session block (~`:70-75`).
- `src/lib/playerProfile.ts:112,125` — same shape change; `PlayerSessionHistoryRow.mvps`
  becomes a 0-or-1 boolean-ish flag rather than a count.
- `src/lib/demoData.ts:255-278` picks a per-match MVP — move the weighted pick up to the
  session level so the demo keeps matching production.

### 1d. Admin UI

- **Delete** `src/app/admin/sessions/[id]/MatchMvpControl.tsx` and its use in
  `MatchesSoFar.tsx:4,96`.
- `src/app/admin/sessions/[id]/live/actions.ts:233-300` — `readMvpField`,
  `assertPlayedInMatch`'s MVP branch, the `mvpPlayerId` write in end-match, and
  `setMatchMvp` all become one `setSessionMvp` action validating against session
  attendance instead of the two match rosters.
- `LiveConsole.tsx` — remove the MVP step from the end-match flow.
- New session-MVP picker, best placed on the session page next to
  `CompleteSessionButton` / `SessionStageActions`, so it's the last thing the admin does
  before completing. Should be editable after completion too (the current match MVP is —
  keep that property).

### 1e. Public UI

- `src/components/views/SessionDetailView.tsx:108,260-272` — per-match 🏆 badge becomes
  one session MVP element at the top of the page.
- `src/components/views/LeaderboardView.tsx:34,375-377,435` — the 🏆 column now counts
  session MVPs; numbers get ~6× smaller, check the column still earns its width.
- `src/components/views/PlayerProfileView.tsx:292,375-378,443` — MVP stat tile and the
  per-session history column.
- `src/components/views/AwardsView.tsx:65,134-137` — the "Match MVPs" card and the
  season-MVP subtitle string.
- `src/app/(public)/sessions/[id]/page.tsx:26` and `src/app/admin/sessions/[id]/page.tsx:75`
  — `include: { mvpPlayer: true }` moves from match to session.

### 1f. Achievements

`src/lib/achievements.ts:327-346` has three MVP badges at thresholds `>0`, `>=5`,
`>=3-in-a-season`. Session MVPs are roughly one per matchday instead of ~6, so the gold
tier at 5 becomes near-unreachable. Rescale (suggest `>0` / `>=3` / `>=2-in-a-season`)
and update `src/lib/achievements.test.ts`.

**Done when:** no `Match.mvpPlayerId` anywhere; every session has at most one MVP; two
players with identical match stats and different MVP counts get identical ratings;
`npm test` green.

---

## 2 · Per-match lineups + in-session substitutions

> **Status: done.** `MatchPlayer` added and snapshotted in `startMatch`; every derivation
> (`seasonAggregate`, `playerProfile`, `achievements`, `sessionRecap`, and the live
> console's `assertRostered`) now reads it instead of `Team.players`. Substitutions live
> behind **⇄ Sub** in the live console, and stay editable after a match finishes — a sub
> the admin missed while refereeing is exactly what gets fixed afterwards. The glove
> follows the shirt: subbing off a keeper makes the replacement the keeper, otherwise a
> team silently plays with nobody in goal and the clean-sheet numbers stop meaning
> anything. `TeamRosterEditor`'s "⚠ played" warning is gone — it stopped being true.
> `src/lib/seasonAggregate.test.ts` pins the behaviour the whole item exists for.
>
> Decision taken on bench semantics: a player left out of a match simply has no
> `MatchPlayer` row, so "attending but not in this match" needed no new state.

**Ask:** let a player drop in and out of teams mid-session — someone gets tired, someone
arrives late — and have the live console still record their stats correctly.

**Root cause, worth stating plainly:** there is no such thing as a match lineup in the
schema. Every stat is derived from `Team.players` (`TeamPlayer`) read *at query time* —
`src/lib/seasonAggregate.ts:78-79` builds a `rosters` map keyed by team id, and
`src/lib/playerProfile.ts:80` finds "the team this player was on that day". Because that
roster is session-scoped, editing it retroactively rewrites every match the team already
played. `TeamRosterEditor.tsx:220-224` warns the admin about exactly this, and
`Team.generation` (see the schema comment) is an existing workaround for the same problem
at reshuffle time.

**Approach (decided): snapshot lineups per match.**

```prisma
model MatchPlayer {
  matchId  Int     @map("match_id")
  playerId Int     @map("player_id")
  teamId   Int     @map("team_id")
  isKeeper Boolean @default(false) @map("is_keeper")

  match  Match  @relation(fields: [matchId], references: [id], onDelete: Cascade)
  team   Team   @relation(fields: [teamId], references: [id], onDelete: Cascade)
  player Player @relation(fields: [playerId], references: [id])

  @@id([matchId, playerId])
  @@index([matchId])
  @@index([teamId])
  @@map("match_player")
}
```

Cascade choices mirror `GoalEvent` for the same reason documented there (Team is a
compositional child of Session; RESTRICT races the sibling cascade).

**Migration + backfill:** for every existing match, insert one `MatchPlayer` per member
of `homeTeam.players` and `awayTeam.players`, copying `isKeeper`. This reproduces current
numbers exactly, so the migration is stat-neutral.

**Write path:** rows are created when a match is created/started
(`src/app/admin/sessions/[id]/live/actions.ts`, `NextMatchCard.tsx`), copied from the
current-generation `TeamPlayer` rows. `TeamPlayer` stays as "who was shuffled onto this
team" — the shuffle's output and the default lineup — but stops being the stats source.

**Read path (the actual payoff):**
- `src/lib/seasonAggregate.ts` — `AggregateSession.matches[]` gains `lineups`; the
  `rosters` map and the `session.teams` lookup go away.
- `src/lib/playerProfile.ts:80,97-99` — "which team was I on" becomes per-match.
- `src/lib/achievements.ts` `deriveExtraSignals` consumes the same session shape; check
  its roster assumptions.
- `assertPlayedInMatch` in `live/actions.ts:259` gets a real answer instead of a
  team-roster guess.
- `src/lib/demoData.ts` must emit lineups too.

**Substitution UI:** the mechanism is now cheap — a sub is just a `MatchPlayer` row that
differs from the previous match's. Two entry points:
- Between matches: `TeamRosterEditor` (currently `teams_set`-only, gated in
  `src/app/admin/sessions/[id]/page.tsx`) becomes available for the whole session. Its
  "counts them in for the whole session" warning at `:220-224` can then be deleted —
  it stops being true.
- In `LiveConsole`: a swap control on each team panel — pick an on-pitch player and a
  benched/attending player, swap them. Goal events reference players directly, so goals
  already scored are unaffected.

Bench semantics need a decision: today `benchPlayer` removes someone from the roster with
no replacement. With per-match lineups, "attending but not in this match" becomes a real
state, so a player can be benched for match 3 and back in for match 4 without touching
match 1-2 history.

**Done when:** subbing a player into match 4 of 6 credits them with matches 4-6 only;
`gamesPlayed` (matchdays attended) still comes from `Attendance`, unchanged.

---

## 3 · Games played column on the leaderboard

**Ask:** first column after rating should be games played, so rank relevance is obvious.

- `src/components/views/LeaderboardView.tsx:353-381` (headers) and `:416-436` (cells) —
  insert the new column immediately after `RTG`, before `G`.
- Bump `minWidth: 780` (`:343`) and the empty-state `colSpan={15}` (`:445`).
- Consider adding it to `SORT_FIELDS` (`:28-35`) so it's sortable.

**Open question — which number.** There are two:
- `gamesPlayed` = matchdays attended (from `Attendance`) — what "games played" means
  colloquially here, and what the rating's `Matchdays` metric uses.
- `matchesPlayed` = individual 5-a-side matches — the denominator of every per-match rate.

Recommendation: show `GP` (matchdays) in the always-visible group since that's the
relevance signal being asked for, and add `MP` further right where `+/−` and `CS`
already live. A player with `GP 1` next to a 92 rating explains itself immediately.

---

## 4 · Add-player combobox + players page responsiveness

> **Status: combobox done, responsiveness still todo.** `src/lib/playerName.ts` holds the
> normalisation (`playerNameKey` / `findNameCollision`, unit-tested); `AddPlayerForm` is a
> Mantine `Autocomplete` that warns inline and blocks submit on a normalised collision,
> flags deactivated matches, and offers a one-click `reactivatePlayer`. Both `addPlayer`
> and `updatePlayer` repeat the check server-side.
>
> Still outstanding from this item: the **responsiveness** half — search/filter over the
> roster, active/inactive sectioning, and the narrow-single-column desktop table.

**Ask:** typing a new player's name should surface existing matches so duplicates stop
happening; the flat list is hard to scan on both phone and desktop.

**Current state:** `AddPlayerForm.tsx:21-28` is a bare `TextInput`. `Player.name` is
`@unique`, and `addPlayer` catches P2002 (`players/actions.ts:44-49`) — so *exact*
duplicates are already impossible. The real failure is **near**-duplicates: `Azhar` vs
`azhar` vs `Azhar R`, which the DB happily accepts as three players.

**Combobox:**
- Swap `TextInput` for Mantine `Autocomplete` (free-text allowed, suggestions from the
  existing names the page already loads) — or `Combobox` if the option rows need avatars
  and "12 games · inactive" subtext to help the admin recognise someone.
- Match on a normalised key (lowercase, trimmed, collapsed whitespace, stripped
  punctuation) rather than raw prefix, so `azhar r` finds `Azhar R.`.
- When the typed name normalises to an existing player's, don't submit — show inline
  *"Azhar R. already exists (inactive — reactivate?)"* with a reactivate action. This is
  the "verification in hand" the feedback asks for.
- Server-side mirror in `addPlayer`: reject on normalised collision, not just P2002, and
  return the colliding player so the client can offer the same choice. Client-only checks
  lose to two admins adding at once.
- Inactive players are the common trap — they're absent from shuffle pickers, so an admin
  re-adds them. Surface inactive matches *prominently* in the suggestion list.

**Responsiveness (`players/page.tsx`, `PlayerRow.tsx`):**
- Add a search/filter input above the list — the single biggest win for a long roster.
- Desktop: the table is one narrow column in a `Container size="lg"`; either narrow the
  container or go multi-column for name/status.
- Phone: `PlayerCard` list is unbounded; filter + sticky search covers it. Section by
  active/inactive, with inactive collapsed by default.

---

## 5 · Session recap cards

**Ask:** sessions are a destination page — players go there to find their own matches.
Add a small recap: most goals, most assists, most clean sheets, etc.

- New `src/lib/sessionRecap.ts`, taking the same structural session shape
  `seasonAggregate.ts` already accepts, so `/sessions/[id]` and `/demo/sessions/[id]`
  both feed it and the demo can't drift.
- Recap fields worth having: top scorer, top assister, most clean sheets, session MVP
  (item 1), total goals, biggest win, hat-tricks/braces (`achievements.ts` already
  derives these signals), best +/−.
- Ties are the normal case at this sample size (two players on 2 goals) — the card must
  render multiple names, not pick one arbitrarily.
- Render as a card strip at the top of `SessionDetailView.tsx`, above the match list.
- Cheap follow-on: put the top scorer on each card in `SessionsView.tsx` so the index
  page is scannable.

**Depends on** item 1 for the MVP card (skip that one card if built first).

---

## 6 · Rank/rating movement, player graphs, Most Improved

**Ask:** arrows on the leaderboard showing change since last session; rating delta and
graphs on the player profile; "Most Improved" as a new prize.

**No schema change needed.** `aggregateSeason(sessions, players)` is already pure and
takes an arbitrary list of sessions — so standings *as of session N* are just
`aggregateSeason(sessions.slice(0, n), players)`. Replay rather than snapshot: no new
table, no backfill, and it stays correct when the rating formula changes (which item 1
guarantees it will).

- New `src/lib/ratingHistory.ts` — one pass producing, per player, a series of
  `{ sessionId, date, rating, rank, goals, assists, points }`.
- Cost is O(sessions²) over the aggregation. Fine at a season's scale (tens of sessions);
  if it bites, memoise per season — the input only changes when a session completes.
- **Leaderboard:** ▲3 / ▼2 / — beside the rank in `LeaderboardView.tsx:391-401`, comparing
  against the previous completed session. Players with no previous session get "NEW".
  Rank movement and rating movement are different stories — pick one for the table
  (recommend rank, it's what people argue about) and put both on the profile.
- **Player profile:** rating sparkline over the season plus a goals-per-session bar
  chart. `src/app/admin/analytics/TrafficChart.tsx` is an existing hand-rolled SVG chart
  in this codebase — follow that pattern; don't add a charting dependency.
- **Most Improved:** rating gain over the last N sessions, on `AwardsView.tsx` next to
  the existing computed award cards. Needs a minimum-appearances gate or it's won every
  week by whoever played their second-ever match; state the gate in the card's subtitle
  so it doesn't look arbitrary.

---

## 7 · Public changelog page

**Ask:** a changelog page inside the web app.

- Route `src/app/(public)/changelog/page.tsx`, plus `/demo` sibling only if the demo
  navigation needs it.
- Entries as a typed array in `src/lib/changelog.ts` (`{ date, version, title, items[],
  kind: "added" | "changed" | "fixed" }`). Static data, no schema, no admin editor —
  the file is edited in the same commit that ships the change.
- Link from `SiteFooter.tsx`; consider a "what's new" dot in `Navbar.tsx` keyed on the
  latest entry date vs a localStorage stamp.
- Items 1 and 6 both change numbers players have already seen (ratings shift when MVP
  leaves the formula). The changelog is where that gets explained — write those entries
  as part of shipping those items, not afterwards.
