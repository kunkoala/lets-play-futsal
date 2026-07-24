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

// Real (non-flat) 10-shade ramps for the awards/leaderboard "trophy" palette,
// so light/filled/outline Mantine variants all look correct — unlike the
// flat team colors above, these need genuine light-to-dark gradation.
const gold: MantineColorsTuple = [
  "#fff9e0", "#fff0bf", "#ffe28a", "#ffd452",
  "#ffc824", "#ffbf00", "#f2ad00", "#d69600",
  "#bd8300", "#a37000",
];
const silver: MantineColorsTuple = [
  "#f8f9fb", "#eef0f2", "#e1e4e8", "#ced3d9",
  "#b7bec7", "#9aa3ad", "#828b96", "#6b7480",
  "#565e68", "#414951",
];
const bronze: MantineColorsTuple = [
  "#fdf1e7", "#f8dcc3", "#f0c298", "#e8a66e",
  "#dd8f4f", "#cb7a3d", "#b06732", "#935528",
  "#78441f", "#603518",
];

export const theme = createTheme({
  primaryColor: "teal",
  fontFamily: "var(--font-geist-sans), sans-serif",
  headings: {
    fontFamily: "var(--font-geist-sans), sans-serif",
    fontWeight: "800",
  },
  defaultRadius: "md",
  colors: {
    teamRed,
    teamBlue,
    teamGreen,
    teamYellow,
    teamPurple,
    gold,
    silver,
    bronze,
  },
});
