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
import type { PlayerSessionHistoryRow } from "@/lib/playerProfile";

import { PanelTabs } from "@/components/PanelTabs";
import { RatingCard } from "@/components/RatingCard";
import { formatPlusMinus, formatRate, type PlayerStats } from "@/lib/stats";
import type { RatingPoint } from "@/lib/ratingHistory";
import { PlayerProgressCharts } from "@/components/PlayerProgressCharts";
import type { EvaluatedAchievement } from "@/lib/achievements";
import type { KeeperPref } from "@/lib/shuffle";
import { keeperPrefBadge, keeperPrefLabel } from "@/lib/keeperPref";
import { KeeperChip } from "@/components/KeeperChip";
import { AchievementBadges } from "@/components/AchievementBadges";

import { NavLink } from "@/components/NavLink";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { FormGuide } from "@/components/FormGuide";
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

/** Label + value on one line — the compact rows under the headline tiles. */
function StatLine({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="sm">
      <Text fz={12} c="dimmed" fw={600}>
        {label}
        {hint && (
          <Text span fz={11} c="dimmed" fw={400}>
            {" "}
            {hint}
          </Text>
        )}
      </Text>
      <Text className="tabular-nums" fz={13} fw={700} style={{ flexShrink: 0 }}>
        {value}
      </Text>
    </Group>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 14,
        background: "var(--panel)",
        padding: "14px 16px",
      }}
    >
      {children}
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

/** What the rating card shows; omitted when the player has no rating yet. */
export type ProfileRating = {
  rating: number;
  /** 1-based position in the season. */
  rank: number;
  fieldSize: number;
};

export type ProfileData = {
  player: {
    id: number;
    name: string;
    isActive: boolean;
    keeperPref: KeeperPref;
  };
  /** Headline block — the active season where there is one, otherwise all-time. */
  totals: PlayerStats;
  /** All-time totals for the summary strip. */
  allTime: PlayerStats;
  /** Heading above the headline tiles, e.g. the season name or "All-time". */
  totalsLabel: string;
  sessionHistory: PlayerSessionHistoryRow[];
  /** Season-MVP trophies won, shown as chips by the name. */
  seasonAwards: { id: number; seasonName: string }[];
  rating: ProfileRating | null;
  /**
   * Rating/rank at each matchday this season, oldest first — feeds the charts
   * and the "since last session" line. Empty for a player with no history.
   */
  progress: RatingPoint[];
  /** All 23 achievements, all-time scope, locked and unlocked alike. */
  achievements: EvaluatedAchievement[];
};

export function PlayerProfileView({
  data,
  basePath = "",
}: {
  data: ProfileData;
  basePath?: string;
}) {
  const profile = data;
  const mvpAwards = data.seasonAwards;
  const seasonEntry = data.rating;
  const totals: PlayerStats = data.totals;
  const winRate = Math.round(totals.winRate * 100);
  const usual = usualTeam(profile.sessionHistory);
  const at = profile.allTime;
  const keeperBadge = keeperPrefBadge(profile.player.keeperPref);
  // Derived here rather than passed in: the profile already has the full
  // series, and "the last two points" is not worth a second prop.
  const movement =
    data.progress.length >= 2
      ? {
          ratingDelta:
            data.progress[data.progress.length - 1].rating -
            data.progress[data.progress.length - 2].rating,
          rankDelta:
            data.progress[data.progress.length - 2].ranks.rating -
            data.progress[data.progress.length - 1].ranks.rating,
        }
      : null;

  return (
    <Container size="lg" py={{ base: 20, sm: 32 }} pb={64}>
      <NavLink
        href={basePath || "/"}
        c="dimmed"
        fz={13}
        underline="never"
        mb={16}
        display="inline-block"
      >
        <Group gap={5} wrap="nowrap" component="span" align="center">
          <ArrowLeft size={14} weight="bold" />
          <span>Leaderboard</span>
        </Group>
      </NavLink>

      {/* Identity sits above the tabs: whose profile this is stays true in
          every view, so it would only flicker in and out if it moved inside. */}
      <Stack gap={16} className="fs-fade-up">
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
                  {at.gamesPlayed} matchdays
                </Text>
              </Group>
              {keeperBadge && (
                <Text
                  fz={11}
                  fw={700}
                  c="dimmed"
                  mt={4}
                  title={keeperPrefLabel(profile.player.keeperPref)}
                >
                  {keeperBadge} · {keeperPrefLabel(profile.player.keeperPref)}
                </Text>
              )}
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
                      🏆 MVP · {a.seasonName}
                    </Box>
                  ))}
                </Group>
              )}
            </Box>
          </Group>
        </Box>

        <PanelTabs
          tabs={[
            {
              value: "overview",
              label: "Overview",
              content: (
                <Stack gap={16}>
                  {seasonEntry && (
                    <RatingCard
                      rating={seasonEntry.rating}
                      rank={seasonEntry.rank}
                      fieldSize={seasonEntry.fieldSize}
                      movement={movement}
                    />
                  )}

                  <Stack gap={10}>
                    <Eyebrow>{data.totalsLabel}</Eyebrow>
                    <Group gap={10} wrap="nowrap">
                      <StatTile label="GOALS" value={totals.goals} accent />
                      <StatTile label="ASSISTS" value={totals.assists} />
                      <StatTile label="G+A" value={totals.goalContributions} />
                    </Group>
                    <Group gap={10} wrap="nowrap">
                      <StatTile label="POINTS" value={totals.points} />
                      <StatTile label="WINS" value={totals.wins} />
                      <StatTile label="MVP" value={totals.mvps} />
                    </Group>
                  </Stack>

                  <SessionHistory history={profile.sessionHistory} basePath={basePath} />

                  <AchievementBadges achievements={data.achievements} />
                </Stack>
              ),
            },
            {
              value: "progress",
              label: "Progress",
              content: (
                <Stack gap={16}>
                  {data.progress.length >= 2 ? (
                    <PlayerProgressCharts points={data.progress} />
                  ) : (
                    <Text fz={14} c="dimmed">
                      Charts appear once there are two matchdays to compare.
                    </Text>
                  )}

                  <Card>
                    <Stack gap={9}>
                      <Group justify="space-between" wrap="nowrap" gap="sm">
                        <Text fz={12} c="dimmed" fw={600}>
                          Form
                        </Text>
                        <FormGuide form={totals.form} size={18} />
                      </Group>
                      <StatLine
                        label="Goals"
                        hint="per match"
                        value={formatRate(totals.goalsPerMatch)}
                      />
                      <StatLine
                        label="Assists"
                        hint="per match"
                        value={formatRate(totals.assistsPerMatch)}
                      />
                      <StatLine
                        label="G+A"
                        hint="per match"
                        value={formatRate(totals.contributionsPerMatch)}
                      />
                      <StatLine
                        label="Points"
                        hint="per match"
                        value={formatRate(totals.pointsPerMatch)}
                      />
                      {/* Clean sheets live in the keeper card below, now that they
                    belong to whoever was in goal rather than the whole team. */}
                      <StatLine label="Goal difference" value={formatPlusMinus(totals.plusMinus)} />
                      <StatLine
                        label="Record"
                        value={`${totals.wins}W ${totals.draws}D ${totals.losses}L · ${winRate}%`}
                      />
                      {(totals.braces > 0 || totals.hatTricks > 0) && (
                        <StatLine
                          label="Multi-goal games"
                          value={`${totals.braces} brace${totals.braces === 1 ? "" : "s"} · ${totals.hatTricks} hat-trick${totals.hatTricks === 1 ? "" : "s"}`}
                        />
                      )}
                    </Stack>
                  </Card>

                  {/* Keeper card — only for someone who has actually gone in goal. */}
                  {totals.keeperMatches > 0 && (
                    <Card>
                      <Stack gap={9}>
                        <Eyebrow>In goal</Eyebrow>
                        <StatLine label="Matches kept" value={totals.keeperMatches} />
                        <StatLine label="Goals conceded" value={totals.keeperConceded} />
                        <StatLine
                          label="Conceded"
                          hint="per match"
                          value={formatRate(totals.concededPerKeeperMatch)}
                        />
                        <StatLine label="Clean sheets" value={totals.cleanSheets} />
                      </Stack>
                    </Card>
                  )}

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
                        {at.matchesPlayed > 0 && (
                          <Text span c="dimmed" fw={500}>
                            {" "}
                            · {Math.round(at.winRate * 100)}% win
                          </Text>
                        )}
                        {at.mvps > 0 && (
                          <Text span c="dimmed" fw={500}>
                            {" "}
                            · {at.mvps} MVP
                          </Text>
                        )}
                      </Text>
                    </Group>
                  </Box>
                </Stack>
              ),
            },
          ]}
        />
      </Stack>
    </Container>
  );
}

/**
 * Matchday-by-matchday: which team, goals, assists, and whether they were that
 * day's MVP. Lives on the overview tab because it's the same story as the
 * headline totals, told one matchday at a time — the totals say what, this says
 * when.
 */
function SessionHistory({
  history,
  basePath,
}: {
  history: PlayerSessionHistoryRow[];
  basePath: string;
}) {
  return (
    <Stack gap={10}>
      <Eyebrow>Session history</Eyebrow>
      <Box
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
                <Th>🏆</Th>
              </TableTr>
            </TableThead>
            <TableTbody>
              {history.map((row) => (
                <TableTr key={row.sessionId}>
                  <TableTd>
                    <NavLink
                      href={`${basePath}/sessions/${row.sessionId}`}
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
                        {row.keeper && <KeeperChip title="Kept goal that matchday" />}
                      </Group>
                    ) : (
                      <Text c="dimmed">—</Text>
                    )}
                  </TableTd>
                  <Td accent={row.goals > 0}>{row.goals}</Td>
                  <Td>{row.assists}</Td>
                  <Td accent={row.mvp}>{row.mvp ? "🏆" : "—"}</Td>
                </TableTr>
              ))}
              {history.length === 0 && (
                <TableTr>
                  <TableTd colSpan={5}>
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
    </Stack>
  );
}

function Th({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "left" | "center";
}) {
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
