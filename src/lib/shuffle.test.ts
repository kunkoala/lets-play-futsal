import { describe, expect, it } from "vitest";
import { fisherYatesShuffle, shuffleIntoTeams } from "./shuffle";

function sizes(teams: number[][]): number[] {
  return teams.map((t) => t.length);
}

function ids(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
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
