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
 * Splits `playerIds` into teams of roughly `teamSize` players each.
 *
 * Team count = round(n / teamSize), with a minimum of 2 teams. The remainder
 * is spread across teams so sizes never differ by more than 1 (e.g. 13
 * players at teamSize 5 → 3 teams sized [5, 4, 4], not [5, 5, 3]).
 *
 * Throws if there aren't enough players to form at least two 2-a-side teams
 * (n < 4) — below that there's no meaningful match to play.
 */
export function shuffleIntoTeams(
  playerIds: readonly number[],
  teamSize: number,
  rng: () => number = Math.random,
): number[][] {
  const n = playerIds.length;
  if (n < 4) {
    throw new Error(
      `Need at least 4 attendees to form teams (got ${n}).`,
    );
  }
  if (!Number.isInteger(teamSize) || teamSize < 1) {
    throw new Error("teamSize must be a positive integer.");
  }

  const teamCount = Math.max(2, Math.round(n / teamSize));
  const shuffled = fisherYatesShuffle(playerIds, rng);

  const baseSize = Math.floor(n / teamCount);
  const remainder = n % teamCount;

  const teams: number[][] = [];
  let index = 0;
  for (let i = 0; i < teamCount; i++) {
    const size = baseSize + (i < remainder ? 1 : 0);
    teams.push(shuffled.slice(index, index + size));
    index += size;
  }
  return teams;
}
