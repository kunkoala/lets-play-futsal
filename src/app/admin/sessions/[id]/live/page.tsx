import { notFound, redirect } from "next/navigation";
import { Container, Stack, Title } from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";
import { LiveConsole } from "./LiveConsole";

export default async function LiveMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ matchId?: string }>;
}) {
  await requireAdmin(); // convention: see src/lib/auth.ts's requireAdmin() doc comment

  const { id: sessionIdParam } = await params;
  const sessionId = Number(sessionIdParam);
  if (!Number.isInteger(sessionId)) notFound();

  const { matchId: matchIdParam } = await searchParams;

  const include = {
    homeTeam: { include: { players: { include: { player: true } } } },
    awayTeam: { include: { players: { include: { player: true } } } },
    goalEvents: true,
  } as const;

  const match = matchIdParam
    ? await prisma.match.findUnique({ where: { id: Number(matchIdParam) }, include })
    : await prisma.match.findFirst({
        where: { sessionId, status: "in_progress" },
        include,
      });

  if (!match || match.sessionId !== sessionId) {
    redirect(`/admin/sessions/${sessionId}`);
  }

  const homeTeam = {
    id: match.homeTeam.id,
    name: match.homeTeam.name,
    color: match.homeTeam.color,
    players: match.homeTeam.players.map((tp) => ({ id: tp.player.id, name: tp.player.name })),
  };
  const awayTeam = {
    id: match.awayTeam.id,
    name: match.awayTeam.name,
    color: match.awayTeam.color,
    players: match.awayTeam.players.map((tp) => ({ id: tp.player.id, name: tp.player.name })),
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <NavLink href={`/admin/sessions/${sessionId}`} size="sm">
            &larr; Back to session
          </NavLink>
          <Title order={1}>Live match</Title>
        </div>
        <LiveConsole
          matchId={match.id}
          sessionId={sessionId}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          events={match.goalEvents}
          isFinished={match.status === "finished"}
        />
      </Stack>
    </Container>
  );
}
