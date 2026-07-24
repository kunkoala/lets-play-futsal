import { Container, Text } from "@mantine/core";
import { getAllSeasons, getSeasonLeaderboard } from "@/lib/leaderboard";
import { LeaderboardView } from "@/components/views/LeaderboardView";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; sort?: string; per?: string; page?: string }>;
}) {
  const params = await searchParams;
  const seasons = await getAllSeasons();

  if (seasons.length === 0) {
    return (
      <Container size="lg" py={48}>
        <Text c="dimmed">No seasons yet — check back once the admin sets one up.</Text>
      </Container>
    );
  }

  const selectedSeasonId =
    Number(params.season) || seasons.find((s) => s.isActive)?.id || seasons[0].id;
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId) ?? seasons[0];
  const stats = await getSeasonLeaderboard(selectedSeason.id);

  return (
    <LeaderboardView
      stats={stats}
      seasons={seasons}
      selectedSeason={selectedSeason}
      searchParams={params}
    />
  );
}
