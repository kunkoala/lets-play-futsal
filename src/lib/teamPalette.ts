/**
 * Fixed name/color pairs assigned to shuffled teams, in order (PLAN.md §6,
 * refined by the design handoff to brighter tones that read on the dark base).
 * `gradientDark` is the darker partner used for the live-console split-court
 * halves. Beyond 5 teams (an edge case for this club's scale) we fall back to a
 * numbered gray team rather than crash.
 */
export type TeamPaletteEntry = {
  name: string;
  color: string;
  gradientDark: string;
};

export const TEAM_PALETTE: readonly TeamPaletteEntry[] = [
  { name: "Red", color: "#FF4D57", gradientDark: "#C41F2B" },
  { name: "Blue", color: "#4D8BFF", gradientDark: "#1E56C9" },
  { name: "Green", color: "#2FD06A", gradientDark: "#149B47" },
  { name: "Yellow", color: "#FFCB2B", gradientDark: "#E0A800" },
  { name: "Purple", color: "#B06BFF", gradientDark: "#7E3FD1" },
];

export function paletteFor(index: number): TeamPaletteEntry {
  return (
    TEAM_PALETTE[index] ?? {
      name: `Team ${index + 1}`,
      color: "#9ca3af",
      gradientDark: "#6b7280",
    }
  );
}

/**
 * The darker gradient partner for a stored team color hex (case-insensitive).
 * Teams store the refined base hex; this returns its split-court partner, or a
 * dimmed fallback for unknown colors.
 */
export function gradientDarkFor(color: string): string {
  const hit = TEAM_PALETTE.find(
    (t) => t.color.toLowerCase() === color.toLowerCase(),
  );
  return hit?.gradientDark ?? "#6b7280";
}
