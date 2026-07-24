import { notFound } from "next/navigation";
import { Badge, Card, Container, Group, Stack, Text, Title } from "@mantine/core";
import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/matchScore";
import { NavLink } from "@/components/NavLink";
import { ArrowLeft, SoccerBall, Target } from "@/components/icons";

export default async function PublicSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) notFound();

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      season: true,
      teams: {
        include: { players: { include: { player: true } } },
        orderBy: { id: "asc" },
      },
      matches: {
        include: {
          homeTeam: true,
          awayTeam: true,
          goalEvents: { include: { scorer: true, assist: true }, orderBy: { seq: "asc" } },
        },
        orderBy: { seq: "asc" },
      },
    },
  });
  if (!session) notFound();

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div className="fs-fade-up">
          <NavLink href="/sessions" size="sm" c="dimmed">
            <Group gap={4} wrap="nowrap" component="span">
              <ArrowLeft size={15} weight="bold" />
              <span>Back to sessions</span>
            </Group>
          </NavLink>
          <Title order={1} fz={{ base: 24, sm: 30 }} mt="xs">
            {session.date.toISOString().slice(0, 10)}
          </Title>
          <Text c="dimmed" size="sm">
            {session.season.name}
          </Text>
        </div>

        <Stack gap="sm" className="fs-fade-up" style={{ animationDelay: "0.1s" }}>
          <Text fw={600}>Teams</Text>
          <Group align="flex-start" gap="md">
            {session.teams.map((team) => (
              <Card
                key={team.id}
                withBorder
                radius="lg"
                padding="md"
                miw={150}
                style={{ borderTop: `3px solid ${team.color}` }}
                className="fs-card-hover"
              >
                <Stack gap={4}>
                  <Badge variant="filled" style={{ backgroundColor: team.color, color: "white" }}>
                    {team.name}
                  </Badge>
                  {team.players.map((tp) => (
                    <Text key={tp.player.id} size="sm">
                      {tp.player.name}
                    </Text>
                  ))}
                </Stack>
              </Card>
            ))}
            {session.teams.length === 0 && (
              <Text size="sm" c="dimmed">
                Teams haven&apos;t been shuffled yet.
              </Text>
            )}
          </Group>
        </Stack>

        <Stack gap="sm" className="fs-fade-up" style={{ animationDelay: "0.2s" }}>
          <Text fw={600}>Matches</Text>
          {session.matches.length === 0 && (
            <Text size="sm" c="dimmed">
              No matches yet.
            </Text>
          )}
          {session.matches.map((m) => {
            const score = computeScore(m.goalEvents, m.homeTeamId, m.awayTeamId);
            return (
              <Card key={m.id} withBorder radius="lg" padding="md" className="fs-card-hover">
                <Stack gap={6}>
                  <Group justify="space-between">
                    <Text fw={700} size="lg">
                      <span style={{ color: m.homeTeam.color }}>{m.homeTeam.name}</span>{" "}
                      {score.home} — {score.away}{" "}
                      <span style={{ color: m.awayTeam.color }}>{m.awayTeam.name}</span>
                    </Text>
                    {m.status === "in_progress" && (
                      <Badge color="orange" variant="light">
                        live
                      </Badge>
                    )}
                  </Group>
                  {m.goalEvents.map((e) => (
                    <Group key={e.id} gap={6} wrap="nowrap" ml="md">
                      <SoccerBall size={14} weight="fill" color="var(--mantine-color-dimmed)" />
                      <Text size="sm" c="dimmed">
                        {e.scorer?.name ?? "Own goal"}
                      </Text>
                      {e.assist && (
                        <Group gap={3} wrap="nowrap">
                          <Target size={13} weight="fill" color="var(--mantine-color-dimmed)" />
                          <Text size="sm" c="dimmed">
                            {e.assist.name}
                          </Text>
                        </Group>
                      )}
                    </Group>
                  ))}
                </Stack>
              </Card>
            );
          })}
        </Stack>
      </Stack>
    </Container>
  );
}
