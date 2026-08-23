import { notFound } from "next/navigation";
import { getDemoLeaderboard, getDemoPlayerProfile, getDemoRatingHistory } from "@/lib/demoData";
import { evaluateAchievements } from "@/lib/achievements";
import { PlayerProfileView } from "@/components/views/PlayerProfileView";

export default async function DemoPlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  const profile = getDemoPlayerProfile(id);
  if (!profile) notFound();

  const ranked = getDemoLeaderboard()
    .filter((s) => s.matchesPlayed > 0)
    .sort((a, b) => b.rating - a.rating);
  const rankIndex = ranked.findIndex((s) => s.playerId === id);
  const achievements = evaluateAchievements({
    ...profile.totals,
    ...profile.extraSignals,
    rating: rankIndex >= 0 ? ranked[rankIndex].rating : 0,
  });

  return (
    <PlayerProfileView
      basePath="/demo"
      data={{
        player: profile.player,
        // The demo is a single season, so its totals are also its all-time.
        totals: profile.totals,
        allTime: profile.totals,
        totalsLabel: profile.seasonName,
        sessionHistory: profile.history.map((row) => ({
          ...row,
          seasonId: 0,
        })),
        seasonAwards: [],
        progress: getDemoRatingHistory().get(id)?.points ?? [],
        achievements,
        rating:
          rankIndex >= 0
            ? {
                rating: ranked[rankIndex].rating,
                rank: rankIndex + 1,
                fieldSize: ranked.length,
              }
            : null,
      }}
    />
  );
}
