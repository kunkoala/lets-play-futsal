import { Badge, Container, Group, Stack, Table, Text, Title } from "@mantine/core";
import { getAllSeasons, getSeasonLeaderboard, type PlayerSeasonStats } from "@/lib/leaderboard";
import { NavLink } from "@/components/NavLink";

const SORT_OPTIONS = [
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
  { value: "wins", label: "Wins" },
  { value: "winRate", label: "Win rate" },
] as const;
type SortField = (typeof SORT_OPTIONS)[number]["value"];

function sortValue(stats: PlayerSeasonStats, field: SortField): number {
  return stats[field];
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
      <Container size="sm" py="xl">
        <Title order={1}>Let&apos;s Play Futsal</Title>
        <Text c="dimmed" mt="sm">
          No seasons yet — check back once the admin sets one up.
        </Text>
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
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Let&apos;s Play Futsal</Title>
          <Text c="dimmed">Season leaderboard</Text>
        </div>

        {seasons.length > 1 && (
          <Group gap="xs">
            {seasons.map((s) => (
              <NavLink
                key={s.id}
                href={`/?season=${s.id}&sort=${sort}`}
                fw={s.id === selectedSeason.id ? 700 : 400}
              >
                {s.name}
              </NavLink>
            ))}
          </Group>
        )}

        <Group gap="xs">
          {SORT_OPTIONS.map((o) => (
            <NavLink
              key={o.value}
              href={`/?season=${selectedSeason.id}&sort=${o.value}`}
              fw={o.value === sort ? 700 : 400}
            >
              {o.label}
            </NavLink>
          ))}
        </Group>

        <div style={{ overflowX: "auto" }}>
          <Table verticalSpacing="sm" miw={480}>
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
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
                  <td>{i + 1}</td>
                  <td>
                    <NavLink href={`/players/${s.playerId}`}>
                      {s.name}
                    </NavLink>
                  </td>
                  <td>{s.goals}</td>
                  <td>{s.assists}</td>
                  <td>
                    {s.wins}-{s.draws}-{s.losses}
                  </td>
                  <td>{Math.round(s.winRate * 100)}%</td>
                  <td>
                    <Badge variant="light">{s.gamesPlayed}</Badge>
                  </td>
                </tr>
              ))}
              {ranked.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    No completed sessions yet this season.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Stack>
    </Container>
  );
}
