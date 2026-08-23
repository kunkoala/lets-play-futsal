import { Container, Text } from "@mantine/core";
import { getActiveSeason, getSeasonLeaderboard, getSeasonRatingHistory } from "@/lib/leaderboard";
import { mostImproved } from "@/lib/ratingHistory";
import { prisma } from "@/lib/prisma";
import { AwardsView } from "@/components/views/AwardsView";

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
  const adminPick = await prisma.award.findFirst({
    where: { seasonId: activeSeason.id, type: "mvp" },
    include: { player: true },
  });
  const improved = mostImproved(await getSeasonRatingHistory(activeSeason.id));

  return (
    <AwardsView
      stats={stats}
      seasonName={activeSeason.name}
      adminPick={adminPick ? { id: adminPick.player.id, name: adminPick.player.name } : null}
      improved={improved}
    />
  );
}
