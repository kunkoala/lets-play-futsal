/**
 * Phase 1 seed data — see PLAN.md §3 (domain model) and §9 Phase 1 (spec).
 *
 * Creates:
 *  - one active season ("Odd Semester 2026")
 *  - 16 active players
 *  - 2 completed sessions in that season, each with 3 teams (Red/Blue/Green,
 *    colors per PLAN.md §6) and full attendance for whoever is rostered
 *  - 3 finished matches per session (every team plays every other team once)
 *  - goal_event rows covering: scorer+assist, scorer-only (no assist), and
 *    one own goal (scorer_id NULL) — enough variety to develop leaderboard/
 *    public pages against realistic data
 *
 * Idempotency strategy: this script is safe to re-run. It looks up the
 * season by its unique name and, if found, deletes it first — deleting a
 * Session cascades (per schema.prisma onDelete: Cascade) through
 * Attendance, Team -> TeamPlayer, and Match -> GoalEvent, so one
 * `session.deleteMany` + `season.delete` clears the whole tree. Players are
 * upserted by their unique `name`, so they survive re-runs unchanged (and
 * are reused if this script is ever run again after players already exist).
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_DURATION_MIN } from "../src/lib/matchClock";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SEASON_NAME = "Odd Semester 2026";
/** These matches have no real clock behind them (started_at === ended_at,
 *  by construction below), so goal minutes are spread evenly across a match
 *  of this length rather than derived from one — same idea as demoData.ts. */
const SEED_MATCH_DURATION_SEC = DEFAULT_DURATION_MIN * 60;

const TEAM_COLORS = {
  Red: "#ef4444",
  Blue: "#3b82f6",
  Green: "#22c55e",
} as const;

/**
 * Order matters: sessions roster players by slicing this list, and the keeper
 * preferences are spread so each of the three teams ends up with someone who
 * can go in goal — including one `flexible` player covering Green, to exercise
 * the shuffle's fallback path.
 */
const PLAYERS: { name: string; keeperPref: "outfield" | "flexible" | "goalkeeper" }[] = [
  { name: "Fikri Ramadhan", keeperPref: "outfield" },
  { name: "Raka Pratama", keeperPref: "outfield" },
  { name: "Dimas Aditya", keeperPref: "outfield" },
  { name: "Bagus Saputra", keeperPref: "outfield" },
  { name: "Yoga Firmansyah", keeperPref: "goalkeeper" },
  { name: "Rizky Maulana", keeperPref: "outfield" },
  { name: "Aditya Nugroho", keeperPref: "goalkeeper" },
  { name: "Reza Pahlevi", keeperPref: "outfield" },
  { name: "Fajar Sidik", keeperPref: "outfield" },
  { name: "Hafiz Rahman", keeperPref: "outfield" },
  { name: "Ilham Kurniawan", keeperPref: "outfield" },
  { name: "Gilang Ramadhan", keeperPref: "outfield" },
  { name: "Wahyu Setiawan", keeperPref: "flexible" },
  { name: "Andika Putra", keeperPref: "outfield" },
  { name: "Nanda Prasetyo", keeperPref: "outfield" },
  { name: "Surya Wijaya", keeperPref: "flexible" },
];

async function resetSeason() {
  const existing = await prisma.season.findFirst({
    where: { name: SEASON_NAME },
  });
  if (!existing) return;

  // Award has no cascade from Season (kept RESTRICT deliberately, per
  // schema.prisma comments), so clear any awards for this season first.
  await prisma.award.deleteMany({ where: { seasonId: existing.id } });
  // Session -> Attendance/Team/Match (and their children) cascade in the DB.
  await prisma.session.deleteMany({ where: { seasonId: existing.id } });
  await prisma.season.delete({ where: { id: existing.id } });
}

async function upsertPlayers() {
  const players = [];
  for (const { name, keeperPref } of PLAYERS) {
    const player = await prisma.player.upsert({
      where: { name },
      update: { isActive: true, keeperPref },
      create: { name, isActive: true, keeperPref },
    });
    players.push(player);
  }
  return players;
}

type Player = Awaited<ReturnType<typeof upsertPlayers>>[number];

async function createSeason() {
  // Exactly one active season at a time (PLAN.md §3 / Phase 3 rule) —
  // deactivate any other active season before activating this one.
  await prisma.season.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  return prisma.season.create({
    data: {
      name: SEASON_NAME,
      startsOn: new Date("2026-08-01"),
      endsOn: new Date("2026-12-19"),
      isActive: true,
    },
  });
}

/**
 * Builds one completed session: attendance for `attendees`, 3 teams of 5
 * (Red/Blue/Green), a round-robin of 3 finished matches, and a fixed set of
 * goal events per match (passed in by the caller so each session's story
 * differs).
 */
async function createSession(params: {
  seasonId: number;
  date: string;
  attendees: Player[];
  /** Player of the day — one per session, from anyone who turned up. */
  mvp: Player;
  matchResults: {
    home: "Red" | "Blue" | "Green";
    away: "Red" | "Blue" | "Green";
    events: {
      side: "home" | "away";
      scorer: Player | null;
      assist: Player | null;
    }[];
  }[];
}) {
  const session = await prisma.session.create({
    data: {
      seasonId: params.seasonId,
      date: new Date(params.date),
      status: "completed",
      mvpPlayerId: params.mvp.id,
    },
  });

  await prisma.attendance.createMany({
    data: params.attendees.map((p) => ({
      sessionId: session.id,
      playerId: p.id,
    })),
  });

  // 5 players per team, in attendance order: Red, then Blue, then Green.
  const rosters: Record<"Red" | "Blue" | "Green", Player[]> = {
    Red: params.attendees.slice(0, 5),
    Blue: params.attendees.slice(5, 10),
    Green: params.attendees.slice(10, 15),
  };

  const teams = {} as Record<"Red" | "Blue" | "Green", { id: number }>;
  const keepers = {} as Record<"Red" | "Blue" | "Green", Player | null>;
  for (const [name, color] of Object.entries(TEAM_COLORS) as [
    "Red" | "Blue" | "Green",
    string,
  ][]) {
    const team = await prisma.team.create({
      data: { sessionId: session.id, name, color },
    });
    teams[name] = team;
    // Same precedence the shuffle uses: a dedicated keeper if the roster has
    // one, otherwise whoever is willing to cover.
    const keeper =
      rosters[name].find((p) => p.keeperPref === "goalkeeper") ??
      rosters[name].find((p) => p.keeperPref === "flexible") ??
      null;
    keepers[name] = keeper;
    await prisma.teamPlayer.createMany({
      data: rosters[name].map((p) => ({
        teamId: team.id,
        playerId: p.id,
        isKeeper: p.id === keeper?.id,
      })),
    });
  }

  let seq = 1;
  for (const result of params.matchResults) {
    const homeTeam = teams[result.home];
    const awayTeam = teams[result.away];
    const match = await prisma.match.create({
      data: {
        sessionId: session.id,
        seq: seq++,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        status: "finished",
        startedAt: new Date(params.date),
        endedAt: new Date(params.date),
        // Every match snapshots its own lineup — the seed has no
        // substitutions, so each is just the two team sheets.
        lineup: {
          createMany: {
            data: ([result.home, result.away] as const).flatMap((name) =>
              rosters[name].map((p) => ({
                playerId: p.id,
                teamId: teams[name].id,
                isKeeper: p.id === keepers[name]?.id,
              })),
            ),
          },
        },
      },
    });

    let eventSeq = 1;
    for (const event of result.events) {
      const benefitingTeam = event.side === "home" ? homeTeam : awayTeam;
      const matchSec = Math.floor(
        (eventSeq / (result.events.length + 1)) * SEED_MATCH_DURATION_SEC,
      );
      await prisma.goalEvent.create({
        data: {
          matchId: match.id,
          seq: eventSeq++,
          teamId: benefitingTeam.id,
          scorerId: event.scorer?.id ?? null,
          assistId: event.assist?.id ?? null,
          matchSec,
        },
      });
    }
  }

  return session;
}

async function main() {
  await resetSeason();
  const players = await upsertPlayers();
  const season = await createSeason();

  const byName = (name: string) => {
    const p = players.find((pl) => pl.name === name);
    if (!p) throw new Error(`seed: unknown player ${name}`);
    return p;
  };

  // Session 1: players 1-15 attend (player 16 sits out).
  const session1Attendees = players.slice(0, 15);
  await createSession({
    seasonId: season.id,
    date: "2026-08-06",
    attendees: session1Attendees,
    mvp: byName("Raka Pratama"), // two goals and an assist across the matchday
    matchResults: [
      {
        // Red 3 - 2 Blue
        home: "Red",
        away: "Blue",
        events: [
          { side: "home", scorer: byName("Fikri Ramadhan"), assist: byName("Raka Pratama") },
          { side: "home", scorer: byName("Dimas Aditya"), assist: null },
          { side: "home", scorer: byName("Raka Pratama"), assist: byName("Fikri Ramadhan") },
          { side: "away", scorer: byName("Rizky Maulana"), assist: byName("Aditya Nugroho") },
          { side: "away", scorer: byName("Reza Pahlevi"), assist: null },
        ],
      },
      {
        // Green 1 - 1 Red (draw)
        home: "Green",
        away: "Red",
        events: [
          { side: "home", scorer: byName("Ilham Kurniawan"), assist: byName("Gilang Ramadhan") },
          { side: "away", scorer: byName("Bagus Saputra"), assist: null },
        ],
      },
      {
        // Green 0 - 2 Blue (includes one own goal benefiting Blue)
        home: "Green",
        away: "Blue",
        events: [
          { side: "away", scorer: byName("Fajar Sidik"), assist: byName("Hafiz Rahman") },
          { side: "away", scorer: null, assist: null }, // own goal, unattributed
        ],
      },
    ],
  });

  // Session 2: players 2-16 attend (player 1 sits out) — different roster mix.
  const session2Attendees = players.slice(1, 16);
  await createSession({
    seasonId: season.id,
    date: "2026-08-13",
    attendees: session2Attendees,
    mvp: byName("Reza Pahlevi"), // a goal and two assists across the matchday
    matchResults: [
      {
        // Red 2 - 2 Green (draw)
        home: "Red",
        away: "Green",
        events: [
          { side: "home", scorer: byName("Raka Pratama"), assist: byName("Dimas Aditya") },
          { side: "home", scorer: byName("Bagus Saputra"), assist: null },
          { side: "away", scorer: byName("Gilang Ramadhan"), assist: byName("Wahyu Setiawan") },
          { side: "away", scorer: byName("Andika Putra"), assist: byName("Gilang Ramadhan") },
        ],
      },
      {
        // Blue 3 - 1 Red
        home: "Blue",
        away: "Red",
        events: [
          { side: "home", scorer: byName("Reza Pahlevi"), assist: byName("Fajar Sidik") },
          { side: "home", scorer: byName("Hafiz Rahman"), assist: null },
          { side: "home", scorer: byName("Fajar Sidik"), assist: byName("Reza Pahlevi") },
          { side: "away", scorer: byName("Yoga Firmansyah"), assist: null },
        ],
      },
      {
        // Blue 1 - 2 Green
        home: "Blue",
        away: "Green",
        events: [
          { side: "away", scorer: byName("Nanda Prasetyo"), assist: byName("Surya Wijaya") },
          { side: "away", scorer: byName("Surya Wijaya"), assist: null },
          { side: "home", scorer: byName("Ilham Kurniawan"), assist: byName("Reza Pahlevi") },
        ],
      },
    ],
  });

  console.log(`Seeded season "${season.name}" (id=${season.id}) with ${players.length} players.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
