/**
 * Season aggregation, independent of where the rows came from.
 *
 * The real leaderboard feeds this Prisma query results; the demo season
 * (src/lib/demoData.ts) feeds it generated objects. Both go through the same
 * arithmetic, so the demo genuinely demonstrates the production logic rather
 * than an approximation of it.
 *
 * Inputs are declared structurally — anything with the right fields fits,
 * which is why the Prisma results can be passed straight in.
 */
import { applyMatch, emptyTotals, withRates, type PlayerStats, type PlayerTotals } from "@/lib/stats";
import { ratePlayers, type RatingComponent } from "@/lib/rating";
import type { KeeperPref } from "@/lib/shuffle";

export type PlayerSeasonStats = PlayerStats & {
  playerId: number;
  name: string;
  keeperPref: KeeperPref;
  /** 0-100 overall rating, relative to everyone else in this season. */
  rating: number;
  /** What each weighted metric contributed to `rating`. */
  ratingComponents: RatingComponent[];
};

export type AggregatePlayer = {
  id: number;
  name: string;
  keeperPref: KeeperPref;
};

export type AggregateSession = {
  attendances: readonly { playerId: number }[];
  teams: readonly {
    id: number;
    players: readonly { playerId: number; isKeeper: boolean }[];
  }[];
  /** Ordered by `seq` ascending. */
  matches: readonly {
    homeTeamId: number;
    awayTeamId: number;
    status: string;
    mvpPlayerId: number | null;
    goalEvents: readonly {
      teamId: number;
      scorerId: number | null;
      assistId: number | null;
    }[];
  }[];
};

/**
 * Rolls completed sessions up into per-player season stats plus an overall
 * rating.
 *
 * `sessions` must be oldest-first and `matches` within them ordered by `seq`:
 * the form guide is a rolling window of the most recent results, so it depends
 * on the order matches are applied in.
 */
export function aggregateSeason(
  sessions: readonly AggregateSession[],
  players: readonly AggregatePlayer[],
): PlayerSeasonStats[] {
  const totals = new Map<number, PlayerTotals>();
  for (const p of players) totals.set(p.id, emptyTotals());

  for (const session of sessions) {
    for (const a of session.attendances) {
      const t = totals.get(a.playerId);
      if (t) t.gamesPlayed += 1;
    }

    const rosters = new Map<number, readonly { playerId: number; isKeeper: boolean }[]>();
    for (const team of session.teams) rosters.set(team.id, team.players);

    for (const match of session.matches) {
      if (match.status !== "finished") continue;
      const homeRoster = rosters.get(match.homeTeamId) ?? [];
      const awayRoster = rosters.get(match.awayTeamId) ?? [];

      let home = 0;
      let away = 0;
      const goals = new Map<number, number>();
      const assists = new Map<number, number>();
      for (const e of match.goalEvents) {
        if (e.teamId === match.homeTeamId) home++;
        else if (e.teamId === match.awayTeamId) away++;
        if (e.scorerId) goals.set(e.scorerId, (goals.get(e.scorerId) ?? 0) + 1);
        if (e.assistId) assists.set(e.assistId, (assists.get(e.assistId) ?? 0) + 1);
      }

      for (const [roster, goalsFor, goalsAgainst] of [
        [homeRoster, home, away],
        [awayRoster, away, home],
      ] as const) {
        for (const member of roster) {
          const t = totals.get(member.playerId);
          if (!t) continue;
          applyMatch(t, {
            goalsFor,
            goalsAgainst,
            playerGoals: goals.get(member.playerId) ?? 0,
            assists: assists.get(member.playerId) ?? 0,
            keeper: member.isKeeper,
            mvp: match.mvpPlayerId === member.playerId,
          });
        }
      }
    }
  }

  const rated = players.map((p) => ({
    ...withRates(totals.get(p.id)!),
    playerId: p.id,
    name: p.name,
    keeperPref: p.keeperPref,
  }));

  // Ratings are relative to the season's own pool, so they're computed once the
  // whole field is known rather than per player.
  const ratings = ratePlayers(rated);
  return rated.map((p) => {
    const rating = ratings.get(p.playerId);
    return {
      ...p,
      rating: rating?.rating ?? 0,
      ratingComponents: rating?.components ?? [],
    };
  });
}
