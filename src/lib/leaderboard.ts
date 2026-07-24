import { prisma } from "@/lib/prisma";
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

/**
 * Per-season leaderboard aggregates, computed at request time from completed
 * sessions' goal events and team rosters — see PLAN.md §3/§8. No stored
 * score/win/loss/stat columns; everything here is derived.
 *
 * Sessions and matches are walked oldest-first so the rolling form guide in
 * `PlayerTotals.form` ends up holding the *latest* five results.
 */
export async function getSeasonLeaderboard(seasonId: number): Promise<PlayerSeasonStats[]> {
  const sessions = await prisma.session.findMany({
    where: { seasonId, status: "completed" },
    include: {
      attendances: true,
      teams: { include: { players: true } },
      matches: { include: { goalEvents: true }, orderBy: { seq: "asc" } },
    },
    orderBy: { date: "asc" },
  });

  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });
  const totals = new Map<number, PlayerTotals>();
  for (const p of players) totals.set(p.id, emptyTotals());

  for (const session of sessions) {
    for (const a of session.attendances) {
      const t = totals.get(a.playerId);
      if (t) t.gamesPlayed += 1;
    }

    // playerId -> whether the shuffle put them in goal for their team today.
    const rosters = new Map<number, { playerId: number; isKeeper: boolean }[]>();
    for (const team of session.teams) {
      rosters.set(
        team.id,
        team.players.map((tp) => ({ playerId: tp.playerId, isKeeper: tp.isKeeper })),
      );
    }

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

export async function getActiveSeason() {
  return prisma.season.findFirst({ where: { isActive: true } });
}

export async function getAllSeasons() {
  return prisma.season.findMany({ orderBy: { startsOn: "desc" } });
}
