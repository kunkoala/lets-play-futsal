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
import { computeScore } from "@/lib/matchScore";
import { KEEPER_GLYPH } from "@/lib/keeperPref";
import {
  summariseSession,
  type RecapLeader,
  type RecapPlayerLine,
  type RecapPodiumPlace,
} from "@/lib/sessionRecap";
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
  scorer: { id: number; name: string } | null;
  assist: { id: number; name: string } | null;
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
 * One recap figure. Renders every tied name rather than a winner, which at a
 * five-a-side sample size is usually two or three people.
 */
function RecapCard({
  label,
  leader,
  glyph,
  unit,
  accent,
}: {
  label: string;
  leader: RecapLeader | null;
  glyph: string;
  unit: string;
  accent: string;
}) {
  return (
    <Box
      style={{
        flex: "1 1 150px",
        minWidth: 150,
        border: "1px solid var(--hairline)",
        borderRadius: 14,
        background: "var(--panel)",
        padding: "12px 14px",
      }}
    >
      <Group gap={6} wrap="nowrap" align="center">
        <Text fz={12} aria-hidden>
          {glyph}
        </Text>
        <Text
          fz={9}
          fw={800}
          c="var(--text-muted)"
          style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          {label}
        </Text>
      </Group>
      {leader ? (
        <>
          <Text fw={800} fz={15} mt={6} style={{ lineHeight: 1.25 }}>
            {leader.names.join(", ")}
          </Text>
          <Text className="tabular-nums" fz={12} fw={700} mt={2} style={{ color: accent }}>
            {leader.value} {unit}
          </Text>
        </>
      ) : (
        <Text c="dimmed" fz={14} mt={6}>
          —
        </Text>
      )}
    </Box>
  );
}

const PLACE_ACCENT = ["var(--volt)", "var(--text-muted)", "var(--team-yellow)"];

/**
 * Session podium, in the same shape as the season awards — the matchday
 * equivalent of Top Scorer, so the same thing looks the same in both places.
 *
 * A place holds every name tied at its value, so two players on 3 goals are
 * joint first and the next is second. Three *places*, not three names.
 */
function SessionPodium({
  title,
  glyph,
  unit,
  places,
  accent,
}: {
  title: string;
  glyph: string;
  unit: string;
  places: RecapPodiumPlace[];
  accent: string;
}) {
  return (
    <Box
      style={{
        flex: "1 1 260px",
        minWidth: 240,
        border: "1px solid var(--hairline)",
        borderRadius: 16,
        background: "var(--panel)",
        padding: "16px 18px 8px",
      }}
    >
      <Group gap={8} align="center" mb={places.length ? 12 : 4}>
        <Text fz={15} component="span" aria-hidden>
          {glyph}
        </Text>
        <Text
          fw={700}
          fz={11}
          c="dimmed"
          style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
        >
          {title}
        </Text>
      </Group>

      {places.length === 0 ? (
        <Text size="sm" c="dimmed" pb={10}>
          Nobody yet.
        </Text>
      ) : (
        <Stack gap={0}>
          {places.map((entry, i) => (
            <Group
              key={entry.place}
              justify="space-between"
              wrap="nowrap"
              gap="sm"
              style={{
                padding: "10px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--hairline)",
              }}
            >
              <Group gap={11} wrap="nowrap" style={{ minWidth: 0 }}>
                <Text
                  className="display-face tabular-nums"
                  fw={900}
                  fz={17}
                  w={18}
                  ta="center"
                  style={{
                    color: i === 0 ? accent : PLACE_ACCENT[i] ?? "var(--text-muted)",
                    flexShrink: 0,
                  }}
                >
                  {entry.place}
                </Text>
                <Text fz={14} fw={600} style={{ minWidth: 0, lineHeight: 1.3 }}>
                  {entry.names.join(", ")}
                </Text>
              </Group>
              <Text className="tabular-nums" fw={800} fz={15} style={{ flexShrink: 0 }}>
                {entry.value}
                <Text span c="dimmed" fw={500} fz={11}>
                  {" "}
                  {unit}
                </Text>
              </Text>
            </Group>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function StatTh({ children }: { children: React.ReactNode }) {
  return (
    <TableTh
      style={{
        textAlign: "center",
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </TableTh>
  );
}

/**
 * Everyone's night in one table — the point being that a player who scored
 * nothing can still find their own row and see what they did. Ordered by goal
 * contributions, so the podium's names are the ones at the top.
 */
function SessionStatsTable({
  players,
  basePath,
}: {
  players: RecapPlayerLine[];
  basePath: string;
}) {
  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--panel)",
      }}
    >
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <Table verticalSpacing={12} horizontalSpacing="md" highlightOnHover style={{ minWidth: 460 }}>
          <TableThead>
            <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
              <TableTh
                style={{
                  textAlign: "left",
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                Player
              </TableTh>
              <StatTh>MP</StatTh>
              <StatTh>G</StatTh>
              <StatTh>A</StatTh>
              <StatTh>G+A</StatTh>
              <StatTh>CS</StatTh>
              <StatTh>W–D–L</StatTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {players.map((player) => (
              <TableTr key={player.playerId}>
                <TableTd>
                  <NavLink
                    href={`${basePath}/players/${player.playerId}`}
                    fw={600}
                    fz={14}
                    c="inherit"
                    underline="hover"
                  >
                    {player.name}
                  </NavLink>
                </TableTd>
                <SessionStat value={player.matchesPlayed} />
                <SessionStat value={player.goals} accent={player.goals > 0} />
                <SessionStat value={player.assists} />
                <SessionStat value={player.contributions} />
                <SessionStat value={player.cleanSheets} />
                <SessionStat value={`${player.wins}–${player.draws}–${player.losses}`} />
              </TableTr>
            ))}
          </TableTbody>
        </Table>
      </div>
    </Box>
  );
}

function SessionStat({ value, accent }: { value: string | number; accent?: boolean }) {
  return (
    <TableTd style={{ textAlign: "center" }}>
      <Text
        className="tabular-nums"
        fw={accent ? 800 : 500}
        fz={14}
        style={accent ? { color: "var(--volt)" } : undefined}
      >
        {value}
      </Text>
    </TableTd>
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
    /** Who played in this match — see MatchPlayer in prisma/schema.prisma. */
    lineup: readonly { teamId: number; player: { id: number; name: string } }[];
    goalEvents: readonly GoalEventDetail[];
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

  // Every generation, not just the current one: the recap covers the whole
  // night, including matches played before a mid-session reshuffle.
  const recap = summariseSession(session);

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

        {recap.matchesPlayed > 0 && (
          <Stack gap={12} className="fs-fade-up" style={{ animationDelay: "0.04s" }}>
            <Group justify="space-between" align="baseline" gap={10} wrap="wrap">
              <Eyebrow>Matchday recap</Eyebrow>
              <Text className="tabular-nums" fz={12} c="dimmed" fw={600}>
                {recap.matchesPlayed} match{recap.matchesPlayed === 1 ? "" : "es"} ·{" "}
                {recap.totalGoals} goal{recap.totalGoals === 1 ? "" : "s"}
                {recap.biggestWin &&
                  ` · biggest win ${recap.biggestWin.home}–${recap.biggestWin.away}`}
              </Text>
            </Group>
            <Group align="stretch" gap={12} wrap="wrap">
              <SessionPodium
                title="Top Scorer"
                glyph="⚽"
                unit="goals"
                places={recap.scorerPodium}
                accent="var(--volt)"
              />
              <SessionPodium
                title="Top Assists"
                glyph="🅰"
                unit="assists"
                places={recap.assistPodium}
                accent="var(--team-blue)"
              />
              {/* Not a podium: at 4-a-side most of the pitch keeps a clean
                  sheet in any given match, so a top three would just be a long
                  list of names. The leader alone is the interesting part. */}
              <RecapCard
                label="Most clean sheets"
                glyph={KEEPER_GLYPH}
                unit="matches"
                leader={recap.mostCleanSheets}
                accent="var(--team-purple)"
              />
            </Group>
          </Stack>
        )}

        {recap.players.length > 0 && (
          <Stack gap={12} className="fs-fade-up" style={{ animationDelay: "0.06s" }}>
            <Group justify="space-between" align="baseline" gap={10} wrap="wrap">
              <Eyebrow>Everyone&apos;s night</Eyebrow>
              <Text fz={11} c="dimmed">
                Sorted by goals + assists
              </Text>
            </Group>
            <SessionStatsTable players={recap.players} basePath={basePath} />
          </Stack>
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
