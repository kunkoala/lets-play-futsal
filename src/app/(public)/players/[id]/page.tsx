import { notFound } from "next/navigation";
import { Badge, Card, Container, Group, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { getPlayerProfile, type PlayerStatsTotals } from "@/lib/playerProfile";
import { NavLink } from "@/components/NavLink";

function StatBlock({ title, totals }: { title: string; totals: PlayerStatsTotals }) {
  const winRate = totals.matchesPlayed > 0 ? Math.round((totals.wins / totals.matchesPlayed) * 100) : 0;
  return (
    <Card withBorder padding="lg" radius="md">
      <Stack gap={4}>
        <Text fw={500}>{title}</Text>
        <Group gap="lg">
          <Stack gap={0}>
            <Text fz={24} fw={700}>
              {totals.goals}
            </Text>
            <Text size="xs" c="dimmed">
              Goals
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text fz={24} fw={700}>
              {totals.assists}
            </Text>
            <Text size="xs" c="dimmed">
              Assists
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text fz={24} fw={700}>
              {totals.wins}-{totals.draws}-{totals.losses}
            </Text>
            <Text size="xs" c="dimmed">
              W-D-L
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text fz={24} fw={700}>
              {winRate}%
            </Text>
            <Text size="xs" c="dimmed">
              Win rate
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text fz={24} fw={700}>
              {totals.gamesPlayed}
            </Text>
            <Text size="xs" c="dimmed">
              Games
            </Text>
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) notFound();

  const profile = await getPlayerProfile(id);
  if (!profile) notFound();

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <NavLink href="/" size="sm">
            &larr; Back to leaderboard
          </NavLink>
          <Title order={1}>{profile.player.name}</Title>
          {!profile.player.isActive && (
            <Badge color="gray" variant="light">
              Inactive
            </Badge>
          )}
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {profile.activeSeason && (
            <StatBlock
              title={`This season (${profile.activeSeasonName})`}
              totals={profile.activeSeason}
            />
          )}
          <StatBlock title="All-time" totals={profile.allTime} />
        </SimpleGrid>

        <Stack gap="sm">
          <Text fw={500}>Session history</Text>
          <div style={{ overflowX: "auto" }}>
            <Table verticalSpacing="sm" miw={420}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Team</th>
                  <th>Goals</th>
                  <th>Assists</th>
                </tr>
              </thead>
              <tbody>
                {profile.sessionHistory.map((row) => (
                  <tr key={row.sessionId}>
                    <td>
                      <NavLink href={`/sessions/${row.sessionId}`}>
                        {row.date.toISOString().slice(0, 10)}
                      </NavLink>
                    </td>
                    <td>
                      {row.team ? (
                        <Badge variant="filled" style={{ backgroundColor: row.team.color, color: "white" }}>
                          {row.team.name}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{row.goals}</td>
                    <td>{row.assists}</td>
                  </tr>
                ))}
                {profile.sessionHistory.length === 0 && (
                  <tr>
                    <td colSpan={4}>No completed sessions yet.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Stack>
      </Stack>
    </Container>
  );
}
