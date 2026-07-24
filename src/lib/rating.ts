/**
 * Overall player rating — one 0-100 number blending everything a player does,
 * used to rank the leaderboard and to decide the season MVP.
 *
 * Three problems have to be solved for the number to mean anything:
 *
 * 1. **Different units.** Goals, win %, and points aren't comparable. Every
 *    metric is normalised against the best player in the same season, so each
 *    one contributes 0..1 of its weight and the season's leader in a category
 *    scores full marks for it.
 *
 * 2. **Volume vs. rate.** Counting stats (goals, points, matchdays) reward
 *    turning up every week; per-match rates reward being good in the games you
 *    do play. Both are included, deliberately, so neither the ever-present
 *    plodder nor the one-game hotshot can run away with it.
 *
 * 3. **Small samples.** Someone who scored 2 goals in their only match has a
 *    2.00 goals/match rate that no regular can touch. Rate metrics are
 *    therefore shrunk toward the league average with a Bayesian prior worth
 *    `PRIOR_MATCHES` matches — play more, and your own numbers take over.
 *
 * Weights sum to 100. Match MVPs carry the single largest share: it's the one
 * input that comes from people who actually watched the game, rather than from
 * arithmetic on the scoresheet.
 */
import type { PlayerStats } from "@/lib/stats";

/**
 * Strength of the league-average prior on rate metrics, in matches. At 3, a
 * player's own rate is half the story once they've played 3 matches, and
 * dominates by 10 or so.
 */
export const PRIOR_MATCHES = 3;

type MetricKind =
  /** A running total; used as-is. */
  | "total"
  /** A per-match rate; shrunk toward the league average before comparison. */
  | "rate";

type Metric = {
  key: string;
  label: string;
  /** Percentage points of the final rating. All weights sum to 100. */
  weight: number;
  kind: MetricKind;
  /** Short reason this metric is weighted the way it is — surfaced in tooltips. */
  why: string;
  value: (s: PlayerStats) => number;
  /**
   * For rate metrics: the count and the denominator the rate came from, so the
   * league-average prior can be applied to the underlying numbers.
   */
  numerator?: (s: PlayerStats) => number;
  denominator?: (s: PlayerStats) => number;
};

export const METRICS: readonly Metric[] = [
  {
    key: "mvps",
    label: "Match MVPs",
    weight: 20,
    kind: "total",
    why: "The only human judgement in the formula, so it carries the most weight.",
    value: (s) => s.mvps,
  },
  {
    key: "goalContributions",
    label: "Goals + assists",
    weight: 14,
    kind: "total",
    why: "Best single measure of attacking output — a goal and an assist count the same.",
    value: (s) => s.goalContributions,
  },
  {
    key: "winRate",
    label: "Win %",
    weight: 13,
    kind: "rate",
    why: "Winning matters, but as a rate so it doesn't just reward turning up often.",
    value: (s) => s.winRate,
    numerator: (s) => s.wins,
    denominator: (s) => s.matchesPlayed,
  },
  {
    key: "points",
    label: "Points",
    weight: 12,
    kind: "total",
    why: "3 for a win, 1 for a draw — rewards a long season of good results.",
    value: (s) => s.points,
  },
  {
    key: "goalsPerMatch",
    label: "Goals per match",
    weight: 11,
    kind: "rate",
    why: "Scoring form, independent of how many games you played.",
    value: (s) => s.goalsPerMatch,
    numerator: (s) => s.goals,
    denominator: (s) => s.matchesPlayed,
  },
  {
    key: "goals",
    label: "Goals",
    weight: 10,
    kind: "total",
    why: "Raw goals still count — the season's top scorer should feel it here.",
    value: (s) => s.goals,
  },
  {
    key: "assistsPerMatch",
    label: "Assists per match",
    weight: 9,
    kind: "rate",
    why: "Creating chances, weighted a little under scoring them.",
    value: (s) => s.assistsPerMatch,
    numerator: (s) => s.assists,
    denominator: (s) => s.matchesPlayed,
  },
  {
    key: "wins",
    label: "Wins",
    weight: 6,
    kind: "total",
    why: "Kept low on purpose — it overlaps points, and wins depend on teammates.",
    value: (s) => s.wins,
  },
  {
    key: "gamesPlayed",
    label: "Matchdays",
    weight: 5,
    kind: "total",
    why: "Showing up week after week is worth something, but it can't carry a rating.",
    value: (s) => s.gamesPlayed,
  },
];

export type RatingComponent = {
  key: string;
  label: string;
  weight: number;
  /** The player's value for this metric (shrunk, for rate metrics). */
  value: number;
  /** 0..1 against the season's best in this metric. */
  normalized: number;
  /** `weight * normalized` — how much of the final rating came from here. */
  points: number;
};

export type PlayerRating = {
  playerId: number;
  /** 0..100. */
  rating: number;
  components: RatingComponent[];
};

export type RatingInput = PlayerStats & { playerId: number };

/**
 * League-average rate across everyone who played, used as the prior. Pooling
 * the numerators and denominators (rather than averaging each player's rate)
 * keeps a one-match cameo from dragging the average around.
 */
function poolRate(
  players: readonly RatingInput[],
  numerator: (s: PlayerStats) => number,
  denominator: (s: PlayerStats) => number,
): number {
  let top = 0;
  let bottom = 0;
  for (const p of players) {
    top += numerator(p);
    bottom += denominator(p);
  }
  return bottom > 0 ? top / bottom : 0;
}

/** The player's rate pulled toward `prior`, by an amount that fades as they play more. */
function shrink(value: number, weightOfEvidence: number, prior: number): number {
  return (value + prior * PRIOR_MATCHES) / (weightOfEvidence + PRIOR_MATCHES);
}

/**
 * Rates every player against the rest of the same pool. Players who haven't
 * finished a match are rated 0 — there's nothing to judge them on yet.
 *
 * Pass the whole season at once: the normalisation and the league-average prior
 * are both relative to the players given here.
 */
export function ratePlayers(players: readonly RatingInput[]): Map<number, PlayerRating> {
  const qualified = players.filter((p) => p.matchesPlayed > 0);

  // Per metric: each qualified player's value, then the pool's best.
  const valuesByMetric = new Map<string, Map<number, number>>();
  const maxByMetric = new Map<string, number>();

  for (const metric of METRICS) {
    const prior =
      metric.kind === "rate" && metric.numerator && metric.denominator
        ? poolRate(qualified, metric.numerator, metric.denominator)
        : 0;

    const values = new Map<number, number>();
    let max = 0;
    for (const player of qualified) {
      const value =
        metric.kind === "rate" && metric.numerator
          ? shrink(metric.numerator(player), player.matchesPlayed, prior)
          : metric.value(player);
      values.set(player.playerId, value);
      if (value > max) max = value;
    }
    valuesByMetric.set(metric.key, values);
    maxByMetric.set(metric.key, max);
  }

  const ratings = new Map<number, PlayerRating>();

  for (const player of players) {
    if (player.matchesPlayed === 0) {
      ratings.set(player.playerId, {
        playerId: player.playerId,
        rating: 0,
        components: METRICS.map((m) => ({
          key: m.key,
          label: m.label,
          weight: m.weight,
          value: 0,
          normalized: 0,
          points: 0,
        })),
      });
      continue;
    }

    const components: RatingComponent[] = METRICS.map((metric) => {
      const value = valuesByMetric.get(metric.key)!.get(player.playerId) ?? 0;
      const max = maxByMetric.get(metric.key) ?? 0;
      const normalized = max > 0 ? value / max : 0;
      return {
        key: metric.key,
        label: metric.label,
        weight: metric.weight,
        value,
        normalized,
        points: metric.weight * normalized,
      };
    });

    ratings.set(player.playerId, {
      playerId: player.playerId,
      rating: components.reduce((sum, c) => sum + c.points, 0),
      components,
    });
  }

  return ratings;
}

/** "82.4" — one decimal is enough to break ties without looking spuriously precise. */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}
