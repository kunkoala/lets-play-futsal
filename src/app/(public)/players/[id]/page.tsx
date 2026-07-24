import { notFound } from "next/navigation";
import { Badge, Card, Container, Group, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { getPlayerProfile, type PlayerStatsTotals } from "@/lib/playerProfile";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  SoccerBall,
  Target,
  ListChecks,
  TrendUp,
  CalendarBlank,
  Trophy,
  ArrowLeft,
  type Icon,
} from "@/components/icons";

function StatTile({ icon: Icon, label, value }: { icon: Icon; label: string; value: string | number }) {
  return (
    <Stack gap={2} align="center">
      <Icon size={22} weight="fill" color="var(--mantine-color-teal-6)" />
      <Text fz={22} fw={800}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Stack>
  );
}

function StatBlock({ title, totals }: { title: string; totals: PlayerStatsTotals }) {
  const winRate = totals.matchesPlayed > 0 ? Math.round((totals.wins / totals.matchesPlayed) * 100) : 0;
  return (
    <Card withBorder radius="lg" padding="lg" className="fs-card-hover">
      <Stack gap="sm">
        <Text fw={600} size="sm" c="dimmed">
          {title}
        </Text>
        <Group justify="space-between" gap="xs">
          <StatTile icon={SoccerBall} label="Goals" value={totals.goals} />
          <StatTile icon={Target} label="Assists" value={totals.assists} />
          <StatTile icon={ListChecks} label="W-D-L" value={`${totals.wins}-${totals.draws}-${totals.losses}`} />
          <StatTile icon={TrendUp} label="Win rate" value={`${winRate}%`} />
          <StatTile icon={CalendarBlank} label="Games" value={totals.gamesPlayed} />
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

  const mvpAwards = await prisma.award.findMany({
    where: { playerId: id, type: "mvp" },
    include: { season: true },
  });

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <NavLink href="/" size="sm" c="dimmed">
          <Group gap={4} wrap="nowrap" component="span">
            <ArrowLeft size={15} weight="bold" />
            <span>Back to leaderboard</span>
          </Group>
        </NavLink>

          <Card withBorder radius="lg" padding="lg" className="fs-fade-up">
            <Group wrap="nowrap">
              <PlayerAvatar name={profile.player.name} size={72} />
              <Stack gap={4}>
                <Group gap="xs">
                  <Title order={1} fz={{ base: 24, sm: 30 }}>
                    {profile.player.name}
                  </Title>
                  {!profile.player.isActive && (
                    <Badge color="gray" variant="light">
                      Inactive
                    </Badge>
                  )}
                </Group>
                {mvpAwards.length > 0 && (
                  <Group gap={6}>
                    {mvpAwards.map((a) => (
                      <Badge
                        key={a.id}
                        color="gold"
                        variant="light"
                        leftSection={<Trophy size={12} weight="fill" />}
                      >
                        MVP — {a.season.name}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Stack>
            </Group>
          </Card>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {profile.activeSeason && (
              <StatBlock
                title={`This season — ${profile.activeSeasonName}`}
                totals={profile.activeSeason}
              />
            )}
            <StatBlock title="All-time" totals={profile.allTime} />
          </SimpleGrid>

          <Stack gap="sm">
            <Text fw={600}>Session history</Text>
            <Card withBorder radius="lg" p={0}>
              <div style={{ overflowX: "auto" }}>
                <Table verticalSpacing="md" horizontalSpacing="lg" miw={420} highlightOnHover w="100%">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Date</th>
                      <th style={{ textAlign: "left" }}>Team</th>
                      <th>Goals</th>
                      <th>Assists</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.sessionHistory.map((row) => (
                      <tr key={row.sessionId}>
                        <td>
                          <NavLink href={`/sessions/${row.sessionId}`} c="inherit" underline="hover" fw={600}>
                            {row.date.toISOString().slice(0, 10)}
                          </NavLink>
                        </td>
                        <td>
                          {row.team ? (
                            <Badge variant="filled" radius="sm" style={{ backgroundColor: row.team.color, color: "white" }}>
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
                        <td colSpan={4}>
                          <Text c="dimmed" py="md" ta="center">
                            No completed sessions yet.
                          </Text>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>
          </Stack>
      </Stack>
    </Container>
  );
}
