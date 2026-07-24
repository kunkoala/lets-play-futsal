import { notFound } from "next/navigation";
import { Badge, Container, Group, Stack, Text, Title } from "@mantine/core";
import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/matchScore";
import { NavLink } from "@/components/NavLink";

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
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <NavLink href="/sessions" size="sm">
            &larr; Back to sessions
          </NavLink>
          <Title order={1}>{session.date.toISOString().slice(0, 10)}</Title>
          <Text c="dimmed" size="sm">
            {session.season.name}
          </Text>
        </div>

        <Stack gap="sm">
          <Text fw={500}>Teams</Text>
          <Group align="flex-start" gap="xl">
            {session.teams.map((team) => (
              <Stack key={team.id} gap={4} miw={140}>
                <Badge variant="filled" style={{ backgroundColor: team.color, color: "white" }}>
                  {team.name}
                </Badge>
                {team.players.map((tp) => (
                  <Text key={tp.player.id} size="sm">
                    {tp.player.name}
                  </Text>
                ))}
              </Stack>
            ))}
            {session.teams.length === 0 && (
              <Text size="sm" c="dimmed">
                Teams haven&apos;t been shuffled yet.
              </Text>
            )}
          </Group>
        </Stack>

        <Stack gap="sm">
          <Text fw={500}>Matches</Text>
          {session.matches.length === 0 && (
            <Text size="sm" c="dimmed">
              No matches yet.
            </Text>
          )}
          {session.matches.map((m) => {
            const score = computeScore(m.goalEvents, m.homeTeamId, m.awayTeamId);
            return (
              <Stack key={m.id} gap={4}>
                <Text fw={500}>
                  <span style={{ color: m.homeTeam.color }}>{m.homeTeam.name}</span> {score.home} —{" "}
                  {score.away} <span style={{ color: m.awayTeam.color }}>{m.awayTeam.name}</span>
                  {m.status === "in_progress" && (
                    <Badge ml="xs" size="xs" color="orange">
                      live
                    </Badge>
                  )}
                </Text>
                {m.goalEvents.map((e) => (
                  <Text key={e.id} size="sm" c="dimmed" ml="md">
                    {e.seq}. {e.scorer?.name ?? "Own goal"}
                    {e.assist ? ` (assist: ${e.assist.name})` : ""}
                  </Text>
                ))}
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Container>
  );
}
