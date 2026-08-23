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
import {
  aggregateSeason,
  type AggregateSession,
  type AggregatePlayer,
  type PlayerSeasonStats,
} from "@/lib/seasonAggregate";

/** A session plus the identity the history needs to label its points. */
export type HistorySession = AggregateSession & { id: number; date: Date };

/**
 * The metrics the leaderboard can be sorted by, and therefore the ones a
 * movement arrow can be shown against. Ranking every one of them costs a sort
 * per metric per session — trivial at this scale, and it means the arrow
 * always describes the column the table is actually ordered by, rather than
 * quietly reporting rating movement next to a goals ranking.
 */
export const MOVEMENT_FIELDS = [
  "rating",
  "goals",
  "assists",
  "goalContributions",
  "points",
  "wins",
  "winRate",
] as const;

export type MovementField = (typeof MOVEMENT_FIELDS)[number];

export type RatingPoint = {
  sessionId: number;
  date: Date;
  /** 0-100, relative to everyone who had played by this point in the season. */
  rating: number;
  /** 1-based standing in each sortable metric, as of this session. */
  ranks: Record<MovementField, number>;
  /** Season-to-date value behind each of those ranks. */
  values: Record<MovementField, number>;
  /** Goals scored in this session alone — what the per-session bar chart plots. */
  goalsThisSession: number;
};

export type PlayerRatingHistory = {
  playerId: number;
  /** Oldest first. Empty until the player has finished their first match. */
  points: RatingPoint[];
};

/**
 * Change since the previous session, in one metric. `null` for a player with
 * nothing to compare against — their first appearance is "NEW", not
 * "unchanged".
 */
export type RatingMovement = {
  /** Positive means the underlying number went up. */
  valueDelta: number;
  /**
   * Positive means the player climbed the table. Inverted from the raw rank
   * difference on purpose: rank 5 → 2 is +3 places, not -3.
   */
  rankDelta: number;
  previousRank: number;
  previousValue: number;
};

/**
 * Positional rank in one metric, matching how the leaderboard itself orders
 * rows: sort descending by value, and read off the index.
 *
 * `Array.prototype.sort` is stable and `standings` arrives in the players'
 * own order, so ties resolve the same way here as they do in the table — the
 * arrow can't disagree with the position the reader is looking at.
 */
function ranksFor(standings: readonly PlayerSeasonStats[], field: MovementField): Map<number, number> {
  const ordered = [...standings].sort((a, b) => b[field] - a[field]);
  const ranks = new Map<number, number>();
  ordered.forEach((player, index) => ranks.set(player.playerId, index + 1));
  return ranks;
}

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

    const ranksByField = new Map(
      MOVEMENT_FIELDS.map((field) => [field, ranksFor(standings, field)] as const),
    );

    for (const player of standings) {
      // A player with no finished match has nothing to be ranked on — their
      // rating is 0 and they would tie with everyone else who hasn't played.
      if (player.matchesPlayed === 0) continue;
      const entry = history.get(player.playerId);
      if (!entry) continue;

      const ranks = {} as Record<MovementField, number>;
      const values = {} as Record<MovementField, number>;
      for (const field of MOVEMENT_FIELDS) {
        ranks[field] = ranksByField.get(field)!.get(player.playerId)!;
        values[field] = player[field];
      }

      const before = goalsBefore.get(player.playerId) ?? 0;
      entry.points.push({
        sessionId: session.id,
        date: session.date,
        rating: player.rating,
        ranks,
        values,
        goalsThisSession: player.goals - before,
      });
      goalsBefore.set(player.playerId, player.goals);
    }
  }

  return history;
}

/** The last session's change for one player in one metric, or null if they have no previous one. */
export function movementOf(
  history: PlayerRatingHistory | undefined,
  field: MovementField = "rating",
): RatingMovement | null {
  const points = history?.points ?? [];
  if (points.length < 2) return null;

  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  return {
    valueDelta: latest.values[field] - previous.values[field],
    rankDelta: previous.ranks[field] - latest.ranks[field],
    previousRank: previous.ranks[field],
    previousValue: previous.values[field],
  };
}

/**
 * Movement since the previous session for every player, in every sortable
 * metric — `movements.get(playerId)?.goals` is that player's change in the
 * goals table.
 *
 * All fields at once rather than one per request: it is a few dozen players by
 * seven numbers, and it lets the leaderboard switch sort tabs without the
 * server having to know which one is active.
 */
export function movementsFrom(
  history: ReadonlyMap<number, PlayerRatingHistory>,
): Map<number, Record<MovementField, RatingMovement>> {
  const movements = new Map<number, Record<MovementField, RatingMovement>>();
  for (const [playerId, entry] of history) {
    if (entry.points.length < 2) continue;
    const byField = {} as Record<MovementField, RatingMovement>;
    for (const field of MOVEMENT_FIELDS) byField[field] = movementOf(entry, field)!;
    movements.set(playerId, byField);
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
 * ever match: a first rating is built on one matchday of results and swings
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
