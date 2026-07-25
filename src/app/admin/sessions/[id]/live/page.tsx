import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    // Only for the phone scoreboard's eyebrow ("Matchday … · Match n").
    session: { select: { date: true } },
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
    players: match.homeTeam.players.map((tp) => ({
      id: tp.player.id,
      name: tp.player.name,
      isKeeper: tp.isKeeper,
    })),
  };
  const awayTeam = {
    id: match.awayTeam.id,
    name: match.awayTeam.name,
    color: match.awayTeam.color,
    players: match.awayTeam.players.map((tp) => ({
      id: tp.player.id,
      name: tp.player.name,
      isKeeper: tp.isKeeper,
    })),
  };

  // `toISOString` keeps this UTC on both server and client — a locale-aware
  // format would differ between the two and trip a hydration mismatch.
  const matchLabel = `Matchday ${match.session.date.toISOString().slice(0, 10)} · Match ${match.seq}`;

  return (
    <LiveConsole
      matchId={match.id}
      sessionId={sessionId}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      events={match.goalEvents}
      isFinished={match.status === "finished"}
      matchLabel={matchLabel}
      // Timestamps as epoch milliseconds: the clock is derived arithmetic, and
      // numbers cross the server/client boundary without a Date round-trip.
      clock={{
        startedAt: match.startedAt.getTime(),
        durationSec: match.durationSec,
        pausedAt: match.pausedAt?.getTime() ?? null,
        pausedTotalSec: match.pausedTotalSec,
        breakTakenAt: match.breakTakenAt?.getTime() ?? null,
      }}
      // The server's idea of "now" seeds the first client render too, so the
      // hydrated markup matches what was sent instead of tripping a mismatch.
      serverNow={Date.now()}
    />
  );
}
