"use client";

import { Tooltip } from "@mantine/core";

/**
 * Explains a stat column on hover, focus, or tap. Client-side because Mantine's
 * Tooltip is interactive — the tables that use it stay server-rendered.
 *
 * `touch: true` matters here: the leaderboard is read on phones more than
 * anywhere else, and a hover-only tooltip would be invisible there.
 */
export function StatTooltip({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Tooltip
      label={label}
      withArrow
      multiline
      w={230}
      openDelay={120}
      events={{ hover: true, focus: true, touch: true }}
      styles={{ tooltip: { fontSize: 12, fontWeight: 500, lineHeight: 1.45, whiteSpace: "normal" } }}
    >
      <span
        tabIndex={0}
        style={{
          cursor: "help",
          // Dotted underline is the conventional "there's an explanation here"
          // affordance, and survives the uppercase/letter-spaced header styling.
          borderBottom: "1px dotted currentColor",
          paddingBottom: 1,
        }}
      >
        {children}
      </span>
    </Tooltip>
  );
}
