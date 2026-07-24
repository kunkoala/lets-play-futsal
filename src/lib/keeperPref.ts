import type { KeeperPref } from "@/lib/shuffle";

/** The glove marks whoever is actually in goal, on rosters and team cards. */
export const KEEPER_GLYPH = "🧤";

/**
 * Shared wording for the three goalkeeper preferences, so the player form, the
 * roster badges, and the shuffle preview all describe them the same way.
 * Ordered least to most committed.
 */
export const KEEPER_PREF_OPTIONS: {
  value: KeeperPref;
  label: string;
  hint: string;
}[] = [
  {
    value: "outfield",
    label: "Outfield only",
    hint: "Never put in goal by the shuffle.",
  },
  {
    value: "flexible",
    label: "Can keep if needed",
    hint: "Goes in goal only to cover a team with no dedicated keeper.",
  },
  {
    value: "goalkeeper",
    label: "Goalkeeper",
    hint: "Placed in goal first, one per team.",
  },
];

export function keeperPrefLabel(pref: KeeperPref): string {
  return KEEPER_PREF_OPTIONS.find((o) => o.value === pref)?.label ?? "Outfield only";
}

/** Short badge text for tables — full labels are too wide next to a name. */
export function keeperPrefBadge(pref: KeeperPref): string | null {
  if (pref === "goalkeeper") return `${KEEPER_GLYPH} GK`;
  if (pref === "flexible") return `${KEEPER_GLYPH} GK?`;
  return null;
}
