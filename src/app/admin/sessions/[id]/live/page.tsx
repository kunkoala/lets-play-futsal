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
    homeTeam: true,
    awayTeam: true,
    // Who is actually on the pitch for THIS match — not the team's current
    // roster, which may already have been edited for the next one.
    lineup: { include: { player: true } },
    goalEvents: true,
    // The date is for the phone scoreboard's eyebrow ("Matchday … · Match n");
    // attendances feed the substitution picker.
    session: { select: { date: true, attendances: { include: { player: true } } } },
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

  const lineupFor = (teamId: number) =>
    match.lineup
      .filter((m) => m.teamId === teamId)
      .map((m) => ({ id: m.player.id, name: m.player.name, isKeeper: m.isKeeper }))
      // Alphabetical, and only that: a keeper change mid-match must not
      // reshuffle the tiles someone is tapping to record goals.
      .sort((a, b) => a.name.localeCompare(b.name));

  const homeTeam = {
    id: match.homeTeam.id,
    name: match.homeTeam.name,
    color: match.homeTeam.color,
    players: lineupFor(match.homeTeam.id),
  };
  const awayTeam = {
    id: match.awayTeam.id,
    name: match.awayTeam.name,
    color: match.awayTeam.color,
    players: lineupFor(match.awayTeam.id),
  };

  // Anyone who turned up but isn't on the pitch right now — the pool a
  // substitution can draw from. Includes players rostered to the third team
  // sitting this one out, which is exactly who covers for someone tired.
  const onPitch = new Set(match.lineup.map((m) => m.playerId));
  const available = match.session.attendances
    .filter((a) => !onPitch.has(a.playerId))
    .map((a) => ({ id: a.player.id, name: a.player.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

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
      available={available}
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
