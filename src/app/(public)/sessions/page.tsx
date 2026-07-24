import { getActiveSeason } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { SessionsView } from "@/components/views/SessionsView";

export default async function PublicSessionsPage() {
  const activeSeason = await getActiveSeason();
  const sessions = activeSeason
    ? await prisma.session.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { date: "desc" },
        include: { _count: { select: { attendances: true } } },
      })
    : [];

  return (
    <SessionsView
      sessions={sessions.map((s) => ({
        id: s.id,
        date: s.date,
        status: s.status,
        attendeeCount: s._count.attendances,
      }))}
      seasonName={activeSeason?.name ?? null}
    />
  );
}
