import { describe, expect, it } from "vitest";
import { proposeNext, type PlayedMatch } from "./matchmaker";

function playedCounts(teams: number[], matches: PlayedMatch[]): Map<number, number> {
  const counts = new Map(teams.map((t) => [t, 0]));
  for (const m of matches) {
    counts.set(m.home, (counts.get(m.home) ?? 0) + 1);
    counts.set(m.away, (counts.get(m.away) ?? 0) + 1);
  }
  return counts;
}

describe("proposeNext", () => {
  it("3 teams over 6 matches: each plays 4, counts never differ by more than 1", () => {
    const teams = [1, 2, 3];
    const matches: PlayedMatch[] = [];

    for (let seq = 1; seq <= 6; seq++) {
      const [home, away] = proposeNext(teams, matches);
      matches.push({ home, away, seq });
    }

    const counts = [...playedCounts(teams, matches).values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(12); // 6 matches * 2 teams each
  });

  it("2 teams: always the same pairing", () => {
    const teams = [1, 2];
    const matches: PlayedMatch[] = [];

    for (let seq = 1; seq <= 5; seq++) {
      const [home, away] = proposeNext(teams, matches);
      expect(new Set([home, away])).toEqual(new Set([1, 2]));
      matches.push({ home, away, seq });
    }
  });

  it("4 teams: never proposes the same pairing twice in a row", () => {
    const teams = [1, 2, 3, 4];
    const matches: PlayedMatch[] = [];

    for (let seq = 1; seq <= 12; seq++) {
      const [home, away] = proposeNext(teams, matches);
      if (matches.length > 0) {
        const prev = matches[matches.length - 1];
        const prevPair = new Set([prev.home, prev.away]);
        const thisPair = new Set([home, away]);
        expect(thisPair).not.toEqual(prevPair);
      }
      matches.push({ home, away, seq });
    }

    const counts = [...playedCounts(teams, matches).values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("absorbs a manual-override match and recovers fairness afterward", () => {
    const teams = [1, 2, 3];
    const matches: PlayedMatch[] = [];

    // A few auto-proposed matches first.
    for (let seq = 1; seq <= 3; seq++) {
      const [home, away] = proposeNext(teams, matches);
      matches.push({ home, away, seq });
    }

    // Manual override: admin picks 1 vs 2 twice more, skewing counts (team 3 neglected).
    matches.push({ home: 1, away: 2, seq: 4 });
    matches.push({ home: 1, away: 2, seq: 5 });

    const skewedCounts = playedCounts(teams, matches);
    expect(skewedCounts.get(3)).toBeLessThan(skewedCounts.get(1)!);

    // The very next proposal should involve the neglected team.
    const [home, away] = proposeNext(teams, matches);
    expect([home, away]).toContain(3);
    matches.push({ home, away, seq: 6 });

    // After a few more auto-proposed rounds, fairness recovers.
    for (let seq = 7; seq <= 12; seq++) {
      const [h, a] = proposeNext(teams, matches);
      matches.push({ home: h, away: a, seq });
    }

    const finalCounts = [...playedCounts(teams, matches).values()];
    expect(Math.max(...finalCounts) - Math.min(...finalCounts)).toBeLessThanOrEqual(1);
  });

  it("throws with fewer than 2 teams", () => {
    expect(() => proposeNext([1], [])).toThrow();
  });
});
