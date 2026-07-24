/**
 * Pure shuffle logic for splitting a session's attendees into teams.
 * See PLAN.md §6 Stage 1 and §9 Phase 4.
 */

/** Fisher–Yates shuffle. Accepts an injectable RNG (defaults to Math.random) for testability. */
export function fisherYatesShuffle<T>(
  items: readonly T[],
  rng: () => number = Math.random,
): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * How many players land on each team for `n` attendees at a target `teamSize`.
 *
 * Team count = round(n / teamSize), with a minimum of 2 teams. The remainder
 * is spread across teams so sizes never differ by more than 1 (e.g. 13
 * players at teamSize 5 → [5, 4, 4], not [5, 5, 3]).
 *
 * Throws if there aren't enough players to form at least two 2-a-side teams
 * (n < 4) — below that there's no meaningful match to play.
 */
export function computeTeamSizes(n: number, teamSize: number): number[] {
  if (n < 4) {
    throw new Error(`Need at least 4 attendees to form teams (got ${n}).`);
  }
  if (!Number.isInteger(teamSize) || teamSize < 1) {
    throw new Error("teamSize must be a positive integer.");
  }

  const teamCount = Math.max(2, Math.round(n / teamSize));
  const baseSize = Math.floor(n / teamCount);
  const remainder = n % teamCount;

  return Array.from({ length: teamCount }, (_, i) => baseSize + (i < remainder ? 1 : 0));
}

/** Splits `playerIds` into teams of roughly `teamSize` players each, ignoring positions. */
export function shuffleIntoTeams(
  playerIds: readonly number[],
  teamSize: number,
  rng: () => number = Math.random,
): number[][] {
  const sizes = computeTeamSizes(playerIds.length, teamSize);
  const shuffled = fisherYatesShuffle(playerIds, rng);

  const teams: number[][] = [];
  let index = 0;
  for (const size of sizes) {
    teams.push(shuffled.slice(index, index + size));
    index += size;
  }
  return teams;
}

/** Mirrors the `KeeperPref` enum in prisma/schema.prisma. */
export type KeeperPref = "outfield" | "flexible" | "goalkeeper";

export type ShuffleCandidate = { id: number; keeperPref: KeeperPref };

export type ShuffledTeam = {
  playerIds: number[];
  /** Whoever is going in goal for this team, or null if nobody was available. */
  keeperId: number | null;
};

/**
 * How keeper coverage will work out for a given attendee mix — used to preview
 * the split before committing it (and to explain a shortfall to the admin).
 */
export type KeeperCoverage = {
  teamCount: number;
  /** Teams that get a `goalkeeper`-preference player. */
  dedicated: number;
  /** Teams that get a `flexible` player because no dedicated keeper was left. */
  flexible: number;
  /** Teams left with nobody in goal — the club sorts it out on the pitch. */
  uncovered: number;
};

export function keeperCoverage(
  candidates: readonly ShuffleCandidate[],
  teamSize: number,
): KeeperCoverage {
  const teamCount = computeTeamSizes(candidates.length, teamSize).length;
  const dedicatedAvailable = candidates.filter((c) => c.keeperPref === "goalkeeper").length;
  const flexibleAvailable = candidates.filter((c) => c.keeperPref === "flexible").length;

  const dedicated = Math.min(dedicatedAvailable, teamCount);
  const flexible = Math.min(flexibleAvailable, teamCount - dedicated);

  return { teamCount, dedicated, flexible, uncovered: teamCount - dedicated - flexible };
}

/**
 * Position-aware team split: seeds one keeper per team, then deals everyone
 * else out at random.
 *
 * 1. Dedicated keepers (`keeperPref: "goalkeeper"`) are shuffled and placed one
 *    per team, so two of them never end up on the same side while another team
 *    has none.
 * 2. Teams still without a keeper are filled from the `flexible` pool — players
 *    who'll go in goal only if nobody else will.
 * 3. Everyone left over — including surplus keepers once every team has one, who
 *    just play out as normal for the day — is Fisher–Yates shuffled into the
 *    remaining slots.
 *
 * With no keepers at all in the mix this degrades exactly to `shuffleIntoTeams`:
 * a plain random split with `keeperId: null` on every team.
 *
 * Team sizes are identical to `shuffleIntoTeams` for the same inputs — seeding
 * keepers changes who goes where, never how many.
 */
export function shuffleIntoTeamsWithKeepers(
  candidates: readonly ShuffleCandidate[],
  teamSize: number,
  rng: () => number = Math.random,
): ShuffledTeam[] {
  const sizes = computeTeamSizes(candidates.length, teamSize);

  const dedicated = fisherYatesShuffle(
    candidates.filter((c) => c.keeperPref === "goalkeeper"),
    rng,
  );
  const flexible = fisherYatesShuffle(
    candidates.filter((c) => c.keeperPref === "flexible"),
    rng,
  );

  const keeperIds: (number | null)[] = sizes.map(() => null);
  const takenAsKeeper = new Set<number>();
  for (let i = 0; i < sizes.length; i++) {
    const keeper = dedicated.shift() ?? flexible.shift();
    if (!keeper) break; // no keepers left — remaining teams play without one
    keeperIds[i] = keeper.id;
    takenAsKeeper.add(keeper.id);
  }

  const remainder = fisherYatesShuffle(
    candidates.filter((c) => !takenAsKeeper.has(c.id)).map((c) => c.id),
    rng,
  );

  const teams: ShuffledTeam[] = [];
  let index = 0;
  for (const [i, size] of sizes.entries()) {
    const keeperId = keeperIds[i];
    const outfieldCount = size - (keeperId === null ? 0 : 1);
    const playerIds = keeperId === null ? [] : [keeperId];
    playerIds.push(...remainder.slice(index, index + outfieldCount));
    index += outfieldCount;
    teams.push({ playerIds, keeperId });
  }
  return teams;
}
