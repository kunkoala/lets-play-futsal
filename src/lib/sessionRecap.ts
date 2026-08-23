/**
 * One matchday's story, in the handful of numbers people actually ask about
 * afterwards: who scored most, who set up most, who kept it out, how the night
 * went overall.
 *
 * Same shape-in / shape-out contract as `seasonAggregate.ts` — declared
 * structurally so the Prisma query result and the generated demo season both
 * fit, and the demo can't quietly diverge from production.
 *
 * Ties are the normal case at this sample size (two players on two goals each
 * is a typical Sunday), so every leader is a *list* of names rather than a
 * single winner. Picking one arbitrarily would be wrong more often than right.
 */

export type RecapSession = {
  teams: readonly {
    id: number;
    players: readonly { isKeeper: boolean; player: { id: number; name: string } }[];
  }[];
  matches: readonly {
    status: string;
    homeTeamId: number;
    awayTeamId: number;
    goalEvents: readonly {
      teamId: number;
      scorer: { id: number; name: string } | null;
      assist: { id: number; name: string } | null;
    }[];
  }[];
};

/** A stat leader — plural because ties are shared, never broken arbitrarily. */
export type RecapLeader = {
  names: string[];
  value: number;
};

export type SessionRecap = {
  /** Finished matches only — an in-progress match has no result yet. */
  matchesPlayed: number;
  totalGoals: number;
  topScorer: RecapLeader | null;
  topAssister: RecapLeader | null;
  mostCleanSheets: RecapLeader | null;
  /** Biggest winning margin of the night, with the scoreline that produced it. */
  biggestWin: { margin: number; home: number; away: number } | null;
};

/** Everyone tied at the top, or null when nobody has any. */
function leaderOf(counts: ReadonlyMap<number, number>, nameOf: (id: number) => string): RecapLeader | null {
  let best = 0;
  for (const value of counts.values()) if (value > best) best = value;
  if (best === 0) return null;

  const names: string[] = [];
  for (const [id, value] of counts) if (value === best) names.push(nameOf(id));
  names.sort((a, b) => a.localeCompare(b));
  return { names, value: best };
}

export function summariseSession(session: RecapSession): SessionRecap {
  const nameById = new Map<number, string>();
  for (const team of session.teams) {
    for (const tp of team.players) nameById.set(tp.player.id, tp.player.name);
  }

  const rosters = new Map(session.teams.map((t) => [t.id, t.players]));

  const goals = new Map<number, number>();
  const assists = new Map<number, number>();
  const cleanSheets = new Map<number, number>();

  let matchesPlayed = 0;
  let totalGoals = 0;
  let biggestWin: SessionRecap["biggestWin"] = null;

  for (const match of session.matches) {
    if (match.status !== "finished") continue;
    matchesPlayed += 1;

    let home = 0;
    let away = 0;
    for (const event of match.goalEvents) {
      if (event.teamId === match.homeTeamId) home += 1;
      else if (event.teamId === match.awayTeamId) away += 1;

      // Own goals count on the scoreboard but have no scorer, which is why
      // totalGoals is counted from the events and not from these maps.
      if (event.scorer) {
        goals.set(event.scorer.id, (goals.get(event.scorer.id) ?? 0) + 1);
        nameById.set(event.scorer.id, event.scorer.name);
      }
      if (event.assist) {
        assists.set(event.assist.id, (assists.get(event.assist.id) ?? 0) + 1);
        nameById.set(event.assist.id, event.assist.name);
      }
    }

    totalGoals += home + away;

    // A clean sheet belongs to everyone who played, not just the keeper —
    // same rule the season leaderboard uses.
    for (const [teamId, conceded] of [
      [match.homeTeamId, away],
      [match.awayTeamId, home],
    ] as const) {
      if (conceded !== 0) continue;
      for (const tp of rosters.get(teamId) ?? []) {
        cleanSheets.set(tp.player.id, (cleanSheets.get(tp.player.id) ?? 0) + 1);
      }
    }

    const margin = Math.abs(home - away);
    if (margin > 0 && (biggestWin === null || margin > biggestWin.margin)) {
      biggestWin = { margin, home, away };
    }
  }

  const nameOf = (id: number) => nameById.get(id) ?? "Unknown";

  return {
    matchesPlayed,
    totalGoals,
    topScorer: leaderOf(goals, nameOf),
    topAssister: leaderOf(assists, nameOf),
    mostCleanSheets: leaderOf(cleanSheets, nameOf),
    biggestWin,
  };
}
