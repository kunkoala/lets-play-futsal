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

/**
 * Shape shared by the Prisma query on `/sessions/[id]` and the generated demo
 * session — declared structurally so both satisfy it without conversion.
 */
export type SessionDetail = {
  date: Date;
  status?: string;
  season: { name: string };
  teams: readonly {
    id: number;
    name: string;
    color: string;
    players: readonly { isKeeper: boolean; player: { id: number; name: string } }[];
  }[];
  matches: readonly {
    id: number;
    status: string;
    homeTeamId: number;
    awayTeamId: number;
    homeTeam: { name: string; color: string };
    awayTeam: { name: string; color: string };
    mvpPlayer: { id: number; name: string } | null;
    goalEvents: readonly {
      id: number;
      teamId: number;
      scorer: { name: string } | null;
      assist: { name: string } | null;
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

        <Stack gap={12} className="fs-fade-up" style={{ animationDelay: "0.05s" }}>
          <Eyebrow>Teams</Eyebrow>
          {session.teams.length === 0 ? (
            <Text fz={14} c="dimmed">
              Teams haven&apos;t been shuffled yet.
            </Text>
          ) : (
            <Group align="stretch" gap={12} wrap="wrap">
              {session.teams.map((team) => (
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
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Text fw={800} fz={16} style={{ color: m.homeTeam.color }}>
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
                  <Text fw={800} fz={16} style={{ color: m.awayTeam.color, textAlign: "right" }}>
                    {m.awayTeam.name}
                  </Text>
                </Group>
                {m.status === "in_progress" && (
                  <Text fz={11} fw={700} mt={8} style={{ color: "var(--team-yellow)" }}>
                    ● LIVE
                  </Text>
                )}
                {m.mvpPlayer && (
                  <Group gap={6} mt={10} wrap="nowrap">
                    <Text fz={11} fw={800} style={{ color: "var(--volt)" }}>
                      🏆 MVP
                    </Text>
                    <NavLink
                      href={`${basePath}/players/${m.mvpPlayer.id}`}
                      fz={13}
                      fw={600}
                      c="inherit"
                      underline="hover"
                    >
                      {m.mvpPlayer.name}
                    </NavLink>
                  </Group>
                )}
                {m.goalEvents.length > 0 && (
                  <Stack gap={3} mt={12} pt={12} style={{ borderTop: "1px solid var(--hairline)" }}>
                    {m.goalEvents.map((e) => (
                      <Text key={e.id} fz={13} c="dimmed">
                        <Text span fw={600} c="var(--mantine-color-text)">
                          {e.scorer?.name ?? "Own goal"}
                        </Text>{" "}
                        ⚽
                        {e.assist ? ` · ${e.assist.name} 🅰` : ""}
                      </Text>
                    ))}
                  </Stack>
                )}
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Container>
  );
}
