import { getDemoSeason, getDemoSessions } from "@/lib/demoData";
import { SessionsView } from "@/components/views/SessionsView";

export default function DemoSessionsPage() {
  return (
    <SessionsView
      sessions={getDemoSessions().map((s) => ({
        id: s.id,
        date: s.date,
        status: s.status,
        attendeeCount: s.attendances.length,
      }))}
      seasonName={getDemoSeason().name}
      basePath="/demo"
    />
  );
}
