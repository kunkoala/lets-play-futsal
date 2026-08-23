import { getDemoSeason, getDemoSessions } from "@/lib/demoData";
import { summariseSession } from "@/lib/sessionRecap";
import { SessionsView } from "@/components/views/SessionsView";

export default function DemoSessionsPage() {
  return (
    <SessionsView
      sessions={getDemoSessions().map((s) => ({
        id: s.id,
        date: s.date,
        status: s.status,
        attendeeCount: s.attendances.length,
        mvpName: s.mvpPlayer?.name ?? null,
        topScorer: summariseSession(s).topScorer,
      }))}
      seasonName={getDemoSeason().name}
      basePath="/demo"
    />
  );
}
