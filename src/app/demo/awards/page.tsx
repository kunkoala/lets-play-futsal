import { getDemoLeaderboard, getDemoSeason } from "@/lib/demoData";
import { AwardsView } from "@/components/views/AwardsView";

export default function DemoAwardsPage() {
  return (
    <AwardsView
      stats={getDemoLeaderboard()}
      seasonName={getDemoSeason().name}
      basePath="/demo"
    />
  );
}
