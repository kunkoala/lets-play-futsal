import { getDemoLeaderboard, getDemoMovements, getDemoSeason } from "@/lib/demoData";
import { LeaderboardView } from "@/components/views/LeaderboardView";

export default async function DemoLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; per?: string; page?: string }>;
}) {
  const params = await searchParams;
  const season = getDemoSeason();

  return (
    <LeaderboardView
      stats={getDemoLeaderboard()}
      // One season only, so the switcher stays hidden.
      seasons={[season]}
      selectedSeason={season}
      searchParams={params}
      basePath="/demo"
      movements={getDemoMovements()}
    />
  );
}
