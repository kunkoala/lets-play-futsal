import type { Metadata } from "next";
import { getLiveMatches } from "@/lib/liveMatches";
import { LiveTickerView, type LiveTickerMatch } from "@/components/views/LiveTickerView";

export const metadata: Metadata = {
  title: "Live · Liga Minggu",
  description: "Whatever match is being played right now, live.",
};

export default async function LivePage() {
  const matches = await getLiveMatches();

  const ticker: LiveTickerMatch[] = matches.map((m) => ({
    id: m.id,
    matchLabel: `Matchday ${m.session.date.toISOString().slice(0, 10)} · ${m.session.season.name} · Match ${m.seq}`,
    sessionId: m.session.id,
    homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name, color: m.homeTeam.color },
    awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name, color: m.awayTeam.color },
    goalEvents: m.goalEvents.map((e) => ({
      id: e.id,
      teamId: e.teamId,
      scorer: e.scorer,
      assist: e.assist,
      matchSec: e.matchSec,
    })),
    clock: {
      startedAt: m.startedAt.getTime(),
      durationSec: m.durationSec,
      pausedAt: m.pausedAt?.getTime() ?? null,
      pausedTotalSec: m.pausedTotalSec,
      breakTakenAt: m.breakTakenAt?.getTime() ?? null,
    },
  }));

  return <LiveTickerView matches={ticker} serverNow={Date.now()} />;
}
