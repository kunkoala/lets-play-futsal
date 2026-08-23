import { getDemoLeaderboard, getDemoRatingHistory, getDemoSeason } from "@/lib/demoData";
import { mostImproved } from "@/lib/ratingHistory";
import { AwardsView } from "@/components/views/AwardsView";

export default function DemoAwardsPage() {
  return (
    <AwardsView
      stats={getDemoLeaderboard()}
      seasonName={getDemoSeason().name}
      basePath="/demo"
      improved={mostImproved(getDemoRatingHistory())}
    />
  );
}
