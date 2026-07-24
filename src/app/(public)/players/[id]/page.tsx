import { notFound } from "next/navigation";
// Named cell components (Table.Thead/… statics don't survive the Server
// Component boundary — see the leaderboard page for the same fix).
import {
  Box,
  Container,
  Group,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { getPlayerProfile, type PlayerStatsTotals } from "@/lib/playerProfile";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";
import { PlayerAvatar } from "@/components/PlayerAvatar";
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

/** One of the three headline stat tiles (GOALS is volt-accented per handoff). */
function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <Box
      style={{
        flex: 1,
        minWidth: 0,
        border: "1px solid var(--hairline)",
        borderRadius: 14,
        background: "var(--panel)",
        padding: "14px 12px",
        textAlign: "center",
      }}
    >
      <Text
        className="display-face tabular-nums"
        fw={900}
        fz={30}
        style={{ lineHeight: 1, color: accent ? "var(--volt)" : "var(--text)" }}
      >
        {value}
      </Text>
      <Text fw={700} fz={10} c="dimmed" mt={6} style={{ letterSpacing: "0.12em" }}>
        {label}
      </Text>
    </Box>
  );
}

function TeamDot({ color }: { color: string }) {
  return (
    <Box
      component="span"
      style={{
        display: "inline-block",
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

/** Most-frequently-played team across the player's history ("Usually Red"). */
function usualTeam(
  history: { team: { name: string; color: string } | null }[],
): { name: string; color: string } | null {
  const counts = new Map<string, { name: string; color: string; n: number }>();
  for (const row of history) {
    if (!row.team) continue;
    const key = row.team.name;
    const hit = counts.get(key);
    if (hit) hit.n += 1;
    else counts.set(key, { name: row.team.name, color: row.team.color, n: 1 });
  }
  let best: { name: string; color: string; n: number } | null = null;
  for (const c of counts.values()) if (!best || c.n > best.n) best = c;
  return best ? { name: best.name, color: best.color } : null;
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

  const totals: PlayerStatsTotals = profile.activeSeason ?? profile.allTime;
  const winRate =
    totals.matchesPlayed > 0 ? Math.round((totals.wins / totals.matchesPlayed) * 100) : 0;
  const usual = usualTeam(profile.sessionHistory);
  const at = profile.allTime;

  return (
    <Container size="lg" py={{ base: 20, sm: 32 }} pb={64}>
      <NavLink href="/" c="dimmed" fz={13} underline="never" mb={16} display="inline-block">
        <Group gap={5} wrap="nowrap" component="span" align="center">
          <ArrowLeft size={14} weight="bold" />
          <span>Leaderboard</span>
        </Group>
      </NavLink>

      <div className="profile-grid">
        {/* Aside — identity + headline stats */}
        <div className="profile-aside">
          <Stack gap={14} className="fs-fade-up">
            <Box
              style={{
                border: "1px solid var(--hairline)",
                borderRadius: 18,
                background: "var(--panel)",
                padding: "22px 20px",
              }}
            >
              <Group wrap="nowrap" gap={16} align="center">
                <PlayerAvatar name={profile.player.name} size={68} ringColor={usual?.color} />
                <Box style={{ minWidth: 0 }}>
                  <Text
                    className="display-face"
                    fw={800}
                    fz={26}
                    style={{ letterSpacing: "-0.02em", lineHeight: 1.05 }}
                  >
                    {profile.player.name}
                  </Text>
                  <Group gap={7} mt={6} wrap="nowrap">
                    {usual && <TeamDot color={usual.color} />}
                    <Text c="dimmed" fz={13} truncate>
                      {usual ? `Usually ${usual.name} · ` : ""}
                      {at.gamesPlayed} games
                    </Text>
                  </Group>
                  {!profile.player.isActive && (
                    <Text c="dimmed" fz={11} mt={4}>
                      Inactive
                    </Text>
                  )}
                  {mvpAwards.length > 0 && (
                    <Group gap={6} mt={8}>
                      {mvpAwards.map((a) => (
                        <Box
                          key={a.id}
                          component="span"
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--volt)",
                            background: "rgba(200,255,47,.12)",
                            borderRadius: 6,
                            padding: "3px 8px",
                          }}
                        >
                          🏆 MVP · {a.season.name}
                        </Box>
                      ))}
                    </Group>
                  )}
                </Box>
              </Group>
            </Box>

            <Eyebrow>{profile.activeSeason ? profile.activeSeasonName : "All-time"}</Eyebrow>
            <Group gap={10} wrap="nowrap">
              <StatTile label="GOALS" value={totals.goals} accent />
              <StatTile label="ASSISTS" value={totals.assists} />
              <StatTile label="WINS" value={totals.wins} />
            </Group>

            <Box
              style={{
                border: "1px solid var(--hairline)",
                borderRadius: 14,
                background: "var(--deep-panel)",
                padding: "12px 16px",
              }}
            >
              <Group justify="space-between" wrap="wrap" gap={8}>
                <Eyebrow>All-time</Eyebrow>
                <Text className="tabular-nums" fw={700} fz={13}>
                  {at.goals} G · {at.assists} A · {at.wins} W · {at.gamesPlayed} games
                  {totals.matchesPlayed > 0 && (
                    <Text span c="dimmed" fw={500}>
                      {" "}
                      · {winRate}% win
                    </Text>
                  )}
                </Text>
              </Group>
            </Box>
          </Stack>
        </div>

        {/* History */}
        <div>
          <Eyebrow>Session history</Eyebrow>
          <Box
            mt={10}
            style={{
              border: "1px solid var(--hairline)",
              borderRadius: 16,
              overflow: "hidden",
              background: "var(--panel)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <Table verticalSpacing={12} horizontalSpacing="lg" highlightOnHover w="100%">
                <TableThead>
                  <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <Th align="left">Matchday</Th>
                    <Th align="left">Team</Th>
                    <Th>G</Th>
                    <Th>A</Th>
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {profile.sessionHistory.map((row) => (
                    <TableTr key={row.sessionId}>
                      <TableTd>
                        <NavLink
                          href={`/sessions/${row.sessionId}`}
                          c="inherit"
                          underline="hover"
                          fw={600}
                          fz={14}
                        >
                          {row.date.toISOString().slice(0, 10)}
                        </NavLink>
                      </TableTd>
                      <TableTd>
                        {row.team ? (
                          <Group gap={7} wrap="nowrap">
                            <TeamDot color={row.team.color} />
                            <Text fz={13} fw={600}>
                              {row.team.name}
                            </Text>
                          </Group>
                        ) : (
                          <Text c="dimmed">—</Text>
                        )}
                      </TableTd>
                      <Td accent={row.goals > 0}>{row.goals}</Td>
                      <Td>{row.assists}</Td>
                    </TableTr>
                  ))}
                  {profile.sessionHistory.length === 0 && (
                    <TableTr>
                      <TableTd colSpan={4}>
                        <Text c="dimmed" py="md" ta="center" fz={14}>
                          No completed sessions yet.
                        </Text>
                      </TableTd>
                    </TableTr>
                  )}
                </TableTbody>
              </Table>
            </div>
          </Box>
        </div>
      </div>
    </Container>
  );
}

function Th({ children, align = "center" }: { children: React.ReactNode; align?: "left" | "center" }) {
  return (
    <TableTh
      style={{
        textAlign: align,
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </TableTh>
  );
}

function Td({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <TableTd style={{ textAlign: "center" }}>
      <Text
        className="tabular-nums"
        fw={accent ? 800 : 500}
        fz={14}
        style={accent ? { color: "var(--volt)" } : undefined}
      >
        {children}
      </Text>
    </TableTd>
  );
}
