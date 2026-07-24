import { Box, Container, Stack, Text } from "@mantine/core";
import { getActiveSeason, getSeasonLeaderboard, type PlayerSeasonStats } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { MvpSpotlight } from "./MvpSpotlight";
import { Podium } from "./Podium";

function top(
  stats: PlayerSeasonStats[],
  field: "goals" | "assists" | "wins",
): { playerId: number; name: string; value: number }[] {
  return [...stats]
    .filter((s) => s[field] > 0)
    .sort((a, b) => b[field] - a[field])
    .slice(0, 3)
    .map((s) => ({ playerId: s.playerId, name: s.name, value: s[field] }));
}

export default async function AwardsPage() {
  const activeSeason = await getActiveSeason();
  if (!activeSeason) {
    return (
      <Container size="lg" py={48}>
        <Text
          component="h1"
          className="display-face"
          fw={900}
          fz={28}
          style={{ letterSpacing: "-0.02em" }}
        >
          SEASON AWARDS
        </Text>
        <Text c="dimmed" mt="sm">
          No active season yet.
        </Text>
      </Container>
    );
  }

  const stats = await getSeasonLeaderboard(activeSeason.id);
  const mvpAward = await prisma.award.findFirst({
    where: { seasonId: activeSeason.id, type: "mvp" },
    include: { player: true },
  });

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

        {mvpAward && <MvpSpotlight mvp={mvpAward.player} seasonName={activeSeason.name} />}

        <Box className="awards-grid fs-fade-up" style={{ animationDelay: "0.1s" }}>
          <Podium
            title="Top Scorer"
            glyph="⚽"
            unit="goals"
            items={top(stats, "goals")}
            accent="var(--volt)"
          />
          <Podium
            title="Top Assists"
            glyph="🅰"
            unit="assists"
            items={top(stats, "assists")}
            accent="var(--team-blue)"
          />
          <Podium
            title="Most Wins"
            glyph="🥇"
            unit="wins"
            items={top(stats, "wins")}
            accent="var(--team-green)"
          />
        </Box>
      </Stack>
    </Container>
  );
}
