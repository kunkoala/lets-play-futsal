import { prisma } from "@/lib/prisma";
import { applyMatch, emptyTotals, withRates, type PlayerStats, type PlayerTotals } from "@/lib/stats";
import type { KeeperPref } from "@/lib/shuffle";

/** @deprecated Kept as an alias so older imports keep compiling — use `PlayerStats`. */
export type PlayerStatsTotals = PlayerStats;

export type PlayerSessionHistoryRow = {
  sessionId: number;
  date: Date;
  seasonId: number;
  seasonName: string;
  team: { id: number; name: string; color: string } | null;
  /** Whether the shuffle put this player in goal that day. */
  keeper: boolean;
  goals: number;
  assists: number;
  /** Man-of-the-match awards won across that day's matches. */
  mvps: number;
};

export type PlayerProfile = {
  player: { id: number; name: string; isActive: boolean; keeperPref: KeeperPref };
  allTime: PlayerStats;
  activeSeason: PlayerStats | null;
  activeSeasonName: string | null;
  /** Newest matchday first. */
  sessionHistory: PlayerSessionHistoryRow[];
};

/**
 * Everything the public player page shows, derived in a single chronological
 * walk over the completed sessions this player attended. Per-match arithmetic
 * lives in `src/lib/stats.ts`, shared with the season leaderboard, so both
 * pages agree on what a player's numbers are.
 */
export async function getPlayerProfile(playerId: number): Promise<PlayerProfile | null> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });

  // Oldest first: `applyMatch` keeps a rolling form window, so the most recent
  // results have to be applied last.
  const attendances = await prisma.attendance.findMany({
    where: { playerId, session: { status: "completed" } },
    include: {
      session: {
        include: {
          season: true,
          teams: { include: { players: true } },
          matches: { include: { goalEvents: true }, orderBy: { seq: "asc" } },
        },
      },
    },
    orderBy: { session: { date: "asc" } },
  });

  const allTime = emptyTotals();
  const thisSeason = emptyTotals();
  const history: PlayerSessionHistoryRow[] = [];

  for (const { session } of attendances) {
    const inActiveSeason = activeSeason !== null && session.seasonId === activeSeason.id;
    const accumulators: PlayerTotals[] = inActiveSeason ? [allTime, thisSeason] : [allTime];

    allTime.gamesPlayed += 1;
    if (inActiveSeason) thisSeason.gamesPlayed += 1;

    // The team this player was shuffled onto — absent if the session was
    // completed without them being rostered.
    const team = session.teams.find((t) => t.players.some((tp) => tp.playerId === playerId)) ?? null;
    const keeper = team?.players.find((tp) => tp.playerId === playerId)?.isKeeper ?? false;

    const row: PlayerSessionHistoryRow = {
      sessionId: session.id,
      date: session.date,
      seasonId: session.seasonId,
      seasonName: session.season.name,
      team: team ? { id: team.id, name: team.name, color: team.color } : null,
      keeper,
      goals: 0,
      assists: 0,
      mvps: 0,
    };

    for (const match of session.matches) {
      if (match.status !== "finished") continue;
      const onHome = team !== null && match.homeTeamId === team.id;
      const onAway = team !== null && match.awayTeamId === team.id;
      if (!onHome && !onAway) continue;

      let home = 0;
      let away = 0;
      let playerGoals = 0;
      let assists = 0;
      for (const e of match.goalEvents) {
        if (e.teamId === match.homeTeamId) home++;
        else if (e.teamId === match.awayTeamId) away++;
        if (e.scorerId === playerId) playerGoals += 1;
        if (e.assistId === playerId) assists += 1;
      }

      const mvp = match.mvpPlayerId === playerId;
      const contribution = {
        goalsFor: onHome ? home : away,
        goalsAgainst: onHome ? away : home,
        playerGoals,
        assists,
        keeper,
        mvp,
      };
      for (const totals of accumulators) applyMatch(totals, contribution);

      row.goals += playerGoals;
      row.assists += assists;
      if (mvp) row.mvps += 1;
    }

    history.push(row);
  }

  return {
    player: {
      id: player.id,
      name: player.name,
      isActive: player.isActive,
      keeperPref: player.keeperPref,
    },
    allTime: withRates(allTime),
    activeSeason: activeSeason ? withRates(thisSeason) : null,
    activeSeasonName: activeSeason?.name ?? null,
    sessionHistory: history.reverse(),
  };
}
