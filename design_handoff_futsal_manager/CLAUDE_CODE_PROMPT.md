# Claude Code prompt — UI overhaul

Paste the block below into Claude Code, run from the **root of your existing repo** with this
`design_handoff_futsal_manager/` folder committed alongside your code. This is a **UI/UX overhaul**
— your Next.js + Mantine app, data model, routes, server actions, auth, and matchmaker already
exist and work. Do **not** rebuild the backend. Only replace the presentation layer to match the
design reference.

---

## PROMPT

**Overhaul the UI of this existing Next.js + Mantine futsal app to match a new design — keep all
backend, data, and logic intact.**

The app already runs: Prisma/Postgres schema, routes, server actions, `jose` auth, the shuffle
and matchmaker logic are all built and working. My current UI is rough and I want to replace it
with a polished design. **Do not change the data model, server actions, API behavior, auth, or
matchmaker.** This is a presentation-layer overhaul only.

**Design source of truth:** `design_handoff_futsal_manager/README.md` + open
`design_handoff_futsal_manager/Futsal Screens.dc.html` in a browser to see the intended look and
the live shuffle/tap interactions. The HTML is a *reference*, not code to copy — recreate it with
Mantine components and my existing patterns.

**Do this first (don't skip):**
1. Read the README fully, then map every screen in it to the existing route/component in my repo
   (leaderboard `/`, player profile, sessions, awards, admin dashboard, session check-in, teams/
   next-match, live match console, login). List the mapping back to me before editing.
2. Establish the theme once: a custom `MantineProvider` theme with the README tokens — dark
   `#12141A` base, panel `#1B1E26`, volt accent `#C8FF2F`, and the five **refined** team colors
   (`#FF4D57`/`#4D8BFF`/`#2FD06A`/`#FFCB2B`/`#B06BFF`) registered as named theme colors. Load
   **Archivo** + **Archivo Expanded** from Google Fonts; use Archivo Expanded + `tabular-nums`
   for all scores/big numbers. Make screens read from the theme, not hardcoded colors.

**Then overhaul screen by screen** (show me each before moving on), using the selected directions:
- **Live match console → split court** (`1b` landscape, `2e` portrait). Team-colored halves,
  giant centered score numeral, ≥64px tap tiles, assist strip, own-goal, undo, event feed.
  Keep the existing optimistic update + event-delete wiring; only restyle. Ignore alt layout `1a`.
- **Public leaderboard → spotlight** (`1d` phone / `4a` desktop): top-scorer hero + dense table
  + sort tabs. Ignore alt layout `1c`.
- **Player profile** (`2c`/`4b`), **Awards** (`2d`/`4c`), **Admin dashboard** (`3a`),
  **Check-in** (`2a`), **Teams/next-match** (`2b`) — per README.
- **Shuffle reveal** (`3b`): add the slot-machine → staggered pop-in animation over my existing
  Fisher–Yates result (`popIn` keyframe in README §8). Respect `prefers-reduced-motion`.

**Constraints:**
- Reuse Mantine components (`Table`, `Tabs`, `Modal`, `Checkbox`, `Badge`, `Card`, `Notifications`).
- Public pages phone-first + the documented desktop layouts; live/game-day iPad-first with
  `touch-action:manipulation` and the 600ms double-tap guard; admin dashboard fluid grid.
- Don't touch tests, migrations, or env/deploy config. If a design implies a data field that
  doesn't exist, ask me instead of altering the schema.

Start with steps 1–2 (mapping + theme) and wait for my OK before restyling individual screens.

---
