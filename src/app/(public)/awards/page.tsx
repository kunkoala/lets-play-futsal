import { Container, Group, Stack, Text, Title } from "@mantine/core";
import { getActiveSeason, getSeasonLeaderboard, type PlayerSeasonStats } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { MvpSpotlight } from "./MvpSpotlight";
import { Podium } from "./Podium";
import { Trophy, SoccerBall, Target, Fire } from "@/components/icons";

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
      <Container size="md" py="xl">
        <Group gap={10}>
          <Trophy size={30} weight="fill" color="var(--mantine-color-teal-6)" />
          <Title order={1}>Awards</Title>
        </Group>
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
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Stack gap={4} className="fs-fade-up">
          <Group gap={10}>
            <Trophy size={30} weight="fill" color="var(--mantine-color-teal-6)" />
            <Title order={1} fz={{ base: 30, sm: 38 }}>
              Season Awards
            </Title>
          </Group>
          <Text c="dimmed">{activeSeason.name}</Text>
        </Stack>

        {mvpAward && <MvpSpotlight mvp={mvpAward.player} />}

        <div className="fs-fade-up" style={{ animationDelay: "0.1s" }}>
          <Podium
            title="Top Scorer"
            icon={<SoccerBall size={22} weight="fill" color="var(--mantine-color-teal-6)" />}
            unit="goals"
            items={top(stats, "goals")}
          />
        </div>
        <div className="fs-fade-up" style={{ animationDelay: "0.2s" }}>
          <Podium
            title="Top Assists"
            icon={<Target size={22} weight="fill" color="var(--mantine-color-teal-6)" />}
            unit="assists"
            items={top(stats, "assists")}
          />
        </div>
        <div className="fs-fade-up" style={{ animationDelay: "0.3s" }}>
          <Podium
            title="Most Wins"
            icon={<Fire size={22} weight="fill" color="var(--mantine-color-teal-6)" />}
            unit="wins"
            items={top(stats, "wins")}
          />
        </div>
      </Stack>
    </Container>
  );
}
