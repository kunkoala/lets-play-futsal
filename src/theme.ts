import { createTheme, type MantineColorsTuple } from "@mantine/core";

/**
 * Team badge colors — the design handoff **refines** PLAN.md §6's raw values to
 * brighter tones that read on the dark base (Red #FF4D57, Blue #4D8BFF, …). The
 * shuffle assigns teams these colors in order (Red, Blue, Green, Yellow, Purple)
 * and stores the hex per team, so every shade in each tuple is pinned to the same
 * hex rather than a generated ramp — whichever shade index a component uses, it
 * renders as the exact brand hex. See src/lib/teamPalette.ts for the source list.
 *
 * Registered under distinct names (teamRed, …) rather than overriding Mantine's
 * built-in red/blue/etc, so Mantine's semantic colors are left untouched.
 */
function solid(hex: string): MantineColorsTuple {
  return [hex, hex, hex, hex, hex, hex, hex, hex, hex, hex];
}

const teamRed = solid("#FF4D57");
const teamBlue = solid("#4D8BFF");
const teamGreen = solid("#2FD06A");
const teamYellow = solid("#FFCB2B");
const teamPurple = solid("#B06BFF");

/**
 * Volt — the single brand accent (#C8FF2F): primary CTA, active tab, highlights,
 * top-scorer. It's a light color, so filled variants pair it with dark text via
 * `autoContrast`. Shade 5 is the on-brand base; darker shades ride toward the
 * gradient partner #8FDC12 for hovers/CTA gradients.
 */
const volt: MantineColorsTuple = [
  "#f9ffe6", "#f0ffc4", "#e4ff97", "#d8ff66",
  "#cfff41", "#C8FF2F", "#b4e820", "#8FDC12",
  "#77b80f", "#5f9309",
];

/**
 * Dark surface ramp — remapped so Mantine's dark-scheme variables land on the
 * handoff's exact tokens:
 *   text  = dark[0] #F4F5F7   body    = dark[7] #12141A (court night)
 *   dimmed= dark[2]           default = dark[6] #1B1E26 (panel / cards)
 *   border= dark[4] (hairline)  hover  = dark[5] #232732 (raised)
 *   deep chrome = dark[8] #0D0F14 / dark[9] #0A0B0E
 */
const dark: MantineColorsTuple = [
  "#F4F5F7", "#E3E4E8", "#9A9CA5", "#5C5F6B",
  "#2A2D36", "#232732", "#1B1E26", "#12141A",
  "#0D0F14", "#0A0B0E",
];

// Real 10-shade ramps for the awards "trophy" palette (need genuine gradation).
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
  primaryColor: "volt",
  primaryShade: { light: 5, dark: 5 },
  autoContrast: true,
  fontFamily: "var(--font-archivo), sans-serif",
  headings: {
    fontFamily: "var(--font-archivo-expanded), var(--font-archivo), sans-serif",
    fontWeight: "800",
  },
  defaultRadius: "md",
  // chips/rows 12 · cards 16 · frames/large cards 22 · pills use radius="xl"
  radius: {
    xs: "6px",
    sm: "10px",
    md: "12px",
    lg: "16px",
    xl: "22px",
  },
  colors: {
    dark,
    volt,
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
