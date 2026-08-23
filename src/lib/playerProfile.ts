import { prisma } from "@/lib/prisma";
import { applyMatch, emptyTotals, withRates, type PlayerStats, type PlayerTotals } from "@/lib/stats";
import { deriveExtraSignals, type ExtraSignals } from "@/lib/achievements";
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
  /** Whether this player was the session MVP that day. */
  mvp: boolean;
};

export type PlayerProfile = {
  player: { id: number; name: string; isActive: boolean; keeperPref: KeeperPref };
  allTime: PlayerStats;
  activeSeason: PlayerStats | null;
  activeSeasonName: string | null;
  /** Newest matchday first. */
  sessionHistory: PlayerSessionHistoryRow[];
  /**
   * The achievement signals `PlayerStats` doesn't already cover (see
   * achievements.ts), derived across this player's whole career. The caller
   * combines this with `allTime` and a rating (this module doesn't compute
   * one — see players/[id]/page.tsx) to evaluate the full badge list.
   */
  extraSignals: ExtraSignals;
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
          matches: {
            include: { goalEvents: true, lineup: true },
            orderBy: { seq: "asc" },
          },
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

    // Session MVP is a matchday fact, so it's counted here rather than inside
    // the per-match loop below.
    const sessionMvp = session.mvpPlayerId === playerId;
    if (sessionMvp) {
      allTime.mvps += 1;
      if (inActiveSeason) thisSeason.mvps += 1;
    }

    // The team shown against this matchday is still the roster one — it's the
    // shirt they turned up in. Which side they played for in a given match
    // comes from that match's own lineup, since a substitution can move them.
    const team = session.teams.find((t) => t.players.some((tp) => tp.playerId === playerId)) ?? null;
    const teamById = new Map(session.teams.map((t) => [t.id, t]));

    const row: PlayerSessionHistoryRow = {
      sessionId: session.id,
      date: session.date,
      seasonId: session.seasonId,
      seasonName: session.season.name,
      team: team ? { id: team.id, name: team.name, color: team.color } : null,
      keeper: false,
      goals: 0,
      assists: 0,
      mvp: sessionMvp,
    };

    for (const match of session.matches) {
      if (match.status !== "finished") continue;
      const spot = match.lineup.find((m) => m.playerId === playerId);
      if (!spot) continue;

      const onHome = spot.teamId === match.homeTeamId;
      const onAway = spot.teamId === match.awayTeamId;
      if (!onHome && !onAway) continue;

      // Kept goal in at least one match that matchday — enough for the glove on
      // the matchday row, which isn't a per-match view.
      if (spot.isKeeper) row.keeper = true;

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

      const contribution = {
        goalsFor: onHome ? home : away,
        goalsAgainst: onHome ? away : home,
        playerGoals,
        assists,
        keeper: spot.isKeeper,
      };
      for (const totals of accumulators) applyMatch(totals, contribution);

      // A sub who moved teams mid-session shows the team they last played for.
      const playedFor = teamById.get(spot.teamId);
      if (playedFor && row.team?.id !== playedFor.id) {
        row.team = { id: playedFor.id, name: playedFor.name, color: playedFor.color };
      }

      row.goals += playerGoals;
      row.assists += assists;
    }

    history.push(row);
  }

  // Achievement derivation needs the same session/match/goalEvent shape this
  // function already fetched — reused as-is rather than re-queried.
  const extraSignals = deriveExtraSignals(
    attendances.map((a) => a.session),
    playerId,
  );

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
    extraSignals,
  };
}
