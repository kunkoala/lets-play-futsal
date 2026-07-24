import { Card, Container, Stack, Text, Title } from "@mantine/core";
import { getActiveSeason, getSeasonLeaderboard, type PlayerSeasonStats } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";

function TopList({
  title,
  items,
}: {
  title: string;
  items: { playerId: number; name: string; value: number }[];
}) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Stack gap="xs">
        <Text fw={500}>{title}</Text>
        {items.length === 0 && (
          <Text size="sm" c="dimmed">
            No data yet.
          </Text>
        )}
        {items.map((item, i) => (
          <Text key={item.playerId} size="sm">
            {i + 1}.{" "}
            <NavLink href={`/players/${item.playerId}`}>
              {item.name}
            </NavLink>{" "}
            — {item.value}
          </Text>
        ))}
      </Stack>
    </Card>
  );
}

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
      <Container size="sm" py="xl">
        <Title order={1}>Awards</Title>
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
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Awards</Title>
          <Text c="dimmed">{activeSeason.name}</Text>
        </div>

        {mvpAward && (
          <Card withBorder padding="lg" radius="md" bg="yellow.0">
            <Stack gap={4}>
              <Text fw={500}>MVP</Text>
              <Text fz={24} fw={700}>
                <NavLink href={`/players/${mvpAward.player.id}`}>
                  {mvpAward.player.name}
                </NavLink>
              </Text>
            </Stack>
          </Card>
        )}

        <TopList title="Top Scorer" items={top(stats, "goals")} />
        <TopList title="Top Assists" items={top(stats, "assists")} />
        <TopList title="Most Wins" items={top(stats, "wins")} />
      </Stack>
    </Container>
  );
}
