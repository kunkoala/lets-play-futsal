/**
 * Fixed name/color pairs assigned to shuffled teams, in order (PLAN.md §6).
 * Beyond 5 teams (an edge case for this club's scale) we fall back to a
 * numbered gray team rather than crash.
 */
export const TEAM_PALETTE: readonly { name: string; color: string }[] = [
  { name: "Red", color: "#ef4444" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Green", color: "#22c55e" },
  { name: "Yellow", color: "#eab308" },
  { name: "Purple", color: "#a855f7" },
];

export function paletteFor(index: number): { name: string; color: string } {
  return TEAM_PALETTE[index] ?? { name: `Team ${index + 1}`, color: "#9ca3af" };
}
