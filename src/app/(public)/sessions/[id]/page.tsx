import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SessionDetailView } from "@/components/views/SessionDetailView";

export default async function PublicSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) notFound();

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      season: true,
      teams: {
        include: { players: { include: { player: true } } },
        orderBy: { id: "asc" },
      },
      matches: {
        include: {
          homeTeam: true,
          awayTeam: true,
          mvpPlayer: true,
          goalEvents: { include: { scorer: true, assist: true }, orderBy: { seq: "asc" } },
        },
        orderBy: { seq: "asc" },
      },
    },
  });
  if (!session) notFound();

  return <SessionDetailView session={session} />;
}
