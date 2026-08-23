import { getActiveSeason } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { summariseSession } from "@/lib/sessionRecap";
import { SessionsView } from "@/components/views/SessionsView";

export default async function PublicSessionsPage() {
  const activeSeason = await getActiveSeason();
  // Teams and goal events come along so each row can show that night's top
  // scorer. A season is a few dozen sessions of six short matches, so pulling
  // the events is cheaper than a second round of per-session queries.
  const sessions = activeSeason
    ? await prisma.session.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { date: "desc" },
        include: {
          _count: { select: { attendances: true } },
          mvpPlayer: true,
          teams: { include: { players: { include: { player: true } } } },
          matches: { include: { goalEvents: { include: { scorer: true, assist: true } } } },
        },
      })
    : [];

  return (
    <SessionsView
      sessions={sessions.map((s) => ({
        id: s.id,
        date: s.date,
        status: s.status,
        attendeeCount: s._count.attendances,
        mvpName: s.mvpPlayer?.name ?? null,
        topScorer: summariseSession(s).topScorer,
      }))}
      seasonName={activeSeason?.name ?? null}
    />
  );
}
