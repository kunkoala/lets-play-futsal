/**
 * Pure player-stat derivations.
 *
 * Nothing here touches the database. `leaderboard.ts` and `playerProfile.ts`
 * both walk finished matches and hand each one to `applyMatch`, then call
 * `withRates` at the end — so a player's numbers are computed the same way
 * whichever page you're looking at, and the whole lot stays derived from goal
 * events (PLAN.md §3) rather than stored in columns.
 *
 * Vocabulary, since the app uses both words:
 * - **matchday** (`gamesPlayed`): a session you turned up to.
 * - **match** (`matchesPlayed`): one game within a matchday. All per-match
 *   rates below divide by this, so "0.8 G/M" means goals per actual game.
 */

/** Result of a single match from one player's point of view. */
export type MatchResult = "W" | "D" | "L";

/** How many recent matches the form guide keeps. */
export const FORM_LIMIT = 5;

export type PlayerTotals = {
  goals: number;
  assists: number;
  wins: number;
  draws: number;
  losses: number;
  /** Sessions attended. */
  gamesPlayed: number;
  /** Individual matches played within those sessions. */
  matchesPlayed: number;
  /** Matches where the player's team conceded nothing. */
  cleanSheets: number;
  /** Team goals for minus against, across matches played. */
  plusMinus: number;
  /** Matches with exactly 2 goals. */
  braces: number;
  /** Matches with 3 or more goals. */
  hatTricks: number;
  /**
   * Session MVPs won — one per matchday at most, awarded by the admin after
   * the last match. Accumulated by the caller's per-session loop rather than
   * by `applyMatch`, because it isn't a per-match fact. Purely decorative: it
   * is not an input to the rating (see rating.ts).
   */
  mvps: number;
  /** Matches spent in goal (only counts when the shuffle put them there). */
  keeperMatches: number;
  /** Goals let in while keeping. */
  keeperConceded: number;
  /** Clean sheets kept while in goal. */
  keeperCleanSheets: number;
  /** Last few results, oldest first — reads left-to-right like a league table. */
  form: MatchResult[];
};

export type PlayerRates = {
  /** Goals + assists: the "goal contributions" number. */
  goalContributions: number;
  /** 3 for a win, 1 for a draw. */
  points: number;
  pointsPerMatch: number;
  goalsPerMatch: number;
  assistsPerMatch: number;
  contributionsPerMatch: number;
  /** 0..1. */
  winRate: number;
  /** Goals let in per match spent in goal, or 0 if they've never kept. */
  concededPerKeeperMatch: number;
};

export type PlayerStats = PlayerTotals & PlayerRates;

export function emptyTotals(): PlayerTotals {
  return {
    goals: 0,
    assists: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gamesPlayed: 0,
    matchesPlayed: 0,
    cleanSheets: 0,
    plusMinus: 0,
    braces: 0,
    hatTricks: 0,
    mvps: 0,
    keeperMatches: 0,
    keeperConceded: 0,
    keeperCleanSheets: 0,
    form: [],
  };
}

/** One finished match, seen from a single player's side of the pitch. */
export type MatchContribution = {
  /** Goals this player's team scored (own goals included — they count on the scoreboard). */
  goalsFor: number;
  goalsAgainst: number;
  /** Goals credited to this player. */
  playerGoals: number;
  assists: number;
  /** Whether the shuffle put this player in goal for the team they played on. */
  keeper: boolean;
};

export function resultOf(goalsFor: number, goalsAgainst: number): MatchResult {
  if (goalsFor > goalsAgainst) return "W";
  if (goalsFor < goalsAgainst) return "L";
  return "D";
}

/**
 * Folds one finished match into a running total. Mutates `totals` — callers
 * accumulate into a per-player record inside a single pass.
 *
 * Call in chronological order (oldest match first): `form` is a rolling window
 * of the most recent results and depends on call order.
 */
export function applyMatch(totals: PlayerTotals, c: MatchContribution): void {
  totals.matchesPlayed += 1;
  totals.goals += c.playerGoals;
  totals.assists += c.assists;
  totals.plusMinus += c.goalsFor - c.goalsAgainst;

  if (c.goalsAgainst === 0) totals.cleanSheets += 1;
  if (c.playerGoals === 2) totals.braces += 1;
  if (c.playerGoals >= 3) totals.hatTricks += 1;

  if (c.keeper) {
    totals.keeperMatches += 1;
    totals.keeperConceded += c.goalsAgainst;
    if (c.goalsAgainst === 0) totals.keeperCleanSheets += 1;
  }

  const result = resultOf(c.goalsFor, c.goalsAgainst);
  if (result === "W") totals.wins += 1;
  else if (result === "D") totals.draws += 1;
  else totals.losses += 1;

  totals.form.push(result);
  if (totals.form.length > FORM_LIMIT) totals.form.shift();
}

function perMatch(value: number, matchesPlayed: number): number {
  return matchesPlayed > 0 ? value / matchesPlayed : 0;
}

export function deriveRates(t: PlayerTotals): PlayerRates {
  const goalContributions = t.goals + t.assists;
  const points = t.wins * 3 + t.draws;

  return {
    goalContributions,
    points,
    pointsPerMatch: perMatch(points, t.matchesPlayed),
    goalsPerMatch: perMatch(t.goals, t.matchesPlayed),
    assistsPerMatch: perMatch(t.assists, t.matchesPlayed),
    contributionsPerMatch: perMatch(goalContributions, t.matchesPlayed),
    winRate: perMatch(t.wins, t.matchesPlayed),
    concededPerKeeperMatch: perMatch(t.keeperConceded, t.keeperMatches),
  };
}

export function withRates(t: PlayerTotals): PlayerStats {
  return { ...t, ...deriveRates(t) };
}

/** "1.25", "0.80" — two decimals, for the per-match rate columns. */
export function formatRate(value: number): string {
  return value.toFixed(2);
}

/** "+7", "-3", "0" — plus/minus always carries its sign. */
export function formatPlusMinus(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
