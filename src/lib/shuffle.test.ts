import { describe, expect, it } from "vitest";
import {
  fisherYatesShuffle,
  keeperCoverage,
  shuffleIntoTeams,
  shuffleIntoTeamsWithKeepers,
  type KeeperPref,
  type ShuffleCandidate,
} from "./shuffle";

function sizes(teams: number[][]): number[] {
  return teams.map((t) => t.length);
}

function ids(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

/**
 * `n` candidates numbered 1..n, where `prefs` overrides individual players by
 * id (everyone else is a plain outfielder). e.g. candidates(15, { 1: "goalkeeper" }).
 */
function candidates(n: number, prefs: Record<number, KeeperPref> = {}): ShuffleCandidate[] {
  return ids(n).map((id) => ({ id, keeperPref: prefs[id] ?? "outfield" }));
}

describe("shuffleIntoTeams", () => {
  it("15 players at team size 5 -> three teams of 5", () => {
    expect(sizes(shuffleIntoTeams(ids(15), 5))).toEqual([5, 5, 5]);
  });

  it("13 players at team size 5 -> [5, 4, 4]", () => {
    expect(sizes(shuffleIntoTeams(ids(13), 5))).toEqual([5, 4, 4]);
  });

  it("7 players at team size 5 -> [4, 3] (minimum 2 teams)", () => {
    expect(sizes(shuffleIntoTeams(ids(7), 5))).toEqual([4, 3]);
  });

  it("rejects fewer than 4 players", () => {
    expect(() => shuffleIntoTeams(ids(3), 5)).toThrow();
  });

  it("every player appears in exactly one team, with no duplicates or omissions", () => {
    const input = ids(17);
    const teams = shuffleIntoTeams(input, 5);
    const flat = teams.flat().slice().sort((a, b) => a - b);
    expect(flat).toEqual(input.slice().sort((a, b) => a - b));
  });

  it("team sizes never differ by more than 1", () => {
    for (const n of [4, 6, 9, 11, 16, 22, 31]) {
      const teams = shuffleIntoTeams(ids(n), 5);
      const s = sizes(teams);
      expect(Math.max(...s) - Math.min(...s)).toBeLessThanOrEqual(1);
      expect(teams.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("accepts an injectable RNG and still shuffles deterministically for a fixed seed sequence", () => {
    const sequence = [0.9, 0.1, 0.5, 0.2, 0.8, 0.3];
    let i = 0;
    const rng = () => sequence[i++ % sequence.length];
    const teams = shuffleIntoTeams(ids(6), 3, rng);
    expect(sizes(teams)).toEqual([3, 3]);
    // deterministic RNG => deterministic output
    i = 0;
    const teamsAgain = shuffleIntoTeams(ids(6), 3, rng);
    expect(teamsAgain).toEqual(teams);
  });
});

describe("shuffleIntoTeamsWithKeepers", () => {
  it("puts one dedicated keeper on each team rather than doubling up", () => {
    // 3 keepers, 3 teams (15 players at size 5) — one each, none spare.
    const teams = shuffleIntoTeamsWithKeepers(
      candidates(15, { 1: "goalkeeper", 2: "goalkeeper", 3: "goalkeeper" }),
      5,
    );
    expect(teams).toHaveLength(3);
    expect(teams.map((t) => t.keeperId).sort((a, b) => a! - b!)).toEqual([1, 2, 3]);
    // each keeper is also on the roster of the team they keep for
    for (const t of teams) expect(t.playerIds).toContain(t.keeperId);
  });

  it("falls back to flexible players only once the dedicated keepers run out", () => {
    // 1 dedicated + 2 flexible, 3 teams: the dedicated keeper is always used.
    const teams = shuffleIntoTeamsWithKeepers(
      candidates(15, { 1: "goalkeeper", 2: "flexible", 3: "flexible" }),
      5,
    );
    const keepers = teams.map((t) => t.keeperId);
    expect(keepers).toContain(1);
    expect(keepers.filter((k) => k !== null).sort((a, b) => a! - b!)).toEqual([1, 2, 3]);
  });

  it("prefers a flexible player over leaving a team without a keeper", () => {
    const teams = shuffleIntoTeamsWithKeepers(candidates(8, { 7: "flexible" }), 4);
    expect(teams.filter((t) => t.keeperId !== null)).toHaveLength(1);
    expect(teams.find((t) => t.keeperId !== null)!.keeperId).toBe(7);
  });

  it("leaves keeperId null on every team when nobody keeps", () => {
    const teams = shuffleIntoTeamsWithKeepers(candidates(15), 5);
    expect(teams.map((t) => t.keeperId)).toEqual([null, null, null]);
  });

  it("plays surplus keepers outfield instead of dropping them", () => {
    // 4 dedicated keepers but only 2 teams: 2 keep, 2 play out.
    const teams = shuffleIntoTeamsWithKeepers(
      candidates(8, { 1: "goalkeeper", 2: "goalkeeper", 3: "goalkeeper", 4: "goalkeeper" }),
      4,
    );
    expect(teams.filter((t) => t.keeperId !== null)).toHaveLength(2);
    const flat = teams.flatMap((t) => t.playerIds).sort((a, b) => a - b);
    expect(flat).toEqual(ids(8));
  });

  it("produces the same team sizes as the position-blind shuffle", () => {
    for (const n of [4, 6, 9, 11, 13, 16, 22, 31]) {
      const withKeepers = shuffleIntoTeamsWithKeepers(
        candidates(n, { 1: "goalkeeper", 2: "goalkeeper", 3: "flexible" }),
        5,
      );
      expect(withKeepers.map((t) => t.playerIds.length)).toEqual(sizes(shuffleIntoTeams(ids(n), 5)));
    }
  });

  it("assigns every player exactly once, with no duplicates or omissions", () => {
    const teams = shuffleIntoTeamsWithKeepers(
      candidates(17, { 4: "goalkeeper", 9: "flexible", 12: "goalkeeper" }),
      5,
    );
    const flat = teams.flatMap((t) => t.playerIds).sort((a, b) => a - b);
    expect(flat).toEqual(ids(17));
  });

  it("rejects fewer than 4 players, like the position-blind shuffle", () => {
    expect(() => shuffleIntoTeamsWithKeepers(candidates(3), 5)).toThrow();
  });
});

describe("keeperCoverage", () => {
  it("reports how many teams get a dedicated, flexible, or no keeper", () => {
    expect(keeperCoverage(candidates(15, { 1: "goalkeeper", 2: "flexible" }), 5)).toEqual({
      teamCount: 3,
      dedicated: 1,
      flexible: 1,
      uncovered: 1,
    });
  });

  it("never counts more keepers than there are teams", () => {
    const prefs: Record<number, KeeperPref> = { 1: "goalkeeper", 2: "goalkeeper", 3: "goalkeeper" };
    expect(keeperCoverage(candidates(8, prefs), 4)).toEqual({
      teamCount: 2,
      dedicated: 2,
      flexible: 0,
      uncovered: 0,
    });
  });

  it("matches what the shuffle actually assigns", () => {
    const c = candidates(13, { 1: "goalkeeper", 5: "flexible" });
    const coverage = keeperCoverage(c, 5);
    const teams = shuffleIntoTeamsWithKeepers(c, 5);
    expect(teams.filter((t) => t.keeperId !== null)).toHaveLength(
      coverage.dedicated + coverage.flexible,
    );
    expect(teams.filter((t) => t.keeperId === null)).toHaveLength(coverage.uncovered);
  });
});

describe("fisherYatesShuffle", () => {
  it("returns a permutation of the input (same elements, same length)", () => {
    const input = ids(10);
    const shuffled = fisherYatesShuffle(input);
    expect(shuffled).toHaveLength(input.length);
    expect(shuffled.slice().sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate the input array", () => {
    const input = ids(5);
    const copy = [...input];
    fisherYatesShuffle(input);
    expect(input).toEqual(copy);
  });
});
