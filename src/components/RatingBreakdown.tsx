import { Box, Group, Stack, Text } from "@mantine/core";
import { formatRating, type RatingComponent } from "@/lib/rating";

/**
 * The rating, plus where every point of it came from. Each row's bar shows how
 * close the player is to the season's best in that metric, and the number on
 * the right is what it contributed out of that metric's weight.
 *
 * Shown in full rather than as a bare score on purpose: a single blended number
 * invites "why am I below him?", and this answers it without anyone asking.
 */
export function RatingBreakdown({
  rating,
  components,
  rank,
  fieldSize,
}: {
  rating: number;
  components: RatingComponent[];
  /** 1-based position in the season, if known. */
  rank?: number | null;
  /** How many players are ranked, for "3rd of 14". */
  fieldSize?: number | null;
}) {
  const ordered = [...components].sort((a, b) => b.weight - a.weight);

  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 14,
        background: "var(--panel)",
        padding: "16px 18px",
      }}
    >
      <Group justify="space-between" align="flex-end" wrap="nowrap" mb={14}>
        <Box>
          <Text fw={700} fz={10} c="dimmed" style={{ letterSpacing: "0.14em" }}>
            OVERALL RATING
          </Text>
          {rank != null && (
            <Text fz={12} c="dimmed" mt={4}>
              #{rank}
              {fieldSize ? ` of ${fieldSize}` : ""} this season
            </Text>
          )}
        </Box>
        <Group gap={4} align="flex-end" wrap="nowrap">
          <Text
            className="display-face tabular-nums"
            fw={900}
            fz={40}
            style={{ lineHeight: 0.85, color: "var(--volt)" }}
          >
            {formatRating(rating)}
          </Text>
          <Text c="dimmed" fw={700} fz={12} style={{ paddingBottom: 3 }}>
            /100
          </Text>
        </Group>
      </Group>

      <Stack gap={9}>
        {ordered.map((c) => (
          <Box key={c.key}>
            <Group justify="space-between" wrap="nowrap" gap="xs" mb={3}>
              <Text fz={12} fw={600} truncate>
                {c.label}
                <Text span fz={10} c="dimmed" fw={500}>
                  {" "}
                  {c.weight}%
                </Text>
              </Text>
              <Text className="tabular-nums" fz={12} fw={700} c="dimmed" style={{ flexShrink: 0 }}>
                +{c.points.toFixed(1)}
              </Text>
            </Group>
            {/* Bar length = share of the season's best in this metric. */}
            <Box
              style={{
                height: 5,
                borderRadius: 3,
                background: "var(--panel-raised)",
                overflow: "hidden",
              }}
            >
              <Box
                style={{
                  height: "100%",
                  width: `${Math.round(c.normalized * 100)}%`,
                  borderRadius: 3,
                  background: "var(--team-blue)",
                }}
              />
            </Box>
          </Box>
        ))}
      </Stack>

      <Text fz={11} c="dimmed" mt={12}>
        Bars show how close you are to the season&apos;s best in each stat. Everything here is
        earned on the pitch — MVP awards don&apos;t count toward the rating.
      </Text>
    </Box>
  );
}
