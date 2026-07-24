import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/matchScore";

export type PlayerStatsTotals = {
  goals: number;
  assists: number;
  wins: number;
  draws: number;
  losses: number;
  matchesPlayed: number;
  gamesPlayed: number;
};

export type PlayerSessionHistoryRow = {
  sessionId: number;
  date: Date;
  seasonId: number;
  seasonName: string;
  team: { id: number; name: string; color: string } | null;
  goals: number;
  assists: number;
};

export type PlayerProfile = {
  player: { id: number; name: string; isActive: boolean };
  allTime: PlayerStatsTotals;
  activeSeason: PlayerStatsTotals | null;
  activeSeasonName: string | null;
  sessionHistory: PlayerSessionHistoryRow[];
};

function emptyTotals(): PlayerStatsTotals {
  return { goals: 0, assists: 0, wins: 0, draws: 0, losses: 0, matchesPlayed: 0, gamesPlayed: 0 };
}

export async function getPlayerProfile(playerId: number): Promise<PlayerProfile | null> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });

  const attendances = await prisma.attendance.findMany({
    where: { playerId, session: { status: "completed" } },
    include: { session: { include: { season: true } } },
    orderBy: { session: { date: "desc" } },
  });
  const sessionIds = attendances.map((a) => a.sessionId);

  const teamMemberships = await prisma.teamPlayer.findMany({
    where: { playerId, team: { sessionId: { in: sessionIds } } },
    include: { team: true },
  });
  const teamBySession = new Map<number, { id: number; name: string; color: string }>();
  for (const tm of teamMemberships) {
    teamBySession.set(tm.team.sessionId, { id: tm.team.id, name: tm.team.name, color: tm.team.color });
  }

  const events = await prisma.goalEvent.findMany({
    where: {
      OR: [{ scorerId: playerId }, { assistId: playerId }],
      match: { status: "finished", sessionId: { in: sessionIds } },
    },
    include: { match: true },
  });
  const goalsBySession = new Map<number, number>();
  const assistsBySession = new Map<number, number>();
  for (const e of events) {
    const sid = e.match.sessionId;
    if (e.scorerId === playerId) goalsBySession.set(sid, (goalsBySession.get(sid) ?? 0) + 1);
    if (e.assistId === playerId) assistsBySession.set(sid, (assistsBySession.get(sid) ?? 0) + 1);
  }

  const matches = await prisma.match.findMany({
    where: { status: "finished", sessionId: { in: sessionIds } },
    include: {
      goalEvents: true,
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
      session: { select: { seasonId: true } },
    },
  });

  const allTime = emptyTotals();
  const thisSeason = emptyTotals();
  allTime.gamesPlayed = attendances.length;
  thisSeason.gamesPlayed = attendances.filter((a) => a.session.seasonId === activeSeason?.id).length;
  for (const n of goalsBySession.values()) allTime.goals += n;
  for (const n of assistsBySession.values()) allTime.assists += n;
  for (const [sid, n] of goalsBySession) {
    const a = attendances.find((att) => att.sessionId === sid);
    if (a && a.session.seasonId === activeSeason?.id) thisSeason.goals += n;
  }
  for (const [sid, n] of assistsBySession) {
    const a = attendances.find((att) => att.sessionId === sid);
    if (a && a.session.seasonId === activeSeason?.id) thisSeason.assists += n;
  }

  for (const m of matches) {
    const onHome = m.homeTeam.players.some((tp) => tp.playerId === playerId);
    const onAway = m.awayTeam.players.some((tp) => tp.playerId === playerId);
    if (!onHome && !onAway) continue;

    const score = computeScore(m.goalEvents, m.homeTeamId, m.awayTeamId);
    const isDraw = score.home === score.away;
    const won = !isDraw && ((score.home > score.away && onHome) || (score.away > score.home && onAway));

    allTime.matchesPlayed += 1;
    if (isDraw) allTime.draws += 1;
    else if (won) allTime.wins += 1;
    else allTime.losses += 1;

    if (m.session.seasonId === activeSeason?.id) {
      thisSeason.matchesPlayed += 1;
      if (isDraw) thisSeason.draws += 1;
      else if (won) thisSeason.wins += 1;
      else thisSeason.losses += 1;
    }
  }

  const sessionHistory: PlayerSessionHistoryRow[] = attendances.map((a) => ({
    sessionId: a.sessionId,
    date: a.session.date,
    seasonId: a.session.seasonId,
    seasonName: a.session.season.name,
    team: teamBySession.get(a.sessionId) ?? null,
    goals: goalsBySession.get(a.sessionId) ?? 0,
    assists: assistsBySession.get(a.sessionId) ?? 0,
  }));

  return {
    player,
    allTime,
    activeSeason: activeSeason ? thisSeason : null,
    activeSeasonName: activeSeason?.name ?? null,
    sessionHistory,
  };
}
