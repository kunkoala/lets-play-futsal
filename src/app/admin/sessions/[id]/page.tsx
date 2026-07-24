import { notFound } from "next/navigation";
import { Box, Container, Group, Stack, Text } from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavButton, NavLink } from "@/components/NavLink";
import { ArrowLeft } from "@/components/icons";
import { AttendanceChecklist } from "./AttendanceChecklist";
import { ShuffleControls } from "./ShuffleControls";
import { LockTeamsButton, UnlockTeamsButton } from "./SessionStageActions";
import { TeamRosters } from "./TeamRosters";
import { NextMatchCard } from "./NextMatchCard";
import { MatchesSoFar } from "./MatchesSoFar";
import { CompleteSessionButton, ReopenSessionButton } from "./CompleteSessionButton";

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "var(--team-green)", bg: "rgba(47,208,106,.14)" },
  teams_set: { label: "Teams set", color: "var(--team-blue)", bg: "rgba(77,139,255,.14)" },
  completed: { label: "Completed", color: "var(--volt)", bg: "rgba(200,255,47,.12)" },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Text
      component="div"
      fw={700}
      fz={10}
      c="dimmed"
      style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
    >
      {children}
    </Text>
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 18,
        background: "var(--panel)",
        padding: "20px 22px",
        ...style,
      }}
    >
      {children}
    </Box>
  );
}

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
        include: { homeTeam: true, awayTeam: true, goalEvents: true, mvpPlayer: true },
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
  const attending = activePlayers.filter((p) => attendingIds.includes(p.id));
  const attendingNames = attending.map((p) => p.name);
  const attendingCandidates = attending.map((p) => ({ id: p.id, keeperPref: p.keeperPref }));
  const inProgressMatch = session.matches.find((m) => m.status === "in_progress");
  const finishedMatches = session.matches
    .filter((m) => m.status === "finished")
    .map((m) => ({ home: m.homeTeamId, away: m.awayTeamId, seq: m.seq }));
  const status = STATUS_STYLE[session.status] ?? STATUS_STYLE.draft;

  return (
    <Container fluid py={{ base: 20, sm: 32 }} pb={64} px={{ base: 16, sm: 28 }}>
      <NavLink href="/admin/sessions" c="dimmed" fz={13} underline="never">
        <Group gap={5} wrap="nowrap" component="span" align="center">
          <ArrowLeft size={14} weight="bold" />
          <span>Sessions</span>
        </Group>
      </NavLink>

      <Group justify="space-between" align="center" mt={12} mb={24} wrap="wrap" gap="sm">
        <div>
          <Text
            component="h1"
            className="display-face tabular-nums"
            fw={900}
            fz={{ base: 28, sm: 36 }}
            style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
          >
            {session.date.toISOString().slice(0, 10)}
          </Text>
          <Text c="dimmed" fz={13} mt={4}>
            {session.season.name}
          </Text>
        </div>
        <Box
          component="span"
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: status.color,
            background: status.bg,
            borderRadius: 20,
            padding: "5px 14px",
          }}
        >
          {status.label}
        </Box>
      </Group>

      {/* Stage 1 — check-in + shuffle. Full-width rows rather than a side
          column: check-in is the bulk of game-day tapping, and squeezed into
          a `1fr` next to the 340px shuffle panel its name tiles collapsed to a
          single long scrolling column. */}
      {session.status === "draft" && (
        <Stack gap={16}>
          <Panel>
            <AttendanceChecklist
              sessionId={session.id}
              players={activePlayers}
              initialAttendingIds={attendingIds}
            />
          </Panel>

          <Panel>
            <Eyebrow>Shuffle into teams</Eyebrow>
            <Box mt={14}>
              <ShuffleControls
                sessionId={session.id}
                attendingNames={attendingNames}
                attendingCandidates={attendingCandidates}
              />
            </Box>
          </Panel>

          {session.teams.length > 0 && (
            <Panel>
              <Group justify="space-between" align="center" mb={14}>
                <Eyebrow>Teams</Eyebrow>
                <LockTeamsButton sessionId={session.id} />
              </Group>
              <TeamRosters teams={session.teams} reveal />
            </Panel>
          )}
        </Stack>
      )}

      {/* Stage 2 — teams locked + next match */}
      {session.status === "teams_set" && (
        <div className="session-grid">
          <Stack gap={16}>
            <Panel>
              <Group justify="space-between" align="center" mb={14}>
                <Eyebrow>Teams · Locked</Eyebrow>
                <UnlockTeamsButton sessionId={session.id} />
              </Group>
              <TeamRosters teams={session.teams} />
            </Panel>
            <Panel>
              <Eyebrow>Matches so far</Eyebrow>
              <Box mt={12}>
                <MatchesSoFar
                  sessionId={session.id}
                  matches={session.matches}
                  rosters={session.teams}
                />
              </Box>
            </Panel>
            <CompleteSessionButton sessionId={session.id} disabled={Boolean(inProgressMatch)} />
          </Stack>

          <Panel>
            {inProgressMatch ? (
              <Stack gap={14}>
                <Eyebrow>Match in progress</Eyebrow>
                <NavButton
                  href={`/admin/sessions/${session.id}/live?matchId=${inProgressMatch.id}`}
                  size="md"
                  fw={800}
                >
                  ▶ Resume live match
                </NavButton>
              </Stack>
            ) : (
              <NextMatchCard
                sessionId={session.id}
                teams={session.teams.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
                finishedMatches={finishedMatches}
              />
            )}
          </Panel>
        </div>
      )}

      {/* Completed — read-only summary */}
      {session.status === "completed" && (
        <Stack gap={16}>
          <Panel>
            <Eyebrow>Teams</Eyebrow>
            <Box mt={12}>
              <TeamRosters teams={session.teams} />
            </Box>
          </Panel>
          <Panel>
            <Eyebrow>Matches</Eyebrow>
            <Box mt={12}>
              <MatchesSoFar
                sessionId={session.id}
                matches={session.matches}
                rosters={session.teams}
              />
            </Box>
          </Panel>
          <ReopenSessionButton sessionId={session.id} />
        </Stack>
      )}
    </Container>
  );
}
