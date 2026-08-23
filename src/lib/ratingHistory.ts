/**
 * How every player's rating and rank moved, session by session.
 *
 * Nothing is stored. `aggregateSeason` is already pure and takes an arbitrary
 * list of sessions, so "the standings after session N" is just that function
 * run over the first N sessions. Replaying beats a snapshot table twice over:
 * there's no table to backfill, and the history stays correct when the rating
 * formula changes — which it does (session MVP was removed from it, and every
 * historical rating moved with it). A stored snapshot would have frozen the
 * old numbers and quietly disagreed with the leaderboard.
 *
 * Cost is O(sessions²) over the aggregation, which at a season of a few dozen
 * matchdays is nothing. If a season ever gets long enough to notice, memoise
 * per season — the input only changes when a session is completed.
 */
import { aggregateSeason, type AggregateSession, type AggregatePlayer } from "@/lib/seasonAggregate";

/** A session plus the identity the history needs to label its points. */
export type HistorySession = AggregateSession & { id: number; date: Date };

export type RatingPoint = {
  sessionId: number;
  date: Date;
  /** 0-100, relative to everyone who had played by this point in the season. */
  rating: number;
  /** 1-based standing at this point, among players with a finished match. */
  rank: number;
  /** Season-to-date totals as of this session. */
  goals: number;
  assists: number;
  points: number;
  /** Goals scored in this session alone — what the per-session bar chart plots. */
  goalsThisSession: number;
};

export type PlayerRatingHistory = {
  playerId: number;
  /** Oldest first. Empty until the player has finished their first match. */
  points: RatingPoint[];
};

/**
 * Change since the previous session. `null` for a player with nothing to
 * compare against — their first appearance is "NEW", not "unchanged".
 */
export type RatingMovement = {
  /** Positive means the rating went up. */
  ratingDelta: number;
  /**
   * Positive means the player climbed the table. Inverted from the raw rank
   * difference on purpose: rank 5 → 2 is +3 places, not -3.
   */
  rankDelta: number;
  previousRank: number;
  previousRating: number;
};

/**
 * Replays the season one session at a time.
 *
 * `sessions` must be oldest-first, like `aggregateSeason` expects — the ranks
 * are only meaningful in chronological order.
 */
export function buildRatingHistory(
  sessions: readonly HistorySession[],
  players: readonly AggregatePlayer[],
): Map<number, PlayerRatingHistory> {
  const history = new Map<number, PlayerRatingHistory>();
  for (const p of players) history.set(p.id, { playerId: p.id, points: [] });

  // Running per-player goal totals, so each point can carry that session's
  // goals without re-deriving them from the events a second time.
  const goalsBefore = new Map<number, number>();

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const standings = aggregateSeason(sessions.slice(0, i + 1), players);

    // Rank is only defined for players who have actually finished a match;
    // everyone else has a rating of 0 and would otherwise all tie for last.
    const ranked = standings
      .filter((s) => s.matchesPlayed > 0)
      .sort((a, b) => b.rating - a.rating);

    for (let rank = 0; rank < ranked.length; rank++) {
      const player = ranked[rank];
      const entry = history.get(player.playerId);
      if (!entry) continue;

      const before = goalsBefore.get(player.playerId) ?? 0;
      entry.points.push({
        sessionId: session.id,
        date: session.date,
        rating: player.rating,
        rank: rank + 1,
        goals: player.goals,
        assists: player.assists,
        points: player.points,
        goalsThisSession: player.goals - before,
      });
      goalsBefore.set(player.playerId, player.goals);
    }
  }

  return history;
}

/** The last session's change for one player, or null if they have no previous one. */
export function movementOf(history: PlayerRatingHistory | undefined): RatingMovement | null {
  const points = history?.points ?? [];
  if (points.length < 2) return null;

  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  return {
    ratingDelta: latest.rating - previous.rating,
    rankDelta: previous.rank - latest.rank,
    previousRank: previous.rank,
    previousRating: previous.rating,
  };
}

/** Per-player movement since the previous session, keyed by player id. */
export function movementsFrom(
  history: ReadonlyMap<number, PlayerRatingHistory>,
): Map<number, RatingMovement> {
  const movements = new Map<number, RatingMovement>();
  for (const [playerId, entry] of history) {
    const movement = movementOf(entry);
    if (movement) movements.set(playerId, movement);
  }
  return movements;
}

export type ImprovedPlayer = {
  playerId: number;
  /** Rating points gained over the window. */
  gain: number;
  from: number;
  to: number;
  /** How many sessions the gain was measured across. */
  sessions: number;
};

/**
 * Minimum sessions before a rating gain counts as improvement.
 *
 * Without a gate this award is won every week by whoever played their second
 * ever match: a first rating is built on one night of results and swings
 * enormously on the next. Three sessions is where the Bayesian prior in
 * `rating.ts` has largely handed over to a player's own numbers.
 */
export const MIN_SESSIONS_FOR_IMPROVEMENT = 3;

/**
 * Most improved over the last `window` sessions of a player's own history.
 *
 * Measured per player rather than against a fixed date, so someone who missed
 * a fortnight is compared with how they last played, not penalised for the
 * gap.
 */
export function mostImproved(
  history: ReadonlyMap<number, PlayerRatingHistory>,
  window = 4,
): ImprovedPlayer[] {
  const improved: ImprovedPlayer[] = [];

  for (const [playerId, entry] of history) {
    const points = entry.points;
    if (points.length < MIN_SESSIONS_FOR_IMPROVEMENT) continue;

    const latest = points[points.length - 1];
    const start = points[Math.max(0, points.length - 1 - window)];
    const gain = latest.rating - start.rating;
    if (gain <= 0) continue;

    improved.push({
      playerId,
      gain,
      from: start.rating,
      to: latest.rating,
      sessions: points.length - 1 - points.indexOf(start),
    });
  }

  return improved.sort((a, b) => b.gain - a.gain);
}
