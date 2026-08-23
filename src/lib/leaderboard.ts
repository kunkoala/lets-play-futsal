import { prisma } from "@/lib/prisma";
import { aggregateSeason } from "@/lib/seasonAggregate";
import { buildRatingHistory, movementsFrom, type PlayerRatingHistory } from "@/lib/ratingHistory";

// Re-exported so the many pages importing it from here keep working; the type
// and the arithmetic now live with the source-agnostic aggregator.
export type { PlayerSeasonStats } from "@/lib/seasonAggregate";

/**
 * Per-season leaderboard aggregates, computed at request time from completed
 * sessions' goal events and team rosters — see PLAN.md §3/§8. No stored
 * score/win/loss/stat columns; everything here is derived.
 *
 * Sessions and matches are walked oldest-first so the rolling form guide in
 * `PlayerTotals.form` ends up holding the *latest* five results.
 */
/**
 * Everything the season's derivations need, oldest matchday first — shared by
 * the standings and the session-by-session history so the two can't disagree
 * about what a season contains.
 */
async function completedSeason(seasonId: number) {
  const sessions = await prisma.session.findMany({
    where: { seasonId, status: "completed" },
    include: {
      attendances: true,
      teams: { include: { players: true } },
      // `lineup` rather than the team rosters is what the stats come from —
      // see the MatchPlayer comment in prisma/schema.prisma.
      matches: {
        include: { goalEvents: true, lineup: true },
        orderBy: { seq: "asc" },
      },
    },
    orderBy: { date: "asc" },
  });

  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });

  return { sessions, players };
}

export async function getSeasonLeaderboard(seasonId: number) {
  const { sessions, players } = await completedSeason(seasonId);
  return aggregateSeason(sessions, players);
}

/**
 * Per-player rating and rank at every point in the season, replayed rather
 * than stored — see src/lib/ratingHistory.ts for why.
 */
export async function getSeasonRatingHistory(
  seasonId: number,
): Promise<Map<number, PlayerRatingHistory>> {
  const { sessions, players } = await completedSeason(seasonId);
  return buildRatingHistory(sessions, players);
}

/** Rank/rating change since the previous matchday, for the leaderboard arrows. */
export async function getSeasonMovements(seasonId: number) {
  return movementsFrom(await getSeasonRatingHistory(seasonId));
}

export async function getActiveSeason() {
  return prisma.season.findFirst({ where: { isActive: true } });
}

export async function getAllSeasons() {
  return prisma.season.findMany({ orderBy: { startsOn: "desc" } });
}
