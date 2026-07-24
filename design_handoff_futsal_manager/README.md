# Handoff: PPI Braunschweiger Futsal — Weekly Futsal Manager

## Overview
A weekly futsal manager for a student community. A public read-only site shows players,
sessions, and a semester leaderboard; a single admin runs the game day from an iPad at
courtside — check in attendees, shuffle random teams, and log goals/assists live tap-by-tap.
Everything rolls up into a season leaderboard and an end-of-semester awards page.

This handoff covers the **design/UI layer**. The product scope, data model, routes, auth,
matchmaker logic, and deployment are fully specified in the separate **Build Plan** document
(the "Let's Play Futsal — Build Plan" markdown the design was created from). Implement against
that plan; use this README for the exact look, layout, and interaction of every screen.

## About the Design Files
`Futsal Screens.dc.html` is a **design reference created in HTML** — a prototype showing the
intended look and behavior of each screen. It is **not** production code to copy directly.

The task is to **recreate these screens in the target codebase** — per the Build Plan that is
**Next.js 16 (App Router, TypeScript) + Tailwind + Mantine + Prisma/Postgres**. Rebuild the UI
with those libraries and the app's own patterns (Mantine `Table`/`Modal`/`Tabs`/`Checkbox`,
server actions, etc.); treat the HTML as the visual + interaction spec, not as markup to paste.

The prototype is one file with multiple "turns" of option cards on a pan/zoom canvas. Each card
has a small id badge (`1a`, `2b`, `4a`…) referenced throughout this README.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions. Recreate the UI
pixel-faithfully using the codebase's libraries. Exact hex values and sizes are listed below.

## Chosen directions (what to build)
The prototype explored options; the user selected these to implement:
- **Live match console → "Split court" (`1b` landscape + `2e` portrait).** NOT the broadcast
  layout `1a` (kept only as an alternate reference).
- **Leaderboard / public treatment → "Spotlight" (`1d` phone + `4a` desktop).** NOT the podium
  layout `1c`.
- Everything else has a single direction.

---

## Design Tokens

### Typography
Two Google Fonts:
- **Archivo Expanded** — display face: scoreboards, big numbers, headlines. Weights 700/800/900.
  Used with `font-variant-numeric: tabular-nums` and `letter-spacing: -0.01em` on numerals.
- **Archivo** — everything else: UI, body, rosters, labels. Weights 400/500/600/700/800.

Import:
`https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Expanded:wght@600;700;800;900&display=swap`

Common type roles:
- Giant score numeral: Archivo Expanded 900, 82–104px, line-height ~0.7–0.8, tabular-nums.
- Screen title (e.g. "LEADERBOARD"): Archivo Expanded 900, 24–34px, letter-spacing -0.02em.
- Section eyebrow/label: Archivo 700, 10px, letter-spacing 0.12–0.16em, UPPERCASE, muted.
- Body/roster: Archivo 600, 13–15px.

### Colors
| Token | Hex | Use |
|---|---|---|
| Court night (bg) | `#12141A` | app background |
| Deep panel | `#0D0F14` / `#0A0B0E` | scoreboard column, frame chrome |
| Panel | `#1B1E26` | cards, list rows |
| Panel raised | `#232732` | secondary buttons, chips, steppers |
| Hairline | `rgba(255,255,255,0.06–0.09)` | borders/dividers |
| Text | `#F4F5F7` | primary text |
| Text muted | `rgba(244,245,247,0.45–0.6)` | secondary text/labels |
| **Volt (accent)** | `#C8FF2F` | primary CTA, highlights, active tab, top-scorer |
| Volt gradient end | `#8FDC12` | CTA/hero gradient bottom |
| Loss red text | `#FF8A8A` | "L" result badge text |

**Team identities** (fixed five; each has a darker gradient partner used for split-court halves):
| Team | Base | Gradient dark |
|---|---|---|
| Red | `#FF4D57` | `#C41F2B` |
| Blue | `#4D8BFF` | `#1E56C9` |
| Green | `#2FD06A` | `#149B47` |
| Yellow | `#FFCB2B` | — |
| Purple | `#B06BFF` | — |

Team color is stored per team as hex in the DB (Build Plan §6). The Build Plan lists the raw
values `#ef4444/#3b82f6/#22c55e/#eab308/#a855f7`; the design **refines** them to the table above
(brighter on the dark base) — use the refined values.

### Radius, shadow, spacing
- Radius: chips/list rows 12px; cards 14–22px; device/window frames 16–20px; pills 20px.
- Card shadow: `0 30px 70px -30px rgba(0,0,0,.55)` (frames); panels flat.
- Accent glow (CTA): `0 12px 30px -12px rgba(200,255,47,.6)`; team tile glow `0 8px 22px -8px <team>`.
- Section padding: desktop 36px 40px; iPad screens ~22–28px; cards 16–30px.
- Grid/flex gaps: 8–16px typical; use `gap`, not margins.

---

## Screens / Views

> Live console + game-day screens are **iPad-first** (landscape 1024×768 and portrait ≈768×1024),
> tap targets ≥64px, `touch-action: manipulation`. Public pages are **phone-first** (375–390px)
> AND have desktop layouts (~1280px). Admin dashboard is desktop.

### 1. Public — Leaderboard  (`1d` phone, `4a` desktop)
- **Purpose:** default public landing; season standings, sortable.
- **Phone layout (`1d`):** header with ⚽ logo + "PPI BS Futsal" + season pill; below, a
  **Top-Scorer spotlight hero** — volt→`#8FDC12` gradient card, dark text, giant `12` numeral
  next to "goals / 6 games · 5 assists", large faint ⚽ watermark bottom-right. Then sort tabs
  (Goals active = volt outline; Assists/Wins/Win%). Then a dense table: `# | player(team dot) | G | A | W`.
- **Desktop layout (`4a`):** browser chrome + navbar (logo left; Leaderboard/Sessions/Awards +
  season switcher right). Two-column grid `380px 1fr`: left = same spotlight hero (bigger, 80px
  numeral); right = "SEASON STANDINGS" title + sort tabs + wide table
  `# | Player | G | A | W | D | L | Win%`. Rank 1 numeral is volt.
- **Copy/data:** Fikri 12 (top), Dimas 9, Yusuf 7, Raka 6, Rizky 5, Bagus 4, Aditya 3.
- **Behavior:** sort tabs re-sort the table (server-side or client). Season switcher only if >1 season.

### 2. Public — Player profile  (`2c` phone, `4b` desktop)
- **Purpose:** one player's season + all-time totals and per-session history.
- **Layout:** profile hero (mono initials avatar with 2px team-color border, big name in Archivo
  Expanded, "Usually Red · 6 games") + three stat tiles (GOALS volt / ASSISTS / WINS) + an
  all-time strip ("31 G · 14 A · 11 W · 18 games"). Then **session history**: rows of
  Matchday · date · team dot · `3⚽ 1🅰` · result badge. Desktop (`4b`) puts profile card left
  (360px) and history as a full table right (Matchday/Date/Team/Goals/Assists/Result).
- **Result badges:** W = volt text on `rgba(200,255,47,.14)`; D = muted on `rgba(255,255,255,.08)`;
  L = `#FF8A8A` on `rgba(255,77,87,.14)`. All `border-radius:6px`, Archivo 800 11px.

### 3. Public — Awards  (`2d` phone, `4c` desktop)
- **Purpose:** per-season Top Scorer / Top Assists / Most Wins (computed, top 3 each) + MVP
  (admin hand-picked).
- **Layout:** centered "SEASON AWARDS" + season eyebrow. **MVP hero** = volt gradient banner,
  🏆, "MVP · Admin's pick", giant name, a one-line quote, faint ★ watermark. Then three award
  cards (Top Scorer ⚽ / Top Assists 🅰 / Most Wins 🥇), each top-3 list with the winner's number
  in the team-ish accent (volt/blue/green). Phone stacks; desktop (`4c`) is a full-width banner
  + `repeat(3,1fr)` grid.

### 4. Admin — Dashboard  (`3a`, desktop, responsive)
- **Purpose:** admin home after login.
- **Layout:** navbar (Matchday HQ + active-season pill + Log out). Fluid grid
  `repeat(auto-fit,minmax(230px,1fr))` — reflows to any width. Cards: **Resume session** (spans
  2 cols; "MATCHDAY 08 · 14 checked in · teams not locked" + Resume/New buttons), **Season
  snapshot** (Sessions 7 / Goals 148 / Top scorer Fikri·12), and a row of quick-link tiles
  (Players / Sessions / Seasons / Awards).

### 5. Admin — Game-day Stage 1: Check-in  (`2a`, iPad landscape)
- **Purpose:** tick who showed up, choose team size, preview the split, shuffle.
- **Layout:** grid `1fr 308px`. Left = header (MATCHDAY 08, date, venue) + live "14 checked in"
  count + a `repeat(3,1fr)` grid of player toggle rows (checked = `#1B1E26` + 1px volt border +
  volt ✓ box; unchecked = dim `#15171D`, opacity .5, hollow box, min-height 50px). Right panel
  = team-size stepper (− `5` +, big numeral), a preview card ("14 attending splits into 3 TEAMS"
  + colored size chips 5/5/4), and a full-width volt **🎲 SHUFFLE TEAMS** button.
- **Preview math:** numTeams = round(n / size); sizes differ by ≤1; min 2 teams
  (15→[5,5,5], 13→[5,4,4], 7→[4,3]). See Build Plan §6/§7.

### 6. Admin — Game-day Stage 2: Teams locked + next match  (`2b`, iPad landscape)
- **Purpose:** courtside hub between matches; the matchmaker proposes who plays next.
- **Layout:** grid `322px 1fr`. Left = "TEAMS · LOCKED" + Reshuffle, three team cards
  (color left-border, name, "N played", roster names) and a "Complete session" outline button
  at the bottom. Right = **matchmaker card**: "Matchmaker says · Match 4", RED vs GREEN with
  color tiles and **per-team played-counts shown** (fairness legible), a big volt
  **▶ START THIS MATCH** + "Pick different teams" override; below, a "Matches so far" feed of
  finished scores (`RED 4 – 2 BLUE`, tap to view/fix).
- **Behavior:** proposal computed on the fly (Build Plan §7). Start rejects if a match is already
  in_progress. Complete blocked while a match is in_progress.

### 7. Admin — Live match console  (SELECTED: split court `1b` landscape / `2e` portrait)
- **Purpose:** log goals & assists by tapping, iPad at courtside. THE star screen.
- **Layout (split court):** screen split into two team-colored halves (Red gradient
  `#FF4D57→#C41F2B`, Green `#2FD06A→#149B47`), radial dark vignette per half for legibility.
  Each half: team name at outer edge, **giant score numeral centered** in the half, and a grid
  of **player tap tiles** (min-height 70–74px, translucent white `rgba(255,255,255,.16)`, name +
  their goal count). Per-half "Own goal +1" tile (`rgba(0,0,0,.22)`). Landscape (`1b`): halves
  side by side, a **floating control pill top-center** (`MD07·M3` · ↺ Undo · End match).
  Portrait (`2e`): halves stacked, control bar is the **seam between them** (`#0A0B0E`).
- **Tap flow:** tap player → +1 goal for their team → an **"Assist?" strip** appears with that
  player's teammates as chips + a **No assist** button (auto-dismisses to no-assist on next
  action). Own-goal tile creates a scorer-less event. **Undo** reverts the last event; a
  scrollable event feed allows deleting any older event.
- **Score is derived** from goal events (count per team) — never stored. See Build Plan §3/§6.
- **Copy example (feed):** "5  Raka ⚽ (Fikri 🅰)".
- The alternate **broadcast** layout `1a` (roster columns flanking a center scoreboard + feed)
  is kept as reference only — do not build unless asked.

### 8. Admin — Shuffle reveal (interaction spec)  (`3b`, iPad landscape)
- **Purpose:** the dopamine moment when random teams are generated.
- **Behavior:** tapping **🎲 SHUFFLE TEAMS** runs a ~1.4s slot-machine — every ~85ms each team
  column fills with random names (dimmed, slight blur), ~16 ticks, then locks to the final
  Fisher–Yates split. Final names **pop in staggered** (`popIn` keyframe:
  `opacity 0→1, translateY(8px)→0, scale .9→1`, 0.34s `cubic-bezier(.2,.8,.3,1.4)`, delay
  `index*45ms`). On done: status flips to "Teams ready — lock them in", a **🔒 LOCK TEAMS**
  button and **↺ Reshuffle** appear. Three columns RED(5)/BLUE(5)/GREEN(4) as full-height
  gradient cards. This is the courtside version of Stage-1 shuffle; wire it to the real
  Fisher–Yates from Build Plan §6.

---

## Interactions & Behavior (summary)
- **Sort tabs** (leaderboard): re-sort standings; active tab = volt outline/fill.
- **Season switcher:** dropdown pill; only when >1 season.
- **Check-in toggles:** tap to add/remove attendee; live count updates; preview recomputes.
- **Shuffle:** slot-machine animation → staggered pop-in reveal (see §8). Respect
  `prefers-reduced-motion` — skip the roll, show the final split immediately.
- **Live tap-to-score:** optimistic +1 (Build Plan says `useOptimistic`); assist follow-up strip;
  own-goal; undo last; delete any event from the feed. Disable a tapped tile ~600ms (double-tap guard).
- **Transitions:** session status `draft → teams_set → completed`, with unlock/reopen guards.
- **Responsive:** public pages phone (≤390) → desktop (~1280) as documented; admin dashboard
  fluid auto-fit grid; live/game-day are iPad landscape + portrait (not phone/desktop).

## State Management (design-facing; full model in Build Plan §3)
- Session status drives which stage renders (`draft`/`teams_set`/`completed`).
- Live match: local optimistic goal-event list; score & player stats are **counts** over events.
- Shuffle reveal: `phase: idle | rolling | done`, per-team name arrays, an interval timer.
- Leaderboard/awards: aggregates computed per-request from events (no stored counters).

## Assets
- No image assets. ⚽ 🏆 🅰 🥇 ★ 👑 are emoji/glyphs used as icons/watermarks.
- Avatars are mono initials on a team-colored ring (no photos — out of scope v1).
- Fonts: Archivo + Archivo Expanded from Google Fonts (see token section).

## Files
- `Futsal Screens.dc.html` — the full interactive design reference (all screens, all turns).
  Open it in a browser; pan/zoom the canvas. Card ids (`1a`…`4c`) match the screen sections above.
