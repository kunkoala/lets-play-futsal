import { describe, expect, it } from "vitest";
import { aggregateSeason, type AggregatePlayer, type AggregateSession } from "./seasonAggregate";

const PLAYERS: AggregatePlayer[] = [
  { id: 1, name: "Alice", keeperPref: "goalkeeper" },
  { id: 2, name: "Bob", keeperPref: "outfield" },
  { id: 3, name: "Cara", keeperPref: "outfield" },
  { id: 4, name: "Dan", keeperPref: "outfield" },
];

type Match = AggregateSession["matches"][number];

/** Alice + Bob for team 10, Cara + Dan for team 20. Alice keeps. */
const DEFAULT_LINEUP: Match["lineup"] = [
  { playerId: 1, teamId: 10, isKeeper: true },
  { playerId: 2, teamId: 10, isKeeper: false },
  { playerId: 3, teamId: 20, isKeeper: false },
  { playerId: 4, teamId: 20, isKeeper: false },
];

function match(overrides: Partial<Match> = {}): Match {
  return {
    homeTeamId: 10,
    awayTeamId: 20,
    status: "finished",
    lineup: DEFAULT_LINEUP,
    goalEvents: [],
    ...overrides,
  };
}

function session(matches: Match[], mvpPlayerId: number | null = null): AggregateSession {
  return {
    attendances: PLAYERS.map((p) => ({ playerId: p.id })),
    mvpPlayerId,
    matches,
  };
}

const statsFor = (sessions: AggregateSession[], playerId: number) =>
  aggregateSeason(sessions, PLAYERS).find((s) => s.playerId === playerId)!;

describe("aggregateSeason", () => {
  it("credits a win to everyone in the winning lineup", () => {
    const s = session([match({ goalEvents: [{ teamId: 10, scorerId: 2, assistId: 1 }] })]);
    expect(statsFor([s], 2)).toMatchObject({ wins: 1, matchesPlayed: 1, goals: 1 });
    expect(statsFor([s], 1)).toMatchObject({ wins: 1, assists: 1, cleanSheets: 1 });
    expect(statsFor([s], 3)).toMatchObject({ losses: 1, matchesPlayed: 1 });
  });

  it("counts matchdays from attendance, not from playing", () => {
    // Cara turned up but was left out of the only match.
    const lineup = DEFAULT_LINEUP.filter((m) => m.playerId !== 3);
    const s = session([match({ lineup })]);
    expect(statsFor([s], 3)).toMatchObject({ gamesPlayed: 1, matchesPlayed: 0 });
  });

  // The reason MatchPlayer exists at all — see prisma/schema.prisma.
  it("only counts a substitute in the matches they were actually in", () => {
    const withoutDan = DEFAULT_LINEUP.filter((m) => m.playerId !== 4);
    const evan = { playerId: 4, teamId: 20, isKeeper: false };

    const s = session([
      // Match 1: Dan sits out entirely.
      match({ lineup: withoutDan }),
      // Match 2: Dan comes on.
      match({ lineup: [...withoutDan, evan] }),
    ]);

    expect(statsFor([s], 4)).toMatchObject({ matchesPlayed: 1 });
    // Cara played both, so the two lineups really are different.
    expect(statsFor([s], 3)).toMatchObject({ matchesPlayed: 2 });
  });

  it("gives a substitute the result of the team they came on for", () => {
    const swapped: Match["lineup"] = [
      { playerId: 1, teamId: 10, isKeeper: true },
      { playerId: 2, teamId: 10, isKeeper: false },
      // Cara plays for the home side in match 2 instead of the away side.
      { playerId: 3, teamId: 10, isKeeper: false },
    ];
    const s = session([
      match({ goalEvents: [{ teamId: 10, scorerId: 2, assistId: null }] }),
      match({ lineup: swapped, goalEvents: [{ teamId: 10, scorerId: 2, assistId: null }] }),
    ]);

    // Lost with team 20 in match 1, won with team 10 in match 2.
    expect(statsFor([s], 3)).toMatchObject({ wins: 1, losses: 1 });
  });

  it("takes the keeper flag from the match, not the player's preference", () => {
    const bobKeeps: Match["lineup"] = [
      { playerId: 1, teamId: 10, isKeeper: false },
      { playerId: 2, teamId: 10, isKeeper: true },
      { playerId: 3, teamId: 20, isKeeper: false },
    ];
    const s = session([match({ lineup: bobKeeps, goalEvents: [{ teamId: 20, scorerId: 3, assistId: null }] })]);
    expect(statsFor([s], 2)).toMatchObject({ keeperMatches: 1, keeperConceded: 1 });
    // Alice prefers to keep but didn't this match.
    expect(statsFor([s], 1)).toMatchObject({ keeperMatches: 0 });
  });

  it("counts the session MVP once per matchday and ignores unfinished matches", () => {
    const s = session([match({ status: "in_progress" })], 2);
    const bob = statsFor([s], 2);
    expect(bob.mvps).toBe(1);
    expect(bob.matchesPlayed).toBe(0);
  });

  it("skips a lineup row pointing at neither side rather than guessing", () => {
    const stray: Match["lineup"] = [...DEFAULT_LINEUP, { playerId: 4, teamId: 99, isKeeper: false }];
    // Dan appears twice — once legitimately on team 20, once on a stray team.
    const s = session([match({ lineup: stray })]);
    expect(statsFor([s], 4).matchesPlayed).toBe(1);
  });
});
