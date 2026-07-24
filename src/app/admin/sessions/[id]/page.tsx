import { notFound } from "next/navigation";
import { Badge, Card, Container, Group, Stack, Text, Title } from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLink, NavButton } from "@/components/NavLink";
import { AttendanceChecklist } from "./AttendanceChecklist";
import { ShuffleControls } from "./ShuffleControls";
import { LockTeamsButton, UnlockTeamsButton } from "./SessionStageActions";
import { TeamRosters } from "./TeamRosters";
import { NextMatchCard } from "./NextMatchCard";
import { MatchesSoFar } from "./MatchesSoFar";
import { CompleteSessionButton, ReopenSessionButton } from "./CompleteSessionButton";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin(); // convention: see src/lib/auth.ts's requireAdmin() doc comment

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) notFound();

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      season: true,
      attendances: true,
      teams: {
        include: { players: { include: { player: true } } },
        orderBy: { id: "asc" },
      },
      matches: {
        include: { homeTeam: true, awayTeam: true, goalEvents: true },
        orderBy: { seq: "asc" },
      },
    },
  });
  if (!session) notFound();

  const activePlayers = await prisma.player.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  const attendingIds = session.attendances.map((a) => a.playerId);
  const inProgressMatch = session.matches.find((m) => m.status === "in_progress");
  const finishedMatches = session.matches
    .filter((m) => m.status === "finished")
    .map((m) => ({ home: m.homeTeamId, away: m.awayTeamId, seq: m.seq }));

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <NavLink href="/admin/sessions" size="sm">
            &larr; Back to sessions
          </NavLink>
          <Group justify="space-between" align="center">
            <Title order={1}>{session.date.toISOString().slice(0, 10)}</Title>
            <Badge variant="light">{session.status}</Badge>
          </Group>
          <Text c="dimmed" size="sm">
            {session.season.name}
          </Text>
        </div>

        {session.status === "draft" && (
          <>
            <Card withBorder padding="lg" radius="md">
              <AttendanceChecklist
                sessionId={session.id}
                players={activePlayers}
                initialAttendingIds={attendingIds}
              />
            </Card>

            <Card withBorder padding="lg" radius="md">
              <Stack gap="sm">
                <Text fw={500}>Shuffle into teams</Text>
                <ShuffleControls
                  sessionId={session.id}
                  attendingCount={attendingIds.length}
                />
              </Stack>
            </Card>

            {session.teams.length > 0 && (
              <Card withBorder padding="lg" radius="md">
                <Stack gap="sm">
                  <Text fw={500}>Teams</Text>
                  <TeamRosters teams={session.teams} />
                  <LockTeamsButton sessionId={session.id} />
                </Stack>
              </Card>
            )}
          </>
        )}

        {session.status === "teams_set" && (
          <>
            <Card withBorder padding="lg" radius="md">
              <Stack gap="sm">
                <Text fw={500}>Teams (locked)</Text>
                <TeamRosters teams={session.teams} />
                <UnlockTeamsButton sessionId={session.id} />
              </Stack>
            </Card>

            <Card withBorder padding="lg" radius="md">
              <Stack gap="sm">
                <Text fw={500}>Matches so far</Text>
                <MatchesSoFar sessionId={session.id} matches={session.matches} />
              </Stack>
            </Card>

            <Card withBorder padding="lg" radius="md">
              {inProgressMatch ? (
                <Stack gap="sm">
                  <Text fw={500}>A match is in progress</Text>
                  <NavButton
                    href={`/admin/sessions/${session.id}/live?matchId=${inProgressMatch.id}`}
                  >
                    Resume live match
                  </NavButton>
                </Stack>
              ) : (
                <NextMatchCard
                  sessionId={session.id}
                  teams={session.teams.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
                  finishedMatches={finishedMatches}
                />
              )}
            </Card>

            <CompleteSessionButton
              sessionId={session.id}
              disabled={Boolean(inProgressMatch)}
            />
          </>
        )}

        {session.status === "completed" && (
          <Card withBorder padding="lg" radius="md">
            <Stack gap="sm">
              <Text fw={500}>Teams</Text>
              <TeamRosters teams={session.teams} />
              <Text fw={500}>Matches</Text>
              <MatchesSoFar sessionId={session.id} matches={session.matches} />
              <ReopenSessionButton sessionId={session.id} />
              <Text size="sm" c="dimmed">
                The full public session summary arrives in Phase 6.
              </Text>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
