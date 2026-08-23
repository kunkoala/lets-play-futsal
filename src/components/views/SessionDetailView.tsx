import { Box, Container, Group, Stack, Text } from "@mantine/core";
import { computeScore } from "@/lib/matchScore";
import { KEEPER_GLYPH } from "@/lib/keeperPref";
import { NavLink } from "@/components/NavLink";
import { ArrowLeft } from "@/components/icons";

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

type GoalEventDetail = {
  id: number;
  teamId: number;
  scorer: { name: string } | null;
  assist: { name: string } | null;
  matchSec: number | null;
};

/**
 * One goal line, laid out under its own team the way a real match report
 * does — home team's goals on the left, away team's on the right — rather
 * than one flat list where telling the sides apart meant reading the dot
 * color. `align` flips text alignment and puts the minute/dot on the
 * outside edge so both columns read toward the score in the middle.
 */
function GoalLine({
  event,
  color,
  align,
}: {
  event: GoalEventDetail;
  color: string;
  align: "left" | "right";
}) {
  const dot = (
    <Box
      aria-hidden
      style={{ width: 7, height: 7, borderRadius: 999, flexShrink: 0, background: color }}
    />
  );
  const label = (
    <Text fz={13} c="dimmed" style={{ textAlign: align }}>
      {event.matchSec !== null && (
        <Text span className="tabular-nums" fw={700}>
          {Math.floor(event.matchSec / 60)}&apos;{" "}
        </Text>
      )}
      <Text span fw={600} c="var(--mantine-color-text)">
        {event.scorer?.name ?? "Own goal"}
      </Text>{" "}
      ⚽
      {event.assist ? ` · ${event.assist.name} A` : ""}
    </Text>
  );

  return (
    <Group gap={7} wrap="nowrap" align="center">
      {align === "left" ? (
        <>
          {dot}
          {label}
        </>
      ) : (
        <>
          {label}
          {dot}
        </>
      )}
    </Group>
  );
}

/**
 * Shape shared by the Prisma query on `/sessions/[id]` and the generated demo
 * session — declared structurally so both satisfy it without conversion.
 */
export type SessionDetail = {
  date: Date;
  status?: string;
  season: { name: string };
  /** Player of the day — one per session, or null if nobody was picked. */
  mvpPlayer: { id: number; name: string } | null;
  teams: readonly {
    id: number;
    name: string;
    color: string;
    /** Which shuffle round these teams are from (see Team.generation in
     *  schema.prisma). Missing on the demo season, which never reshuffles —
     *  treated the same as generation 1. */
    generation?: number;
    players: readonly { isKeeper: boolean; player: { id: number; name: string } }[];
  }[];
  matches: readonly {
    id: number;
    status: string;
    homeTeamId: number;
    awayTeamId: number;
    homeTeam: { name: string; color: string };
    awayTeam: { name: string; color: string };
    goalEvents: readonly {
      id: number;
      teamId: number;
      scorer: { name: string } | null;
      assist: { name: string } | null;
      /** Elapsed match clock when the goal went in, in seconds. Null for
       *  goals recorded before the clock existed. */
      matchSec: number | null;
    }[];
  }[];
};

export function SessionDetailView({
  session,
  basePath = "",
}: {
  session: SessionDetail;
  basePath?: string;
}) {
  // A reshuffle mid-session (see reshuffleTeams) adds a new generation of
  // teams rather than replacing the old ones, so this grid only shows the
  // latest round — the match-by-match breakdown below already shows exactly
  // who scored regardless of which generation's roster they were on.
  const currentGeneration = session.teams.reduce((max, t) => Math.max(max, t.generation ?? 1), 1);
  const currentTeams = session.teams.filter((t) => (t.generation ?? 1) === currentGeneration);

  return (
    <Container size="md" py={{ base: 20, sm: 32 }} pb={64}>
      <Stack gap="xl">
        <div className="fs-fade-up">
          <NavLink href={`${basePath}/sessions`} c="dimmed" fz={13} underline="never">
            <Group gap={5} wrap="nowrap" component="span" align="center">
              <ArrowLeft size={14} weight="bold" />
              <span>Sessions</span>
            </Group>
          </NavLink>
          <Text
            component="h1"
            className="display-face tabular-nums"
            fw={900}
            fz={{ base: 26, sm: 34 }}
            mt={10}
            style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
          >
            {session.date.toISOString().slice(0, 10)}
          </Text>
          <Text c="dimmed" fz={13} mt={4}>
            {session.season.name}
          </Text>
        </div>

        {session.mvpPlayer && (
          <Box
            className="fs-fade-up"
            style={{
              animationDelay: "0.03s",
              border: "1px solid var(--volt)",
              borderRadius: 16,
              background: "rgba(200,255,47,.08)",
              padding: "16px 18px",
            }}
          >
            <Text
              fz={10}
              fw={800}
              c="var(--text-muted)"
              style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
            >
              Player of the day
            </Text>
            <NavLink
              href={`${basePath}/players/${session.mvpPlayer.id}`}
              c="inherit"
              underline="hover"
            >
              <Text fw={900} fz={22} mt={2} style={{ color: "var(--volt)" }}>
                🏆 {session.mvpPlayer.name}
              </Text>
            </NavLink>
          </Box>
        )}

        <Stack gap={12} className="fs-fade-up" style={{ animationDelay: "0.05s" }}>
          <Eyebrow>Teams</Eyebrow>
          {currentTeams.length === 0 ? (
            <Text fz={14} c="dimmed">
              Teams haven&apos;t been shuffled yet.
            </Text>
          ) : (
            <Group align="stretch" gap={12} wrap="wrap">
              {currentTeams.map((team) => (
                <Box
                  key={team.id}
                  style={{
                    flex: "1 1 150px",
                    minWidth: 150,
                    border: "1px solid var(--hairline)",
                    borderLeft: `3px solid ${team.color}`,
                    borderRadius: 14,
                    background: "var(--panel)",
                    padding: "14px 16px",
                  }}
                >
                  <Text fw={800} fz={14} style={{ color: team.color }}>
                    {team.name}
                  </Text>
                  <Stack gap={2} mt={8}>
                    {[...team.players]
                      .sort((a, b) => Number(b.isKeeper) - Number(a.isKeeper))
                      .map((tp) => (
                        <Text key={tp.player.id} fz={13} fw={tp.isKeeper ? 700 : 500}>
                          {tp.player.name}
                          {tp.isKeeper ? ` ${KEEPER_GLYPH}` : ""}
                        </Text>
                      ))}
                  </Stack>
                </Box>
              ))}
            </Group>
          )}
        </Stack>

        <Stack gap={12} className="fs-fade-up" style={{ animationDelay: "0.1s" }}>
          <Eyebrow>Matches</Eyebrow>
          {session.matches.length === 0 && (
            <Text fz={14} c="dimmed">
              No matches yet.
            </Text>
          )}
          {session.matches.map((m) => {
            const score = computeScore(m.goalEvents, m.homeTeamId, m.awayTeamId);
            return (
              <Box
                key={m.id}
                style={{
                  border: "1px solid var(--hairline)",
                  borderRadius: 16,
                  background: "var(--panel)",
                  padding: "16px 18px",
                }}
              >
                {/* Grid rather than a space-between Group: with three unequal-
                    width children (two team names + the score), space-between
                    only centers the score when both names happen to be the
                    same length — a grid's middle column stays centered
                    regardless of how long "Red" vs "Green" is. */}
                <Box
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Text fw={800} fz={16} truncate style={{ color: m.homeTeam.color }}>
                    {m.homeTeam.name}
                  </Text>
                  <Group gap={10} align="center" wrap="nowrap">
                    <Text className="display-face tabular-nums" fw={900} fz={26}>
                      {score.home}
                    </Text>
                    <Text c="dimmed" fw={700}>
                      –
                    </Text>
                    <Text className="display-face tabular-nums" fw={900} fz={26}>
                      {score.away}
                    </Text>
                  </Group>
                  <Text
                    fw={800}
                    fz={16}
                    truncate
                    style={{ color: m.awayTeam.color, textAlign: "right" }}
                  >
                    {m.awayTeam.name}
                  </Text>
                </Box>
                {m.status === "in_progress" && (
                  <Text fz={11} fw={700} mt={10} style={{ color: "var(--team-yellow)" }}>
                    ● LIVE
                  </Text>
                )}
                {m.goalEvents.length > 0 && (
                  <Group
                    mt={12}
                    pt={12}
                    align="flex-start"
                    justify="space-between"
                    wrap="nowrap"
                    gap={16}
                    style={{ borderTop: "1px solid var(--hairline)" }}
                  >
                    <Stack gap={5} style={{ flex: 1, minWidth: 0 }}>
                      {m.goalEvents
                        .filter((e) => e.teamId === m.homeTeamId)
                        .map((e) => (
                          <GoalLine key={e.id} event={e} color={m.homeTeam.color} align="left" />
                        ))}
                    </Stack>
                    <Stack gap={5} style={{ flex: 1, minWidth: 0 }} align="flex-end">
                      {m.goalEvents
                        .filter((e) => e.teamId === m.awayTeamId)
                        .map((e) => (
                          <GoalLine key={e.id} event={e} color={m.awayTeam.color} align="right" />
                        ))}
                    </Stack>
                  </Group>
                )}
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Container>
  );
}
