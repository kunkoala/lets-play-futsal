import { Group, Text } from "@mantine/core";
import type { MatchResult } from "@/lib/stats";

const RESULT_COLOR: Record<MatchResult, string> = {
  W: "var(--team-green)",
  D: "var(--team-yellow)",
  L: "var(--loss-red)",
};

/**
 * The last few results as colored pips, oldest on the left — the same reading
 * order as a league table's form column. Renders a dash when the player hasn't
 * finished a match yet.
 */
export function FormGuide({ form, size = 20 }: { form: MatchResult[]; size?: number }) {
  if (form.length === 0) {
    return (
      <Text c="dimmed" fz={13}>
        —
      </Text>
    );
  }

  return (
    <Group gap={4} wrap="nowrap" justify="center">
      {form.map((result, i) => (
        <span
          key={i}
          title={{ W: "Win", D: "Draw", L: "Loss" }[result]}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: size,
            height: size,
            borderRadius: "50%",
            fontSize: Math.round(size * 0.55),
            fontWeight: 800,
            color: "#0D0F14",
            background: RESULT_COLOR[result],
          }}
        >
          {result}
        </span>
      ))}
    </Group>
  );
}
