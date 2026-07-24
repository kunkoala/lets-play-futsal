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
import { getAllSeasons, getSeasonLeaderboard, type PlayerSeasonStats } from "@/lib/leaderboard";
import { NavLink } from "@/components/NavLink";
import { PlayerAvatar } from "@/components/PlayerAvatar";

const SORT_OPTIONS = [
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
  { value: "wins", label: "Wins" },
  { value: "winRate", label: "Win%" },
] as const;
type SortField = (typeof SORT_OPTIONS)[number]["value"];

function sortValue(s: PlayerSeasonStats, field: SortField): number {
  return s[field];
}

/** Volt outline pill — sort tabs and the season switcher share this treatment. */
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
        border: active
          ? "1px solid var(--volt)"
          : "1px solid var(--hairline)",
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

/** Top-scorer spotlight hero — volt gradient card with the giant goal numeral. */
function Spotlight({ leader, desktop }: { leader: PlayerSeasonStats | null; desktop?: boolean }) {
  if (!leader) return null;
  return (
    <Box
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 22,
        padding: desktop ? "30px 32px" : "24px 24px 26px",
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
          bottom: -34,
          fontSize: 190,
          lineHeight: 1,
          opacity: 0.14,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        ⚽
      </Box>
      <Stack gap={desktop ? 6 : 4} style={{ position: "relative" }}>
        <Text
          component="div"
          fw={800}
          fz={10}
          style={{ letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.7 }}
        >
          Top Scorer
        </Text>
        <Text
          component="div"
          className="display-face"
          fw={800}
          fz={desktop ? 26 : 22}
          style={{ letterSpacing: "-0.02em", lineHeight: 1.05 }}
        >
          {leader.name}
        </Text>
        <Group align="flex-end" gap={14} wrap="nowrap" mt={desktop ? 6 : 4}>
          <Text
            component="div"
            className="display-face tabular-nums"
            fw={900}
            fz={desktop ? 80 : 72}
            style={{ lineHeight: 0.78 }}
          >
            {leader.goals}
          </Text>
          <Text component="div" fw={700} fz={13} style={{ opacity: 0.82, paddingBottom: 6 }}>
            goals
            <br />
            {leader.gamesPlayed} games · {leader.assists} assists
          </Text>
        </Group>
      </Stack>
    </Box>
  );
}

/**
 * Secondary highlight card (Top Assists / Most Wins) — compact panel with an
 * accent-colored numeral, sitting under the top-scorer hero in the left column.
 */
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
  if (!leader) return null;
  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 16,
        background: "var(--panel)",
        padding: "16px 18px",
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" gap="md">
        <Box style={{ minWidth: 0 }}>
          <Eyebrow>
            {glyph} {eyebrow}
          </Eyebrow>
          <Text
            fw={700}
            fz={17}
            mt={4}
            truncate
            style={{ letterSpacing: "-0.01em" }}
          >
            {leader.name}
          </Text>
        </Box>
        <Group gap={5} align="flex-end" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text
            className="display-face tabular-nums"
            fw={900}
            fz={34}
            style={{ lineHeight: 0.9, color: accent }}
          >
            {leader.value}
          </Text>
          <Text c="dimmed" fw={600} fz={11} style={{ paddingBottom: 3 }}>
            {unit}
          </Text>
        </Group>
      </Group>
    </Box>
  );
}

/** Highest value for `field` among players with a positive total, or null. */
function leaderBy(
  stats: PlayerSeasonStats[],
  field: "goals" | "assists" | "wins",
): { name: string; value: number } | null {
  const best = [...stats]
    .filter((s) => s[field] > 0)
    .sort((a, b) => b[field] - a[field])[0];
  return best ? { name: best.name, value: best[field] } : null;
}

function StandingsTable({
  ranked,
  sort,
  wide,
}: {
  ranked: PlayerSeasonStats[];
  sort: SortField;
  wide: boolean;
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
      <div style={{ overflowX: "auto" }}>
        <Table
          verticalSpacing={10}
          horizontalSpacing={wide ? "lg" : "sm"}
          highlightOnHover
          w="100%"
          style={{ tableLayout: "auto" }}
        >
          <TableThead>
            <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
              <Th style={{ width: 44, textAlign: "center" }}>#</Th>
              <Th style={{ textAlign: "left" }}>Player</Th>
              <Th sorted={sort === "goals"}>G</Th>
              <Th sorted={sort === "assists"}>A</Th>
              <Th sorted={sort === "wins"}>W</Th>
              {wide && <Th>D</Th>}
              {wide && <Th>L</Th>}
              <Th sorted={sort === "winRate"} visibleFrom={wide ? undefined : "xs"}>
                Win%
              </Th>
            </TableTr>
          </TableThead>
          <TableTbody>
            {ranked.map((s, i) => (
              <TableTr key={s.playerId}>
                <TableTd style={{ textAlign: "center" }}>
                  <Text
                    className="tabular-nums"
                    fw={i === 0 ? 900 : 700}
                    fz={15}
                    c={i === 0 ? undefined : "dimmed"}
                    style={i === 0 ? { color: "var(--volt)" } : undefined}
                  >
                    {i + 1}
                  </Text>
                </TableTd>
                <TableTd>
                  <Group gap={10} wrap="nowrap">
                    <PlayerAvatar name={s.name} size={30} />
                    <NavLink
                      href={`/players/${s.playerId}`}
                      fw={600}
                      fz={14}
                      c="inherit"
                      underline="hover"
                    >
                      {s.name}
                    </NavLink>
                  </Group>
                </TableTd>
                <Stat value={s.goals} active={sort === "goals"} />
                <Stat value={s.assists} active={sort === "assists"} />
                <Stat value={s.wins} active={sort === "wins"} />
                {wide && <Stat value={s.draws} />}
                {wide && <Stat value={s.losses} />}
                <Stat
                  value={`${Math.round(s.winRate * 100)}%`}
                  active={sort === "winRate"}
                  visibleFrom={wide ? undefined : "xs"}
                />
              </TableTr>
            ))}
            {ranked.length === 0 && (
              <TableTr>
                <TableTd colSpan={wide ? 8 : 6}>
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

function Th({
  children,
  sorted,
  style,
  visibleFrom,
}: {
  children: React.ReactNode;
  sorted?: boolean;
  style?: React.CSSProperties;
  visibleFrom?: string;
}) {
  return (
    <TableTh
      visibleFrom={visibleFrom}
      style={{
        textAlign: "center",
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: sorted ? "var(--volt)" : "var(--text-muted)",
        ...style,
      }}
    >
      {children}
    </TableTh>
  );
}

function Stat({
  value,
  active,
  visibleFrom,
}: {
  value: string | number;
  active?: boolean;
  visibleFrom?: string;
}) {
  return (
    <TableTd visibleFrom={visibleFrom} style={{ textAlign: "center" }}>
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

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; sort?: string }>;
}) {
  const { season: seasonParam, sort: sortParam } = await searchParams;
  const seasons = await getAllSeasons();

  if (seasons.length === 0) {
    return (
      <Container size="lg" py={48}>
        <Text c="dimmed">No seasons yet — check back once the admin sets one up.</Text>
      </Container>
    );
  }

  const selectedSeasonId =
    Number(seasonParam) || seasons.find((s) => s.isActive)?.id || seasons[0].id;
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId) ?? seasons[0];
  const sort: SortField = SORT_OPTIONS.some((o) => o.value === sortParam)
    ? (sortParam as SortField)
    : "goals";

  const stats = await getSeasonLeaderboard(selectedSeason.id);
  const ranked = [...stats].sort((a, b) => sortValue(b, sort) - sortValue(a, sort));
  const topScorer =
    [...stats].sort((a, b) => b.goals - a.goals).find((s) => s.goals > 0) ?? null;
  const topAssister = leaderBy(stats, "assists");
  const topWinner = leaderBy(stats, "wins");

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
                href={`/?season=${s.id}&sort=${sort}`}
                active={s.id === selectedSeason.id}
              >
                {s.name}
              </Pill>
            ))}
          </Group>
        )}
      </Group>

      <div className="lb-grid">
        {/* Highlight cards — left column on desktop, stacked above table on phone */}
        <div className="lb-left fs-fade-up">
          <Box hiddenFrom="lg">
            <Spotlight leader={topScorer} />
          </Box>
          <Box visibleFrom="lg">
            <Spotlight leader={topScorer} desktop />
          </Box>
          <LeaderCard
            eyebrow="Top Assists"
            glyph="🅰"
            leader={topAssister}
            unit="assists"
            accent="var(--team-blue)"
          />
          <LeaderCard
            eyebrow="Most Wins"
            glyph="🥇"
            leader={topWinner}
            unit="wins"
            accent="var(--team-green)"
          />
        </div>

        {/* Standings — tabs + table */}
        <div>
          <Stack gap={14}>
            <Group gap={6}>
              {SORT_OPTIONS.map(({ value, label }) => (
                <Pill
                  key={value}
                  href={`/?season=${selectedSeason.id}&sort=${value}`}
                  active={value === sort}
                >
                  {label}
                </Pill>
              ))}
            </Group>
            {/* Wide table on desktop, dense on phone */}
            <Box visibleFrom="lg" className="fs-fade-up" style={{ animationDelay: "0.05s" }}>
              <StandingsTable ranked={ranked} sort={sort} wide />
            </Box>
            <Box hiddenFrom="lg" className="fs-fade-up" style={{ animationDelay: "0.05s" }}>
              <StandingsTable ranked={ranked} sort={sort} wide={false} />
            </Box>
          </Stack>
        </div>
      </div>
    </Container>
  );
}
