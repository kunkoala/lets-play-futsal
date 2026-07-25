/**
 * Pure "who plays next" logic for a game day. See PLAN.md §7.
 */
import { fisherYatesShuffle } from "./shuffle";

export type TeamId = number;
export type PlayedMatch = { home: TeamId; away: TeamId; seq: number };

/**
 * Proposes the next match: the two teams with the fewest matches played,
 * tie-broken by longest time since their last match (never-played first),
 * then randomly. If the resulting pairing is an immediate rematch of the
 * previous match, swaps in the 3rd-ranked team instead — but only if doing
 * so keeps every team's played-count within 1 of each other; otherwise the
 * rematch is allowed (avoiding it would hurt fairness more than it helps).
 */
export function proposeNext(
  teamsInput: readonly TeamId[],
  playedMatches: readonly PlayedMatch[],
  rng: () => number = Math.random,
): [TeamId, TeamId] {
  if (teamsInput.length < 2) {
    throw new Error("Need at least 2 teams to propose a match.");
  }

  // Pre-shuffle so ties (equal count + equal recency) resolve randomly
  // without embedding randomness in the sort comparator itself.
  const teams = fisherYatesShuffle(teamsInput, rng);

  const playedCount = new Map<TeamId, number>();
  const lastSeq = new Map<TeamId, number>(); // -1 = never played
  for (const t of teams) {
    playedCount.set(t, 0);
    lastSeq.set(t, -1);
  }
  for (const m of playedMatches) {
    playedCount.set(m.home, (playedCount.get(m.home) ?? 0) + 1);
    playedCount.set(m.away, (playedCount.get(m.away) ?? 0) + 1);
    lastSeq.set(m.home, Math.max(lastSeq.get(m.home) ?? -1, m.seq));
    lastSeq.set(m.away, Math.max(lastSeq.get(m.away) ?? -1, m.seq));
  }

  const ranked = [...teams].sort((a, b) => {
    const countDiff = (playedCount.get(a) ?? 0) - (playedCount.get(b) ?? 0);
    if (countDiff !== 0) return countDiff;
    return (lastSeq.get(a) ?? -1) - (lastSeq.get(b) ?? -1);
  });

  const first = ranked[0];
  let second = ranked[1];

  if (playedMatches.length > 0 && ranked.length >= 3) {
    const lastMatch = playedMatches.reduce((a, b) => (a.seq > b.seq ? a : b));
    const isImmediateRematch =
      (lastMatch.home === first && lastMatch.away === second) ||
      (lastMatch.home === second && lastMatch.away === first);

    if (isImmediateRematch) {
      const third = ranked[2];
      const hypothetical = new Map(playedCount);
      hypothetical.set(first, (hypothetical.get(first) ?? 0) + 1);
      hypothetical.set(third, (hypothetical.get(third) ?? 0) + 1);
      const counts = teams.map((t) => hypothetical.get(t) ?? 0);
      const diff = Math.max(...counts) - Math.min(...counts);
      if (diff <= 1) {
        second = third;
      }
    }
  }

  return [first, second];
}

function pairKey(a: TeamId, b: TeamId): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * True once every team has played every other team at least once — the
 * "everyone's had a go" milestone the session page uses to suggest a
 * reshuffle. Deliberately checks actual pairs played, not just equal
 * played-counts: `proposeNext` balances counts, but an unlucky run of
 * rematches could equalise counts before the round robin is really done.
 */
export function roundRobinComplete(
  teamIds: readonly TeamId[],
  playedMatches: readonly PlayedMatch[],
): boolean {
  if (teamIds.length < 2) return false;

  const played = new Set(playedMatches.map((m) => pairKey(m.home, m.away)));
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      if (!played.has(pairKey(teamIds[i], teamIds[j]))) return false;
    }
  }
  return true;
}
