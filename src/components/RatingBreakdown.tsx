import { Box, Group, Stack, Text } from "@mantine/core";
import { formatRating, type RatingComponent } from "@/lib/rating";

/**
 * The rating, plus where every point of it came from.
 *
 * Shown in full rather than as a bare score on purpose: a single blended number
 * invites "why am I below him?", and this answers it without anyone asking.
 *
 * Two things make it readable that the obvious version doesn't:
 *
 * 1. **Each track is as long as the metric is worth.** Drawing every bar
 *    full-width and printing "18%" beside the label hid the one thing that
 *    decides how much a stat matters, and made eight rows look interchangeable.
 *    Goals + assists is worth 18 and gets a track three times the length of
 *    Matchdays' 6, so the panel's shape *is* the weighting.
 * 2. **The fill is what you actually earned**, so a long track left mostly
 *    empty is the row costing you the most — the single most useful thing on
 *    the panel, and previously the hardest to spot, since a top player's bars
 *    were all near-full and equal-length.
 *
 * The summary bar above the rows is the same information totalled: your score
 * built out of its parts, with the gap to 100 left visible.
 */

/** Anything this close to the season's best is treated as full marks. */
const FULL_MARKS = 0.999;

function TrackRow({ component, maxWeight }: { component: RatingComponent; maxWeight: number }) {
  const best = component.normalized >= FULL_MARKS;
  // Track length relative to the heaviest metric; fill relative to the track.
  const trackPct = (component.weight / maxWeight) * 100;
  const fillPct = Math.round(component.normalized * 100);

  return (
    <Box>
      <Group justify="space-between" wrap="nowrap" gap="xs" mb={4}>
        <Text fz={12} fw={600} truncate>
          {component.label}
        </Text>
        <Text className="tabular-nums" fz={12} fw={700} style={{ flexShrink: 0 }}>
          <Text span c={best ? undefined : "dimmed"} style={best ? { color: "var(--volt)" } : undefined}>
            {component.points.toFixed(1)}
          </Text>
          {/* The denominator is the point: "12.9" alone says nothing about
              whether that's most of what was on offer or a fraction of it. */}
          <Text span c="dimmed" fw={500} fz={10}>
            {" "}
            / {component.weight}
          </Text>
        </Text>
      </Group>

      <Box style={{ width: `${trackPct}%` }}>
        <Box
          style={{
            height: 6,
            borderRadius: 3,
            background: "var(--panel-raised)",
            overflow: "hidden",
          }}
        >
          <Box
            style={{
              height: "100%",
              width: `${fillPct}%`,
              borderRadius: 3,
              // Volt means "nobody in the season beat you at this" — worth
              // calling out, and it's the only place the accent is earned.
              background: best ? "var(--volt)" : "var(--team-blue)",
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

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
  // Heaviest first, so the tracks step down and the ordering reads as
  // deliberate rather than arbitrary.
  const ordered = [...components].sort((a, b) => b.weight - a.weight);
  const maxWeight = ordered[0]?.weight ?? 1;
  const bestCount = ordered.filter((c) => c.normalized >= FULL_MARKS).length;

  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 14,
        background: "var(--panel)",
        padding: "16px 18px",
      }}
    >
      <Group justify="space-between" align="flex-end" wrap="nowrap" mb={12}>
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

      {/* Composition bar: the score assembled from its parts, out of 100. The
          hairline gaps separate the segments without needing a legend — the
          rows below name them in the same order. */}
      <Box
        style={{
          display: "flex",
          gap: 1,
          height: 10,
          borderRadius: 5,
          overflow: "hidden",
          background: "var(--panel-raised)",
          marginBottom: 16,
        }}
      >
        {ordered.map((c) => (
          <Box
            key={c.key}
            title={`${c.label}: ${c.points.toFixed(1)} of ${c.weight}`}
            style={{
              width: `${c.points}%`,
              background: c.normalized >= FULL_MARKS ? "var(--volt)" : "var(--team-blue)",
            }}
          />
        ))}
      </Box>

      <Stack gap={11}>
        {ordered.map((c) => (
          <TrackRow key={c.key} component={c} maxWeight={maxWeight} />
        ))}
      </Stack>

      <Text fz={11} c="dimmed" mt={14} style={{ lineHeight: 1.5 }}>
        Each bar is as long as that stat is worth, and filled by how close you are to the
        season&apos;s best at it.{" "}
        {bestCount > 0 && (
          <Text span style={{ color: "var(--volt)" }} fw={600}>
            Volt means nobody beat you at it.{" "}
          </Text>
        )}
        Everything here is earned on the pitch — MVP awards don&apos;t count toward the rating.
      </Text>
    </Box>
  );
}
