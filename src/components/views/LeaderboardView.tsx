// Compound components (`Table.Thead`, `Grid.Col`) lose their statics across the
// Server Component boundary and render as undefined ("Element type is invalid").
// Mantine's fix is to import the sub-components by name — same components,
// server-safe. https://mantine.dev/guides/next/#compound-components-in-server-components
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
import type { PlayerSeasonStats } from "@/lib/leaderboard";
import { formatPlusMinus } from "@/lib/stats";
import { formatRating, PRIOR_MATCHES } from "@/lib/rating";
import { NavLink } from "@/components/NavLink";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { FormGuide } from "@/components/FormGuide";
import { StatTooltip } from "@/components/StatTooltip";

const SORT_OPTIONS = [
  { value: "rating", label: "Rating" },
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
  { value: "goalContributions", label: "G+A" },
  { value: "points", label: "Points" },
  { value: "wins", label: "Wins" },
  { value: "winRate", label: "Win%" },
  { value: "mvps", label: "MVP" },
] as const;
type SortField = (typeof SORT_OPTIONS)[number]["value"];

/** Rows per page. `0` means "show everyone" — fine at this club's scale. */
const PER_PAGE_OPTIONS = [15, 30, 0] as const;
const DEFAULT_PER_PAGE = 15;

function sortValue(s: PlayerSeasonStats, field: SortField): number {
  return s[field];
}

/**
 * What each column means, shown on hover/tap. Written for someone who plays on
 * a Sunday, not for someone who reads the source.
 */
const COLUMN_HELP: Record<string, string> = {
  rank: "Position in this season's standings, by whichever column is currently highlighted.",
  player: "Tap a name for that player's full profile and match-by-match history.",
  rating: `Overall rating out of 100, blending every stat on this page. Match MVPs are worth 20% of it; goals, assists, points, win rate and matchdays make up the other 80%. Per-match rates are steadied against the league average for the first ${PRIOR_MATCHES} matches, so one big game doesn't top the table.`,
  goals: "Goals scored. Own goals count on the scoreboard but aren't credited to anyone.",
  assists: "Assists — the pass before a goal, when there was one.",
  goalContributions: "Goals plus assists: total attacking output, counting a goal and an assist equally.",
  wins: "Matches won. Individual matches, not whole matchdays.",
  draws: "Matches that finished level.",
  losses: "Matches lost.",
  points: "Football scoring: 3 points for a win, 1 for a draw, nothing for a loss.",
  plusMinus:
    "Goal difference while you were on the pitch — your team's goals scored minus goals conceded, added up across every match.",
  cleanSheets: "Matches where your team conceded nothing. Counts for the whole team, not just the keeper.",
  mvps: "Man-of-the-match awards, picked by the admin at the end of each match.",
  winRate: "Share of matches won. Draws count as neither a win nor a loss here.",
  form: "Your last five results, oldest on the left. Green is a win, yellow a draw, red a loss.",
};

/** Volt outline pill — sort tabs, page size, and the season switcher share this treatment. */
function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      href={href}
      underline="never"
      fw={active ? 800 : 600}
      fz={13}
      px={14}
      py={7}
      style={{
        borderRadius: 20,
        whiteSpace: "nowrap",
        color: active ? "var(--volt)" : "var(--text-muted)",
        backgroundColor: active ? "rgba(200,255,47,0.10)" : "transparent",
        border: active ? "1px solid var(--volt)" : "1px solid var(--hairline)",
        transition: "color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease",
      }}
    >
      {children}
    </NavLink>
  );
}

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
 * Season leader hero — volt gradient banner with the giant rating numeral.
 * Rating leads because it's the number that decides the season MVP; goals and
 * assists ride along underneath as supporting detail.
 */
function RatingHero({ leader }: { leader: PlayerSeasonStats | null }) {
  if (!leader) return null;
  return (
    <Box
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 22,
        padding: "24px 26px 26px",
        color: "#0D0F14",
        background: "linear-gradient(155deg, var(--volt) 0%, var(--volt-end) 100%)",
        boxShadow: "0 12px 30px -12px rgba(200,255,47,.6)",
      }}
    >
      <Box
        aria-hidden
        style={{
          position: "absolute",
          right: -20,
          bottom: -46,
          fontSize: 190,
          lineHeight: 1,
          opacity: 0.14,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        ★
      </Box>
      <Group
        justify="space-between"
        align="flex-end"
        wrap="wrap"
        gap="md"
        style={{ position: "relative" }}
      >
        <Stack gap={4}>
          <Text
            component="div"
            fw={800}
            fz={10}
            style={{ letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.7 }}
          >
            Top rated · Leads the MVP race
          </Text>
          <Text
            component="div"
            className="display-face"
            fw={800}
            fz={{ base: 24, sm: 30 }}
            style={{ letterSpacing: "-0.02em", lineHeight: 1.05 }}
          >
            {leader.name}
          </Text>
          <Text component="div" fw={700} fz={13} style={{ opacity: 0.82 }}>
            {leader.goals} goals · {leader.assists} assists · {leader.mvps} MVP
            {leader.mvps === 1 ? "" : "s"} · {leader.matchesPlayed} matches
          </Text>
        </Stack>
        <Group align="flex-end" gap={6} wrap="nowrap">
          <Text
            component="div"
            className="display-face tabular-nums"
            fw={900}
            fz={{ base: 64, sm: 76 }}
            style={{ lineHeight: 0.78 }}
          >
            {formatRating(leader.rating)}
          </Text>
          <Text component="div" fw={700} fz={13} style={{ opacity: 0.72, paddingBottom: 6 }}>
            /100
          </Text>
        </Group>
      </Group>
    </Box>
  );
}

/** Compact highlight card — one per award category, in the band under the hero. */
function LeaderCard({
  eyebrow,
  glyph,
  leader,
  unit,
  accent,
}: {
  eyebrow: string;
  glyph: string;
  leader: { name: string; value: number } | null;
  unit: string;
  accent: string;
}) {
  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 16,
        background: "var(--panel)",
        padding: "14px 16px",
      }}
    >
      <Eyebrow>
        {glyph} {eyebrow}
      </Eyebrow>
      {leader ? (
        <Group justify="space-between" align="flex-end" wrap="nowrap" gap="xs" mt={8}>
          <Text fw={700} fz={15} truncate style={{ letterSpacing: "-0.01em", minWidth: 0 }}>
            {leader.name}
          </Text>
          <Group gap={4} align="flex-end" wrap="nowrap" style={{ flexShrink: 0 }}>
            <Text
              className="display-face tabular-nums"
              fw={900}
              fz={26}
              style={{ lineHeight: 0.9, color: accent }}
            >
              {leader.value}
            </Text>
            <Text c="dimmed" fw={600} fz={10} style={{ paddingBottom: 2 }}>
              {unit}
            </Text>
          </Group>
        </Group>
      ) : (
        <Text c="dimmed" fz={13} mt={8}>
          —
        </Text>
      )}
    </Box>
  );
}

/** Highest value for `field` among players with a positive total, or null. */
function leaderBy(
  stats: PlayerSeasonStats[],
  field: "goals" | "assists" | "wins" | "mvps" | "cleanSheets",
): { name: string; value: number } | null {
  const best = [...stats]
    .filter((s) => s[field] > 0)
    .sort((a, b) => b[field] - a[field])[0];
  return best ? { name: best.name, value: best[field] } : null;
}

function Th({
  children,
  sorted,
  style,
  help,
}: {
  children: React.ReactNode;
  sorted?: boolean;
  style?: React.CSSProperties;
  /** Key into COLUMN_HELP — every column has one. */
  help: string;
}) {
  return (
    <TableTh
      style={{
        textAlign: "center",
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: sorted ? "var(--volt)" : "var(--text-muted)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <StatTooltip label={COLUMN_HELP[help]}>{children}</StatTooltip>
    </TableTh>
  );
}

function Stat({ value, active }: { value: string | number; active?: boolean }) {
  return (
    <TableTd style={{ textAlign: "center" }}>
      <Text
        className="tabular-nums"
        fw={active ? 800 : 500}
        fz={14}
        style={active ? { color: "var(--volt)" } : undefined}
        c={active ? undefined : "var(--mantine-color-text)"}
      >
        {value}
      </Text>
    </TableTd>
  );
}

/**
 * Standings. One table at every width, with columns revealed as space allows
 * rather than two hand-maintained variants — the phone gets the five that
 * matter, an iPad fills in the rest, desktop shows everything.
 */
function StandingsTable({
  rows,
  sort,
  startRank,
  basePath,
}: {
  rows: PlayerSeasonStats[];
  sort: SortField;
  /** 0-based index of the first row, so rank numbers survive pagination. */
  startRank: number;
  basePath: string;
}) {
  return (
    <Box
      className="lb-scroll-fade"
      style={{
        position: "relative",
        border: "1px solid var(--hairline)",
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--panel)",
      }}
    >
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <Table
          verticalSpacing={10}
          horizontalSpacing="sm"
          highlightOnHover
          style={{ minWidth: 780 }}
        >
          <TableThead>
            <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
              <Th help="rank" style={{ width: 42 }}>
                #
              </Th>
              <Th help="player" style={{ textAlign: "left" }}>
                Player
              </Th>
              <Th help="rating" sorted={sort === "rating"}>
                RTG
              </Th>
              <Th help="goals" sorted={sort === "goals"}>
                G
              </Th>
              <Th help="assists" sorted={sort === "assists"}>
                A
              </Th>
              <Th help="goalContributions" sorted={sort === "goalContributions"}>
                G+A
              </Th>
              <Th help="wins" sorted={sort === "wins"}>
                W
              </Th>
              <Th help="draws">D</Th>
              <Th help="losses">L</Th>
              <Th help="points" sorted={sort === "points"}>
                PTS
              </Th>
              <Th help="plusMinus">+/−</Th>
              <Th help="cleanSheets">CS</Th>
              <Th help="mvps" sorted={sort === "mvps"}>
                🏆
              </Th>
              <Th help="winRate" sorted={sort === "winRate"}>
                Win%
              </Th>
              <Th help="form">Form</Th>
            </TableTr>
          </TableThead>
          <TableTbody>
            {rows.map((s, i) => {
              const rank = startRank + i + 1;
              return (
                <TableTr key={s.playerId}>
                  <TableTd style={{ textAlign: "center" }}>
                    <Text
                      className="tabular-nums"
                      fw={rank === 1 ? 900 : 700}
                      fz={15}
                      c={rank === 1 ? undefined : "dimmed"}
                      style={rank === 1 ? { color: "var(--volt)" } : undefined}
                    >
                      {rank}
                    </Text>
                  </TableTd>
                  <TableTd>
                    <Group gap={10} wrap="nowrap">
                      <PlayerAvatar name={s.name} size={30} />
                      <NavLink
                        href={`${basePath}/players/${s.playerId}`}
                        fw={600}
                        fz={14}
                        c="inherit"
                        underline="hover"
                      >
                        {s.name}
                      </NavLink>
                    </Group>
                  </TableTd>
                  <TableTd style={{ textAlign: "center" }}>
                    <Text
                      className="tabular-nums"
                      fw={sort === "rating" ? 800 : 700}
                      fz={14}
                      style={{ color: sort === "rating" ? "var(--volt)" : "var(--text)" }}
                    >
                      {s.matchesPlayed > 0 ? formatRating(s.rating) : "—"}
                    </Text>
                  </TableTd>
                  <Stat value={s.goals} active={sort === "goals"} />
                  <Stat value={s.assists} active={sort === "assists"} />
                  <Stat value={s.goalContributions} active={sort === "goalContributions"} />
                  <Stat value={s.wins} active={sort === "wins"} />
                  <Stat value={s.draws} />
                  <Stat value={s.losses} />
                  <Stat value={s.points} active={sort === "points"} />
                  <Stat value={formatPlusMinus(s.plusMinus)} />
                  <Stat value={s.cleanSheets} />
                  <Stat value={s.mvps} active={sort === "mvps"} />
                  <Stat value={`${Math.round(s.winRate * 100)}%`} active={sort === "winRate"} />
                  <TableTd style={{ textAlign: "center" }}>
                    <FormGuide form={s.form} size={18} />
                  </TableTd>
                </TableTr>
              );
            })}
            {rows.length === 0 && (
              <TableTr>
                <TableTd colSpan={15}>
                  <Text c="dimmed" py="md" ta="center" fz={14}>
                    No completed sessions yet this season.
                  </Text>
                </TableTd>
              </TableTr>
            )}
          </TableTbody>
        </Table>
      </div>
    </Box>
  );
}

export type LeaderboardSeason = { id: number; name: string };

/**
 * The standings screen, rendered from data the caller supplies. `/` feeds it
 * the database; `/demo` feeds it the generated season — same component, so the
 * demo can't drift away from the real thing.
 *
 * `basePath` is "" for the real site and "/demo" for the demo, and prefixes
 * every link so navigation stays inside whichever one you're in.
 */
export function LeaderboardView({
  stats,
  seasons,
  selectedSeason,
  searchParams: { sort: sortParam, per: perParam, page: pageParam },
  basePath = "",
}: {
  stats: PlayerSeasonStats[];
  seasons: LeaderboardSeason[];
  selectedSeason: LeaderboardSeason;
  searchParams: { sort?: string; per?: string; page?: string };
  basePath?: string;
}) {
  const sort: SortField = SORT_OPTIONS.some((o) => o.value === sortParam)
    ? (sortParam as SortField)
    : "rating";
  const perPage = PER_PAGE_OPTIONS.find((o) => o === Number(perParam)) ?? DEFAULT_PER_PAGE;

  const ranked = [...stats].sort((a, b) => sortValue(b, sort) - sortValue(a, sort));

  const totalPages = perPage > 0 ? Math.max(1, Math.ceil(ranked.length / perPage)) : 1;
  const page = Math.min(Math.max(Number(pageParam) || 1, 1), totalPages);
  const startRank = perPage > 0 ? (page - 1) * perPage : 0;
  const visible = perPage > 0 ? ranked.slice(startRank, startRank + perPage) : ranked;

  /** Changing season, sort, or page size always returns to page 1. */
  const link = (overrides: { sort?: SortField; season?: number; per?: number; page?: number }) => {
    const query = new URLSearchParams({
      season: String(overrides.season ?? selectedSeason.id),
      sort: overrides.sort ?? sort,
      per: String(overrides.per ?? perPage),
      page: String(overrides.page ?? 1),
    });
    return `${basePath || "/"}?${query}`;
  };

  const topRated = ranked.find((s) => s.matchesPlayed > 0)
    ? [...stats].sort((a, b) => b.rating - a.rating)[0]
    : null;

  return (
    <Container size="lg" py={{ base: 20, sm: 32 }} pb={64}>
      {/* Screen header — title + season switcher */}
      <Group justify="space-between" align="center" mb={20} wrap="wrap" gap="sm">
        <div>
          <Eyebrow>Season standings</Eyebrow>
          <Text
            component="h1"
            className="display-face"
            fw={900}
            fz={{ base: 26, sm: 32 }}
            style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
          >
            LEADERBOARD
          </Text>
          <Text c="dimmed" fz={13} mt={4}>
            {selectedSeason.name}
          </Text>
        </div>
        {seasons.length > 1 && (
          <Group gap={6}>
            {seasons.map((s) => (
              <Pill
                key={s.id}
                href={link({ season: s.id })}
                active={s.id === selectedSeason.id}
              >
                {s.name}
              </Pill>
            ))}
          </Group>
        )}
      </Group>

      <Stack gap={16}>
        {/* Highlights — full-width band above the standings at every size */}
        <Box className="fs-fade-up">
          <RatingHero leader={topRated} />
        </Box>
        <Box className="lb-cards fs-fade-up" style={{ animationDelay: "0.05s" }}>
          <LeaderCard
            eyebrow="Top Scorer"
            glyph="⚽"
            leader={leaderBy(stats, "goals")}
            unit="goals"
            accent="var(--volt)"
          />
          <LeaderCard
            eyebrow="Top Assists"
            glyph="A"
            leader={leaderBy(stats, "assists")}
            unit="assists"
            accent="var(--team-blue)"
          />
          <LeaderCard
            eyebrow="Most Wins"
            glyph="🥇"
            leader={leaderBy(stats, "wins")}
            unit="wins"
            accent="var(--team-green)"
          />
          <LeaderCard
            eyebrow="Most MVPs"
            glyph="🏆"
            leader={leaderBy(stats, "mvps")}
            unit="MVPs"
            accent="var(--team-yellow)"
          />
          <LeaderCard
            eyebrow="Clean Sheets"
            glyph="🧤"
            leader={leaderBy(stats, "cleanSheets")}
            unit="CS"
            accent="var(--team-purple)"
          />
        </Box>

        {/* Standings — sort tabs, table, pagination */}
        <Group gap={6} mt={4}>
          {SORT_OPTIONS.map(({ value, label }) => (
            <Pill key={value} href={link({ sort: value })} active={value === sort}>
              {label}
            </Pill>
          ))}
        </Group>

        <Box className="fs-fade-up" style={{ animationDelay: "0.1s" }}>
          <StandingsTable rows={visible} sort={sort} startRank={startRank} basePath={basePath} />
        </Box>

        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap={6} align="center">
            <Text fz={12} c="dimmed" fw={600}>
              Rows
            </Text>
            {PER_PAGE_OPTIONS.map((option) => (
              <Pill
                key={option}
                href={link({ per: option })}
                active={option === perPage}
              >
                {option === 0 ? "All" : option}
              </Pill>
            ))}
          </Group>

          {totalPages > 1 && (
            <Group gap={6} align="center">
              <Text fz={12} c="dimmed" className="tabular-nums">
                {startRank + 1}–{startRank + visible.length} of {ranked.length}
              </Text>
              <Pill href={link({ page: Math.max(1, page - 1) })} active={false}>
                ‹ Prev
              </Pill>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Pill key={n} href={link({ page: n })} active={n === page}>
                  {n}
                </Pill>
              ))}
              <Pill href={link({ page: Math.min(totalPages, page + 1) })} active={false}>
                Next ›
              </Pill>
            </Group>
          )}
        </Group>
      </Stack>
    </Container>
  );
}
