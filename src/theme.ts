import { createTheme, type MantineColorsTuple } from "@mantine/core";

/**
 * Team badge colors (§6 of PLAN.md). These exact hex values are referenced by
 * later phases (shuffle assigns teams these colors in this order: Red, Blue,
 * Green, Yellow, Purple), so every shade in each tuple is pinned to the same
 * hex rather than a generated 10-step palette — whichever shade index a
 * component ends up using, it renders as the exact brand hex.
 *
 * These are registered under distinct names (teamRed, teamBlue, ...) rather
 * than overriding Mantine's built-in `red`/`blue`/etc, so Mantine's own
 * semantic colors (error states, info states, etc.) are left untouched.
 */
function solid(hex: string): MantineColorsTuple {
  return [hex, hex, hex, hex, hex, hex, hex, hex, hex, hex];
}

const teamRed = solid("#ef4444");
const teamBlue = solid("#3b82f6");
const teamGreen = solid("#22c55e");
const teamYellow = solid("#eab308");
const teamPurple = solid("#a855f7");

export const theme = createTheme({
  primaryColor: "teal",
  fontFamily: "var(--font-geist-sans), sans-serif",
  colors: {
    teamRed,
    teamBlue,
    teamGreen,
    teamYellow,
    teamPurple,
  },
});
