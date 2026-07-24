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

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SEASON_NAME = "Odd Semester 2026";

const TEAM_COLORS = {
  Red: "#ef4444",
  Blue: "#3b82f6",
  Green: "#22c55e",
} as const;

const PLAYER_NAMES = [
  "Fikri Ramadhan",
  "Raka Pratama",
  "Dimas Aditya",
  "Bagus Saputra",
  "Yoga Firmansyah",
  "Rizky Maulana",
  "Aditya Nugroho",
  "Reza Pahlevi",
  "Fajar Sidik",
  "Hafiz Rahman",
  "Ilham Kurniawan",
  "Gilang Ramadhan",
  "Wahyu Setiawan",
  "Andika Putra",
  "Nanda Prasetyo",
  "Surya Wijaya",
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
  for (const name of PLAYER_NAMES) {
    const player = await prisma.player.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
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
  for (const [name, color] of Object.entries(TEAM_COLORS) as [
    "Red" | "Blue" | "Green",
    string,
  ][]) {
    const team = await prisma.team.create({
      data: { sessionId: session.id, name, color },
    });
    teams[name] = team;
    await prisma.teamPlayer.createMany({
      data: rosters[name].map((p) => ({ teamId: team.id, playerId: p.id })),
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
      },
    });

    let eventSeq = 1;
    for (const event of result.events) {
      const benefitingTeam = event.side === "home" ? homeTeam : awayTeam;
      await prisma.goalEvent.create({
        data: {
          matchId: match.id,
          seq: eventSeq++,
          teamId: benefitingTeam.id,
          scorerId: event.scorer?.id ?? null,
          assistId: event.assist?.id ?? null,
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
