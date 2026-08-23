import { Box, Group, Text } from "@mantine/core";
import { formatRating } from "@/lib/rating";

/**
 * The rating, the position it earns, and which way it moved last matchday.
 *
 * Deliberately just those three things. This used to break the score down into
 * all eight weighted metrics with a bar each, which answered "why am I below
 * him?" but buried the only number anyone acts on. Three figures give a player
 * something to aim at — the rest is on the leaderboard, one tap away, for
 * whoever actually wants to audit the arithmetic.
 */
export function RatingCard({
  rating,
  rank,
  fieldSize,
  movement,
}: {
  rating: number;
  /** 1-based position in the season, if known. */
  rank?: number | null;
  /** How many players are ranked, for "3rd of 14". */
  fieldSize?: number | null;
  /** Change since the previous matchday; null on a player's first one. */
  movement?: { ratingDelta: number; rankDelta: number } | null;
}) {
  const up = movement != null && movement.ratingDelta >= 0;

  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 14,
        background: "var(--panel)",
        padding: "16px 18px",
      }}
    >
      <Group justify="space-between" align="flex-end" wrap="nowrap">
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

      {movement && (
        <Group
          justify="space-between"
          wrap="wrap"
          gap={8}
          mt={14}
          pt={12}
          style={{ borderTop: "1px solid var(--hairline)" }}
        >
          <Text fz={12} c="dimmed" fw={600}>
            Since last matchday
          </Text>
          <Text
            className="tabular-nums"
            fz={13}
            fw={800}
            style={{ color: up ? "var(--team-green)" : "var(--team-red, #ff5c5c)" }}
          >
            {up ? "▲" : "▼"} {formatRating(Math.abs(movement.ratingDelta))}
            {movement.rankDelta !== 0 && (
              <Text span fz={12} fw={700} c="dimmed">
                {" "}
                · {movement.rankDelta > 0 ? "up" : "down"} {Math.abs(movement.rankDelta)} place
                {Math.abs(movement.rankDelta) === 1 ? "" : "s"}
              </Text>
            )}
          </Text>
        </Group>
      )}
    </Box>
  );
}
