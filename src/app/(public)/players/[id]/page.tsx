import { notFound } from "next/navigation";
import { getPlayerProfile } from "@/lib/playerProfile";
import { getActiveSeason, getSeasonLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { PlayerProfileView } from "@/components/views/PlayerProfileView";

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

  const seasonAwards = await prisma.award.findMany({
    where: { playerId: id, type: "mvp" },
    include: { season: true },
  });

  // A rating only means something relative to a field, so it's read back from
  // the active season's leaderboard rather than recomputed from this player alone.
  const activeSeason = await getActiveSeason();
  const seasonStats = activeSeason ? await getSeasonLeaderboard(activeSeason.id) : [];
  const ranked = seasonStats
    .filter((s) => s.matchesPlayed > 0)
    .sort((a, b) => b.rating - a.rating);
  const rankIndex = ranked.findIndex((s) => s.playerId === id);

  return (
    <PlayerProfileView
      data={{
        player: profile.player,
        totals: profile.activeSeason ?? profile.allTime,
        allTime: profile.allTime,
        totalsLabel: profile.activeSeason ? (profile.activeSeasonName ?? "Season") : "All-time",
        sessionHistory: profile.sessionHistory,
        seasonAwards: seasonAwards.map((a) => ({ id: a.id, seasonName: a.season.name })),
        rating:
          rankIndex >= 0
            ? {
                rating: ranked[rankIndex].rating,
                components: ranked[rankIndex].ratingComponents,
                rank: rankIndex + 1,
                fieldSize: ranked.length,
              }
            : null,
      }}
    />
  );
}
