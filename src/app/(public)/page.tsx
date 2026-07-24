import { Badge, Box, Card, Container, Group, Stack, Table, Text, Title } from "@mantine/core";
import { getAllSeasons, getSeasonLeaderboard, type PlayerSeasonStats } from "@/lib/leaderboard";
import { NavLink, NavButton } from "@/components/NavLink";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  SoccerBall,
  Target,
  Fire,
  TrendUp,
  Medal,
  Trophy,
  CalendarBlank,
  ArrowRight,
} from "@/components/icons";

const SORT_OPTIONS = [
  { value: "goals", label: "Goals", Icon: SoccerBall },
  { value: "assists", label: "Assists", Icon: Target },
  { value: "wins", label: "Wins", Icon: Fire },
  { value: "winRate", label: "Win rate", Icon: TrendUp },
] as const;
type SortField = (typeof SORT_OPTIONS)[number]["value"];

// Gold / silver / bronze tiers for the top three ranks (theme.ts palette).
const MEDAL_COLOR = ["gold.6", "silver.6", "bronze.6"] as const;

function sortValue(stats: PlayerSeasonStats, field: SortField): number {
  return stats[field];
}

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
      fw={active ? 700 : 500}
      px="md"
      py={6}
      style={{
        borderRadius: 999,
        fontSize: "var(--mantine-font-size-sm)",
        backgroundColor: active ? "var(--mantine-color-teal-light)" : "transparent",
        color: active
          ? "var(--mantine-color-teal-light-color)"
          : "var(--mantine-color-dimmed)",
        border: active
          ? "1px solid transparent"
          : "1px solid var(--mantine-color-default-border)",
        transition: "background-color 0.15s ease, border-color 0.15s ease",
      }}
    >
      {children}
    </NavLink>
  );
}

function Hero() {
  return (
    <Box py={{ base: 40, sm: 64 }}>
      <Stack gap="lg" align="flex-start" className="fs-fade-up">
        <Badge
          size="lg"
          radius="sm"
          variant="light"
          color="teal"
          leftSection={<SoccerBall size={14} weight="fill" />}
        >
          Weekly community futsal
        </Badge>
        <Title order={1} fz={{ base: 40, sm: 60 }} lh={1.05} fw={800} maw={720}>
          Show up, get shuffled,{" "}
          <span className="fs-gradient-text">climb the leaderboard</span>.
        </Title>
        <Text c="dimmed" fz={{ base: "md", sm: "lg" }} maw={620}>
          Every week we split into random teams and play. The app tracks your
          goals, assists, and wins all season long — then crowns the ones who
          showed up and delivered.
        </Text>
        <Group gap="sm" mt="xs">
          <NavButton href="/sessions" size="md" color="teal" rightSection={<ArrowRight size={16} weight="bold" />}>
            View sessions
          </NavButton>
          <NavButton
            href="/awards"
            size="md"
            variant="default"
            leftSection={<Trophy size={16} weight="fill" />}
          >
            Season awards
          </NavButton>
        </Group>
      </Stack>
    </Box>
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
      <Container size="md">
        <Hero />
        <Text c="dimmed">No seasons yet — check back once the admin sets one up.</Text>
      </Container>
    );
  }

  const selectedSeasonId = Number(seasonParam) || seasons.find((s) => s.isActive)?.id || seasons[0].id;
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId) ?? seasons[0];
  const sort: SortField = SORT_OPTIONS.some((o) => o.value === sortParam)
    ? (sortParam as SortField)
    : "goals";

  const stats = await getSeasonLeaderboard(selectedSeason.id);
  const ranked = [...stats].sort((a, b) => sortValue(b, sort) - sortValue(a, sort));

  return (
    <Container size="md" pb="xl">
      <Hero />

      <Stack gap="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          <div>
            <Group gap={8}>
              <CalendarBlank size={22} weight="fill" color="var(--mantine-color-teal-6)" />
              <Title order={2} fz={{ base: 22, sm: 26 }}>
                Leaderboard
              </Title>
            </Group>
            <Text c="dimmed" size="sm" mt={2}>
              {selectedSeason.name}
            </Text>
          </div>

          {seasons.length > 1 && (
            <Group gap={6}>
              {seasons.map((s) => (
                <Pill key={s.id} href={`/?season=${s.id}&sort=${sort}`} active={s.id === selectedSeason.id}>
                  {s.name}
                </Pill>
              ))}
            </Group>
          )}
        </Group>

        <Group gap={6}>
          {SORT_OPTIONS.map(({ value, label, Icon }) => (
            <Pill key={value} href={`/?season=${selectedSeason.id}&sort=${value}`} active={value === sort}>
              <Group gap={6} wrap="nowrap" component="span">
                <Icon size={15} weight={value === sort ? "fill" : "regular"} />
                <span>{label}</span>
              </Group>
            </Pill>
          ))}
        </Group>

        <Card withBorder radius="lg" p={0} className="fs-fade-up" style={{ animationDelay: "0.05s" }}>
          <div style={{ overflowX: "auto" }}>
          <Table verticalSpacing="md" horizontalSpacing="lg" miw={560} highlightOnHover w="100%">
            <thead>
              <tr>
                <th style={{ width: 56 }}>#</th>
                <th style={{ textAlign: "left" }}>Player</th>
                <th>Goals</th>
                <th>Assists</th>
                <th>W-D-L</th>
                <th>Win rate</th>
                <th>Games</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((s, i) => (
                <tr key={s.playerId}>
                  <td>
                    {i < 3 ? (
                      <Medal size={26} weight="fill" color={`var(--mantine-color-${MEDAL_COLOR[i].replace(".", "-")})`} />
                    ) : (
                      <Text fw={700} c="dimmed" pl={6}>
                        {i + 1}
                      </Text>
                    )}
                  </td>
                  <td>
                    <Group gap="xs" wrap="nowrap">
                      <PlayerAvatar name={s.name} size={30} />
                      <NavLink href={`/players/${s.playerId}`} fw={600} c="inherit" underline="hover">
                        {s.name}
                      </NavLink>
                    </Group>
                  </td>
                  <td>
                    <Text fw={sort === "goals" ? 700 : 400}>{s.goals}</Text>
                  </td>
                  <td>
                    <Text fw={sort === "assists" ? 700 : 400}>{s.assists}</Text>
                  </td>
                  <td>
                    {s.wins}-{s.draws}-{s.losses}
                  </td>
                  <td>
                    <Text fw={sort === "winRate" ? 700 : 400}>{Math.round(s.winRate * 100)}%</Text>
                  </td>
                  <td>
                    <Badge variant="default" radius="sm">
                      {s.gamesPlayed}
                    </Badge>
                  </td>
                </tr>
              ))}
              {ranked.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <Text c="dimmed" py="md">
                      No completed sessions yet this season.
                    </Text>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          </div>
        </Card>
      </Stack>
    </Container>
  );
}
