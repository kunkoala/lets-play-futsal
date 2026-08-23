import { getActiveSeason } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { summariseSession } from "@/lib/sessionRecap";
import { SessionsView } from "@/components/views/SessionsView";

export default async function PublicSessionsPage() {
  const activeSeason = await getActiveSeason();
  // Lineups and goal events come along so each row can show that matchday's top
  // scorer. A season is a few dozen sessions of six short matches, so pulling
  // the events is cheaper than a second round of per-session queries.
  const sessions = activeSeason
    ? await prisma.session.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { date: "desc" },
        include: {
          _count: { select: { attendances: true } },
          mvpPlayer: true,
          matches: {
            include: {
              lineup: { include: { player: true } },
              goalEvents: { include: { scorer: true, assist: true } },
            },
          },
        },
      })
    : [];

  return (
    <SessionsView
      sessions={sessions.map((s) => {
        const recap = summariseSession(s);
        return {
          id: s.id,
          date: s.date,
          status: s.status,
          attendeeCount: s._count.attendances,
          mvpName: s.mvpPlayer?.name ?? null,
          topScorer: recap.topScorer,
          topAssister: recap.topAssister,
          mostCleanSheets: recap.mostCleanSheets,
          totalGoals: recap.totalGoals,
          matchesPlayed: recap.matchesPlayed,
        };
      })}
      seasonName={activeSeason?.name ?? null}
    />
  );
}
