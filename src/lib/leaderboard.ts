import { prisma } from "@/lib/prisma";

export type PlayerSeasonStats = {
  playerId: number;
  name: string;
  goals: number;
  assists: number;
  wins: number;
  draws: number;
  losses: number;
  gamesPlayed: number;
  matchesPlayed: number;
  winRate: number; // 0..1, 0 if matchesPlayed is 0
};

/**
 * Per-season leaderboard aggregates, computed at request time from
 * completed sessions' goal events and team rosters — see PLAN.md §3/§8.
 * No stored score/win/loss/stat columns; everything here is derived.
 */
export async function getSeasonLeaderboard(seasonId: number): Promise<PlayerSeasonStats[]> {
  const sessions = await prisma.session.findMany({
    where: { seasonId, status: "completed" },
    include: {
      attendances: true,
      teams: { include: { players: true } },
      matches: { include: { goalEvents: true } },
    },
  });

  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });
  const stats = new Map<number, PlayerSeasonStats>();
  for (const p of players) {
    stats.set(p.id, {
      playerId: p.id,
      name: p.name,
      goals: 0,
      assists: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gamesPlayed: 0,
      matchesPlayed: 0,
      winRate: 0,
    });
  }

  for (const session of sessions) {
    for (const a of session.attendances) {
      const s = stats.get(a.playerId);
      if (s) s.gamesPlayed += 1;
    }

    const teamRoster = new Map<number, number[]>();
    for (const team of session.teams) {
      teamRoster.set(team.id, team.players.map((tp) => tp.playerId));
    }

    for (const match of session.matches) {
      if (match.status !== "finished") continue;
      const homeRoster = teamRoster.get(match.homeTeamId) ?? [];
      const awayRoster = teamRoster.get(match.awayTeamId) ?? [];

      for (const pid of [...homeRoster, ...awayRoster]) {
        const s = stats.get(pid);
        if (s) s.matchesPlayed += 1;
      }

      let home = 0;
      let away = 0;
      for (const e of match.goalEvents) {
        if (e.teamId === match.homeTeamId) home++;
        else if (e.teamId === match.awayTeamId) away++;
        if (e.scorerId) {
          const s = stats.get(e.scorerId);
          if (s) s.goals += 1;
        }
        if (e.assistId) {
          const s = stats.get(e.assistId);
          if (s) s.assists += 1;
        }
      }

      if (home > away) {
        for (const pid of homeRoster) stats.get(pid)!.wins += 1;
        for (const pid of awayRoster) stats.get(pid)!.losses += 1;
      } else if (away > home) {
        for (const pid of awayRoster) stats.get(pid)!.wins += 1;
        for (const pid of homeRoster) stats.get(pid)!.losses += 1;
      } else {
        for (const pid of [...homeRoster, ...awayRoster]) stats.get(pid)!.draws += 1;
      }
    }
  }

  for (const s of stats.values()) {
    s.winRate = s.matchesPlayed > 0 ? s.wins / s.matchesPlayed : 0;
  }

  return [...stats.values()];
}

export async function getActiveSeason() {
  return prisma.season.findFirst({ where: { isActive: true } });
}

export async function getAllSeasons() {
  return prisma.season.findMany({ orderBy: { startsOn: "desc" } });
}
