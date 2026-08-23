import { Box } from "@mantine/core";

/**
 * "GK" badge, in the one accent no team wears.
 *
 * Replaces a glove emoji. Emoji rendered as a flat coloured blob at this size
 * on most platforms, read as decoration rather than a label, and had no
 * legible off state — a dimmed glove and a lit one look the same at 13px.
 *
 * `active={false}` is for a control that *can* make someone the keeper but
 * hasn't: an outline instead of a fill, so both states are readable rather
 * than one being the other at lower opacity.
 */
export function KeeperChip({
  active = true,
  title,
}: {
  active?: boolean;
  /** Tooltip, when the chip is inside a button that explains itself. */
  title?: string;
}) {
  return (
    <Box
      component="span"
      title={title}
      aria-label={active ? "Goalkeeper" : "Not the goalkeeper"}
      style={{
        display: "inline-block",
        flexShrink: 0,
        padding: "1px 6px",
        borderRadius: 6,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.08em",
        lineHeight: 1.5,
        // Purple is the only accent not used by a team colour, so a keeper
        // badge can never be mistaken for a team dot.
        color: active ? "#150c22" : "var(--text-muted)",
        background: active ? "var(--team-purple)" : "transparent",
        border: `1px solid ${active ? "var(--team-purple)" : "var(--hairline)"}`,
      }}
    >
      GK
    </Box>
  );
}
