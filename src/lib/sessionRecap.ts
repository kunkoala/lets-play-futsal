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
  matches: readonly {
    status: string;
    homeTeamId: number;
    awayTeamId: number;
    /** Who was on the pitch — see MatchPlayer in prisma/schema.prisma. */
    lineup: readonly { teamId: number; player: { id: number; name: string } }[];
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

/** Everything one player did on the night, for the full session table. */
export type RecapPlayerLine = {
  playerId: number;
  name: string;
  /** Matches this player was actually in the lineup for. */
  matchesPlayed: number;
  goals: number;
  assists: number;
  /** Goals + assists — what the table sorts by. */
  contributions: number;
  cleanSheets: number;
  wins: number;
  draws: number;
  losses: number;
};

/** Top three in one stat, for the podium. Each place can hold several tied names. */
export type RecapPodiumPlace = {
  /** 1, 2 or 3 — shared by everyone tied at that value. */
  place: number;
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
  /** Top three scorers, ties sharing a place. */
  scorerPodium: RecapPodiumPlace[];
  /** Top three for assists, same shape. */
  assistPodium: RecapPodiumPlace[];
  /** Everyone who played, best contribution first. */
  players: RecapPlayerLine[];
};

/**
 * Top three values in one stat, with everyone tied at a value sharing that
 * place — so two players on 3 goals are joint first and the next player is
 * third, the way a podium actually works.
 *
 * Three *places*, not three names: a five-way tie for first is one place, not
 * a truncated list.
 */
function podiumOf(
  lines: readonly RecapPlayerLine[],
  value: (line: RecapPlayerLine) => number,
): RecapPodiumPlace[] {
  const byValue = new Map<number, string[]>();
  for (const line of lines) {
    const n = value(line);
    if (n <= 0) continue;
    const names = byValue.get(n);
    if (names) names.push(line.name);
    else byValue.set(n, [line.name]);
  }

  return [...byValue.entries()]
    .sort(([a], [b]) => b - a)
    .slice(0, 3)
    .map(([n, names], index) => ({
      place: index + 1,
      names: [...names].sort((a, b) => a.localeCompare(b)),
      value: n,
    }));
}

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
  for (const match of session.matches) {
    for (const spot of match.lineup) nameById.set(spot.player.id, spot.player.name);
  }

  const goals = new Map<number, number>();
  const assists = new Map<number, number>();
  const cleanSheets = new Map<number, number>();

  // One row per player, built up across the night for the full session table.
  const lines = new Map<number, RecapPlayerLine>();
  const lineFor = (id: number): RecapPlayerLine => {
    let line = lines.get(id);
    if (!line) {
      line = {
        playerId: id,
        name: nameById.get(id) ?? "Unknown",
        matchesPlayed: 0,
        goals: 0,
        assists: 0,
        contributions: 0,
        cleanSheets: 0,
        wins: 0,
        draws: 0,
        losses: 0,
      };
      lines.set(id, line);
    }
    return line;
  };

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
        const line = lineFor(event.scorer.id);
        line.goals += 1;
        line.contributions += 1;
      }
      if (event.assist) {
        assists.set(event.assist.id, (assists.get(event.assist.id) ?? 0) + 1);
        nameById.set(event.assist.id, event.assist.name);
        const line = lineFor(event.assist.id);
        line.assists += 1;
        line.contributions += 1;
      }
    }

    totalGoals += home + away;

    for (const spot of match.lineup) {
      const line = lineFor(spot.player.id);
      line.name = spot.player.name;
      line.matchesPlayed += 1;

      const onHome = spot.teamId === match.homeTeamId;
      const onAway = spot.teamId === match.awayTeamId;
      if (!onHome && !onAway) continue;

      const goalsFor = onHome ? home : away;
      const goalsAgainst = onHome ? away : home;
      if (goalsFor > goalsAgainst) line.wins += 1;
      else if (goalsFor < goalsAgainst) line.losses += 1;
      else line.draws += 1;

      // A clean sheet belongs to everyone who played, not just the keeper —
      // same rule the season leaderboard uses. Credited off this match's own
      // lineup, so a substitute gets the matches they were actually on for.
      if (goalsAgainst === 0) {
        line.cleanSheets += 1;
        cleanSheets.set(spot.player.id, (cleanSheets.get(spot.player.id) ?? 0) + 1);
      }
    }

    const margin = Math.abs(home - away);
    if (margin > 0 && (biggestWin === null || margin > biggestWin.margin)) {
      biggestWin = { margin, home, away };
    }
  }

  const nameOf = (id: number) => nameById.get(id) ?? "Unknown";

  // Contributions first, then goals as the tiebreak so a scorer outranks a
  // provider on the same total, then name so the order is stable.
  const players = [...lines.values()].sort(
    (a, b) =>
      b.contributions - a.contributions ||
      b.goals - a.goals ||
      a.name.localeCompare(b.name),
  );

  return {
    matchesPlayed,
    totalGoals,
    topScorer: leaderOf(goals, nameOf),
    topAssister: leaderOf(assists, nameOf),
    mostCleanSheets: leaderOf(cleanSheets, nameOf),
    biggestWin,
    scorerPodium: podiumOf(players, (p) => p.goals),
    assistPodium: podiumOf(players, (p) => p.assists),
    players,
  };
}
