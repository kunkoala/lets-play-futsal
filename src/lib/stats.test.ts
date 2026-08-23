import { describe, expect, it } from "vitest";
import {
  applyMatch,
  deriveRates,
  emptyTotals,
  formatPlusMinus,
  formatRate,
  FORM_LIMIT,
  resultOf,
  withRates,
  type MatchContribution,
  type PlayerTotals,
} from "./stats";

function contribution(overrides: Partial<MatchContribution> = {}): MatchContribution {
  return {
    goalsFor: 0,
    goalsAgainst: 0,
    playerGoals: 0,
    assists: 0,
    keeper: false,
    ...overrides,
  };
}

/** Accumulates a list of matches into one totals record, oldest first. */
function totalsOf(...matches: Partial<MatchContribution>[]): PlayerTotals {
  const t = emptyTotals();
  for (const m of matches) applyMatch(t, contribution(m));
  return t;
}

describe("resultOf", () => {
  it("maps a scoreline to W/D/L", () => {
    expect(resultOf(3, 1)).toBe("W");
    expect(resultOf(1, 1)).toBe("D");
    expect(resultOf(0, 2)).toBe("L");
  });
});

describe("applyMatch", () => {
  it("counts a win, the player's goals and assists, and plus/minus", () => {
    const t = totalsOf({ goalsFor: 3, goalsAgainst: 1, playerGoals: 1, assists: 2 });
    expect(t).toMatchObject({
      matchesPlayed: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      goals: 1,
      assists: 2,
      plusMinus: 2,
      form: ["W"],
    });
  });

  it("counts a clean sheet for everyone on a team that conceded nothing", () => {
    const t = totalsOf({ goalsFor: 2, goalsAgainst: 0 }, { goalsFor: 1, goalsAgainst: 1 });
    expect(t.cleanSheets).toBe(1);
  });

  it("scores a brace at exactly 2 goals and a hat-trick at 3 or more", () => {
    const t = totalsOf(
      { goalsFor: 2, goalsAgainst: 0, playerGoals: 2 },
      { goalsFor: 4, goalsAgainst: 1, playerGoals: 4 },
      { goalsFor: 1, goalsAgainst: 0, playerGoals: 1 },
    );
    expect(t.braces).toBe(1);
    expect(t.hatTricks).toBe(1);
  });

  it("tracks keeper matches, goals conceded, and keeper clean sheets separately", () => {
    const t = totalsOf(
      { goalsFor: 1, goalsAgainst: 0, keeper: true },
      { goalsFor: 2, goalsAgainst: 3, keeper: true },
      // outfield match: conceding here doesn't touch the keeper columns
      { goalsFor: 0, goalsAgainst: 4 },
    );
    expect(t).toMatchObject({
      keeperMatches: 2,
      keeperConceded: 3,
      keeperCleanSheets: 1,
      cleanSheets: 1,
    });
  });

  it("keeps only the most recent results in the form guide, oldest first", () => {
    const t = totalsOf(
      { goalsFor: 1, goalsAgainst: 0 }, // W — falls out of the window
      { goalsFor: 0, goalsAgainst: 1 }, // L
      { goalsFor: 1, goalsAgainst: 1 }, // D
      { goalsFor: 2, goalsAgainst: 0 }, // W
      { goalsFor: 0, goalsAgainst: 3 }, // L
      { goalsFor: 5, goalsAgainst: 4 }, // W
    );
    expect(t.form).toHaveLength(FORM_LIMIT);
    expect(t.form).toEqual(["L", "D", "W", "L", "W"]);
  });

  it("leaves MVPs alone — they're a per-session award the caller counts, not a per-match one", () => {
    const t = totalsOf({ goalsFor: 1, goalsAgainst: 0 }, { goalsFor: 1, goalsAgainst: 2 });
    expect(t.mvps).toBe(0);
  });
});

describe("deriveRates", () => {
  it("gives 3 points for a win and 1 for a draw", () => {
    const t = totalsOf(
      { goalsFor: 2, goalsAgainst: 1 },
      { goalsFor: 1, goalsAgainst: 1 },
      { goalsFor: 0, goalsAgainst: 2 },
    );
    const r = deriveRates(t);
    expect(r.points).toBe(4);
    expect(r.pointsPerMatch).toBeCloseTo(4 / 3);
  });

  it("computes goal contributions and per-match rates", () => {
    const t = totalsOf(
      { goalsFor: 3, goalsAgainst: 0, playerGoals: 2, assists: 1 },
      { goalsFor: 2, goalsAgainst: 2, playerGoals: 1, assists: 0 },
    );
    const r = deriveRates(t);
    expect(r.goalContributions).toBe(4);
    expect(r.goalsPerMatch).toBeCloseTo(1.5);
    expect(r.assistsPerMatch).toBeCloseTo(0.5);
    expect(r.contributionsPerMatch).toBeCloseTo(2);
    expect(r.winRate).toBeCloseTo(0.5);
  });

  it("returns 0 for every rate when nothing has been played (no divide by zero)", () => {
    const r = deriveRates(emptyTotals());
    expect(r).toMatchObject({
      pointsPerMatch: 0,
      goalsPerMatch: 0,
      assistsPerMatch: 0,
      contributionsPerMatch: 0,
      winRate: 0,
      concededPerKeeperMatch: 0,
    });
  });

  it("divides goals conceded by keeper matches only, not by every match played", () => {
    const t = totalsOf(
      { goalsFor: 1, goalsAgainst: 2, keeper: true },
      { goalsFor: 1, goalsAgainst: 4 },
    );
    expect(deriveRates(t).concededPerKeeperMatch).toBeCloseTo(2);
  });
});

describe("withRates", () => {
  it("merges raw totals and derived rates into one record", () => {
    const stats = withRates(totalsOf({ goalsFor: 2, goalsAgainst: 0, playerGoals: 1, assists: 1 }));
    expect(stats.goals).toBe(1);
    expect(stats.goalContributions).toBe(2);
    expect(stats.points).toBe(3);
  });
});

describe("formatting", () => {
  it("prints rates to two decimals", () => {
    expect(formatRate(1.256)).toBe("1.26");
    expect(formatRate(0)).toBe("0.00");
  });

  it("always signs plus/minus except at zero", () => {
    expect(formatPlusMinus(7)).toBe("+7");
    expect(formatPlusMinus(-3)).toBe("-3");
    expect(formatPlusMinus(0)).toBe("0");
  });
});
