import { Box, Container, Stack, Text } from "@mantine/core";
import type { PlayerSeasonStats } from "@/lib/leaderboard";
import { formatRating } from "@/lib/rating";
import { MvpSpotlight } from "./MvpSpotlight";
import { Podium } from "./Podium";

function top(
  stats: PlayerSeasonStats[],
  field: "goals" | "assists" | "wins" | "mvps" | "cleanSheets",
): { playerId: number; name: string; value: number }[] {
  return [...stats]
    .filter((s) => s[field] > 0)
    .sort((a, b) => b[field] - a[field])
    .slice(0, 3)
    .map((s) => ({ playerId: s.playerId, name: s.name, value: s[field] }));
}

/**
 * Season MVP standings: highest overall rating, which already folds in match
 * MVPs (20% of it) alongside goals, assists, points, win rate and appearances.
 * Only players who have finished a match are ranked.
 */
function ratingRanking(stats: PlayerSeasonStats[]): PlayerSeasonStats[] {
  return [...stats]
    .filter((s) => s.matchesPlayed > 0)
    .sort((a, b) => b.rating - a.rating);
}

/**
 * Season awards, rendered from data the caller supplies so `/awards` and
 * `/demo/awards` stay identical in behaviour.
 *
 * `adminPick` is the hand-picked season MVP when one has been recorded; it
 * overrides the rating-derived winner. The demo never passes one.
 */
export function AwardsView({
  stats,
  seasonName,
  adminPick = null,
  basePath = "",
}: {
  stats: PlayerSeasonStats[];
  seasonName: string;
  adminPick?: { id: number; name: string } | null;
  basePath?: string;
}) {
  const activeSeason = { name: seasonName };

  // Season MVP is the season's highest-rated player, unless an admin recorded a
  // hand-picked winner when closing the season — that overrides the rating.
  const ranking = ratingRanking(stats);
  const ratedWinner = ranking[0] ?? null;
  const seasonMvp = adminPick
    ? {
        player: adminPick,
        source: "admin" as const,
        subtitle: "Most valuable player",
        runnerUp: null,
        breakdown: null,
      }
    : ratedWinner
      ? {
          player: { id: ratedWinner.playerId, name: ratedWinner.name },
          source: "rating" as const,
          subtitle: `Rating ${formatRating(ratedWinner.rating)} / 100 · ${ratedWinner.mvps} match MVP${ratedWinner.mvps === 1 ? "" : "s"}`,
          runnerUp: ranking[1]
            ? { name: ranking[1].name, value: formatRating(ranking[1].rating) }
            : null,
          breakdown: ratedWinner.ratingComponents,
        }
      : null;

  return (
    <Container size="lg" py={{ base: 20, sm: 32 }} pb={64}>
      <Stack gap="xl">
        <Stack gap={4} align="center" className="fs-fade-up" ta="center">
          <Text
            fw={700}
            fz={10}
            c="dimmed"
            style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
          >
            {activeSeason.name}
          </Text>
          <Text
            component="h1"
            className="display-face"
            fw={900}
            fz={{ base: 30, sm: 40 }}
            style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
          >
            SEASON AWARDS
          </Text>
        </Stack>

        {seasonMvp && (
          <MvpSpotlight
            mvp={seasonMvp.player}
            seasonName={activeSeason.name}
            source={seasonMvp.source}
            subtitle={seasonMvp.subtitle}
            runnerUp={seasonMvp.runnerUp}
            breakdown={seasonMvp.breakdown}
            basePath={basePath}
          />
        )}

        <Box className="awards-grid fs-fade-up" style={{ animationDelay: "0.1s" }}>
          <Podium
            title="Top Scorer"
            glyph="⚽"
            unit="goals"
            items={top(stats, "goals")}
            accent="var(--volt)"
            basePath={basePath}
          />
          <Podium
            title="Top Assists"
            glyph="A"
            unit="assists"
            items={top(stats, "assists")}
            accent="var(--team-blue)"
            basePath={basePath}
          />
          <Podium
            title="Most Wins"
            glyph="🥇"
            unit="wins"
            items={top(stats, "wins")}
            accent="var(--team-green)"
            basePath={basePath}
          />
          <Podium
            title="Match MVPs"
            glyph="🏆"
            unit="MVPs"
            items={top(stats, "mvps")}
            accent="var(--team-yellow)"
            basePath={basePath}
          />
          <Podium
            title="Clean Sheets"
            glyph="🧤"
            unit="CS"
            items={top(stats, "cleanSheets")}
            accent="var(--team-purple)"
            basePath={basePath}
          />
        </Box>
      </Stack>
    </Container>
  );
}
