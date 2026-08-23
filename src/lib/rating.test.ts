import { describe, expect, it } from "vitest";
import { formatRating, METRICS, ratePlayers, type RatingInput } from "./rating";
import { emptyTotals, withRates } from "./stats";

/** A rated player built from raw totals, with rates derived the same way the app does. */
function player(playerId: number, overrides: Partial<ReturnType<typeof emptyTotals>>): RatingInput {
  return { ...withRates({ ...emptyTotals(), ...overrides }), playerId };
}

/** A solid all-round season, used as the "average" foil in comparisons. */
function average(playerId: number): RatingInput {
  return player(playerId, {
    goals: 5,
    assists: 4,
    wins: 5,
    draws: 2,
    losses: 3,
    matchesPlayed: 10,
    gamesPlayed: 4,
    mvps: 1,
  });
}

describe("METRICS", () => {
  it("weights sum to 100", () => {
    expect(METRICS.reduce((sum, m) => sum + m.weight, 0)).toBe(100);
  });

  it("does not rate MVPs at all — the award is for fun, not for ranking", () => {
    expect(METRICS.find((m) => m.key === "mvps")).toBeUndefined();
  });

  it("gives goals + assists the largest single share", () => {
    const top = METRICS.find((m) => m.key === "goalContributions")!;
    for (const other of METRICS) {
      if (other.key !== top.key) expect(other.weight).toBeLessThan(top.weight);
    }
  });
});

describe("ratePlayers", () => {
  it("rates a player who tops every metric at 100", () => {
    const best = player(1, {
      goals: 20,
      assists: 10,
      wins: 10,
      matchesPlayed: 10,
      gamesPlayed: 5,
      mvps: 5,
    });
    const ratings = ratePlayers([best, average(2)]);
    expect(ratings.get(1)!.rating).toBeCloseTo(100);
  });

  it("rates a player with no finished matches at 0 rather than dividing by zero", () => {
    const ratings = ratePlayers([player(1, { gamesPlayed: 2 }), average(2)]);
    expect(ratings.get(1)!.rating).toBe(0);
  });

  it("never exceeds 100 or drops below 0", () => {
    const pool = [
      average(1),
      player(2, { goals: 30, assists: 20, wins: 12, matchesPlayed: 12, gamesPlayed: 6, mvps: 8 }),
      player(3, { losses: 9, matchesPlayed: 9, gamesPlayed: 4 }),
    ];
    for (const r of ratePlayers(pool).values()) {
      expect(r.rating).toBeGreaterThanOrEqual(0);
      expect(r.rating).toBeLessThanOrEqual(100);
    }
  });

  it("each component contributes at most its own weight", () => {
    const ratings = ratePlayers([average(1), average(2)]);
    for (const c of ratings.get(1)!.components) {
      expect(c.points).toBeLessThanOrEqual(c.weight + 1e-9);
      expect(c.points).toBeGreaterThanOrEqual(0);
    }
  });

  it("sums the components into the rating", () => {
    const r = ratePlayers([average(1), average(2)]).get(1)!;
    const summed = r.components.reduce((sum, c) => sum + c.points, 0);
    expect(r.rating).toBeCloseTo(summed);
  });

  it("rates two identical seasons the same however many MVPs were won", () => {
    const withMvps = player(1, { goals: 5, assists: 3, wins: 5, matchesPlayed: 8, gamesPlayed: 4, mvps: 4 });
    const without = player(2, { goals: 5, assists: 3, wins: 5, matchesPlayed: 8, gamesPlayed: 4, mvps: 0 });
    const ratings = ratePlayers([withMvps, without]);
    expect(ratings.get(1)!.rating).toBeCloseTo(ratings.get(2)!.rating);
  });

  it("does not let a one-match hotshot out-rate a strong full season", () => {
    // 2 goals in a single match is a 2.00 goals/match rate — unbeatable on raw
    // rate, which is exactly what the prior is there to temper.
    const cameo = player(1, { goals: 2, wins: 1, matchesPlayed: 1, gamesPlayed: 1 });
    const regular = player(2, {
      goals: 14,
      assists: 8,
      wins: 9,
      draws: 1,
      losses: 2,
      matchesPlayed: 12,
      gamesPlayed: 6,
      mvps: 3,
    });
    const ratings = ratePlayers([cameo, regular]);
    expect(ratings.get(2)!.rating).toBeGreaterThan(ratings.get(1)!.rating);
  });

  it("still lets a genuinely better rate win once the sample is real", () => {
    const sharp = player(1, { goals: 18, assists: 6, wins: 7, matchesPlayed: 10, gamesPlayed: 5, mvps: 2 });
    const steady = player(2, { goals: 9, assists: 6, wins: 7, matchesPlayed: 10, gamesPlayed: 5, mvps: 2 });
    const ratings = ratePlayers([sharp, steady]);
    expect(ratings.get(1)!.rating).toBeGreaterThan(ratings.get(2)!.rating);
  });

  it("rewards playing more matchdays when the per-match numbers match", () => {
    const regular = player(1, { goals: 8, assists: 4, wins: 4, losses: 4, matchesPlayed: 8, gamesPlayed: 4 });
    const occasional = player(2, { goals: 4, assists: 2, wins: 2, losses: 2, matchesPlayed: 4, gamesPlayed: 2 });
    const ratings = ratePlayers([regular, occasional]);
    expect(ratings.get(1)!.rating).toBeGreaterThan(ratings.get(2)!.rating);
  });

  it("rates everyone 0 when nobody has played", () => {
    const ratings = ratePlayers([player(1, {}), player(2, {})]);
    expect([...ratings.values()].map((r) => r.rating)).toEqual([0, 0]);
  });

  it("returns an entry for every player passed in", () => {
    const ratings = ratePlayers([average(1), average(2), player(3, {})]);
    expect([...ratings.keys()].sort()).toEqual([1, 2, 3]);
  });
});

describe("formatRating", () => {
  it("prints one decimal", () => {
    expect(formatRating(82.44)).toBe("82.4");
    expect(formatRating(100)).toBe("100.0");
  });
});
