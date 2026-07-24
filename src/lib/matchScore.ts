/** Derives a match's score from its goal events — there is no stored score column (PLAN.md §3). */
export function computeScore(
  events: readonly { teamId: number }[],
  homeTeamId: number,
  awayTeamId: number,
): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const e of events) {
    if (e.teamId === homeTeamId) home++;
    else if (e.teamId === awayTeamId) away++;
  }
  return { home, away };
}
