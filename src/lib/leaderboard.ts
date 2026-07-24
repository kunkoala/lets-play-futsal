import { prisma } from "@/lib/prisma";
import { aggregateSeason } from "@/lib/seasonAggregate";

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
export async function getSeasonLeaderboard(seasonId: number) {
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

  return aggregateSeason(sessions, players);
}

export async function getActiveSeason() {
  return prisma.season.findFirst({ where: { isActive: true } });
}

export async function getAllSeasons() {
  return prisma.season.findMany({ orderBy: { startsOn: "desc" } });
}
