import { describe, expect, it } from "vitest";
import {
  buildRatingHistory,
  MIN_SESSIONS_FOR_IMPROVEMENT,
  mostImproved,
  movementOf,
  movementsFrom,
  type HistorySession,
} from "./ratingHistory";
import type { AggregatePlayer } from "./seasonAggregate";

const PLAYERS: AggregatePlayer[] = [
  { id: 1, name: "Alice", keeperPref: "outfield" },
  { id: 2, name: "Bob", keeperPref: "outfield" },
];

/**
 * One session: two teams of one, a single finished match, and whatever goals
 * the caller asks for. Enough to move a rating without modelling a real night.
 */
function session(
  id: number,
  goals: { aliceGoals: number; bobGoals: number },
): HistorySession {
  const events = [
    ...Array.from({ length: goals.aliceGoals }, () => ({
      teamId: 10,
      scorerId: 1,
      assistId: null,
    })),
    ...Array.from({ length: goals.bobGoals }, () => ({
      teamId: 20,
      scorerId: 2,
      assistId: null,
    })),
  ];

  return {
    id,
    date: new Date(2026, 0, id),
    mvpPlayerId: null,
    attendances: [{ playerId: 1 }, { playerId: 2 }],
    teams: [
      { id: 10, players: [{ playerId: 1, isKeeper: false }] },
      { id: 20, players: [{ playerId: 2, isKeeper: false }] },
    ],
    matches: [
      { homeTeamId: 10, awayTeamId: 20, status: "finished", goalEvents: events },
    ],
  };
}

describe("buildRatingHistory", () => {
  it("emits one point per session, oldest first", () => {
    const history = buildRatingHistory(
      [session(1, { aliceGoals: 2, bobGoals: 1 }), session(2, { aliceGoals: 1, bobGoals: 0 })],
      PLAYERS,
    );
    const alice = history.get(1)!;
    expect(alice.points.map((p) => p.sessionId)).toEqual([1, 2]);
  });

  it("carries season-to-date totals and that session's goals separately", () => {
    const history = buildRatingHistory(
      [session(1, { aliceGoals: 2, bobGoals: 0 }), session(2, { aliceGoals: 3, bobGoals: 0 })],
      PLAYERS,
    );
    const points = history.get(1)!.points;
    expect(points.map((p) => p.goals)).toEqual([2, 5]);
    expect(points.map((p) => p.goalsThisSession)).toEqual([2, 3]);
  });

  it("ranks the better player first at each point in time", () => {
    // Alice wins the opener, Bob wins the next two and overtakes.
    const history = buildRatingHistory(
      [
        session(1, { aliceGoals: 3, bobGoals: 0 }),
        session(2, { aliceGoals: 0, bobGoals: 4 }),
        session(3, { aliceGoals: 0, bobGoals: 4 }),
      ],
      PLAYERS,
    );
    expect(history.get(1)!.points[0].rank).toBe(1);
    expect(history.get(2)!.points[2].rank).toBe(1);
  });

  it("gives a player with no finished match no points at all", () => {
    const lonely: HistorySession = {
      ...session(1, { aliceGoals: 1, bobGoals: 0 }),
      matches: [],
    };
    const history = buildRatingHistory([lonely], PLAYERS);
    expect(history.get(1)!.points).toEqual([]);
    expect(history.get(2)!.points).toEqual([]);
  });

  it("returns an entry for every player, played or not", () => {
    const history = buildRatingHistory([], PLAYERS);
    expect([...history.keys()].sort()).toEqual([1, 2]);
  });
});

describe("movementOf", () => {
  it("is null on a player's first session — that's NEW, not unchanged", () => {
    const history = buildRatingHistory([session(1, { aliceGoals: 1, bobGoals: 0 })], PLAYERS);
    expect(movementOf(history.get(1))).toBeNull();
  });

  it("reports a climb up the table as a positive rankDelta", () => {
    const history = buildRatingHistory(
      [
        session(1, { aliceGoals: 3, bobGoals: 0 }),
        session(2, { aliceGoals: 0, bobGoals: 5 }),
      ],
      PLAYERS,
    );
    const bob = movementOf(history.get(2))!;
    expect(bob.previousRank).toBe(2);
    expect(bob.rankDelta).toBe(1);
    expect(bob.ratingDelta).toBeGreaterThan(0);
  });

  it("skips players with no comparison when mapping the whole field", () => {
    const history = buildRatingHistory([session(1, { aliceGoals: 1, bobGoals: 1 })], PLAYERS);
    expect(movementsFrom(history).size).toBe(0);
  });
});

describe("mostImproved", () => {
  it("ignores anyone below the minimum session gate", () => {
    const history = buildRatingHistory(
      [session(1, { aliceGoals: 1, bobGoals: 0 }), session(2, { aliceGoals: 4, bobGoals: 0 })],
      PLAYERS,
    );
    expect(MIN_SESSIONS_FOR_IMPROVEMENT).toBeGreaterThan(2);
    expect(mostImproved(history)).toEqual([]);
  });

  it("ranks a genuine climber above everyone who went backwards", () => {
    const history = buildRatingHistory(
      [
        session(1, { aliceGoals: 4, bobGoals: 0 }),
        session(2, { aliceGoals: 4, bobGoals: 0 }),
        session(3, { aliceGoals: 0, bobGoals: 5 }),
        session(4, { aliceGoals: 0, bobGoals: 5 }),
      ],
      PLAYERS,
    );
    const improved = mostImproved(history);
    expect(improved[0].playerId).toBe(2);
    expect(improved[0].gain).toBeGreaterThan(0);
    // Alice fell away over the same window, so she isn't "improved" at all.
    expect(improved.some((p) => p.playerId === 1)).toBe(false);
  });
});
