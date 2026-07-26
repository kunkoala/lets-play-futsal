/**
 * Public "what's happening right now" query — every currently in-progress
 * match, across every session, with enough to render a spectator scoreboard
 * (score, clock, goal feed) without an admin session. Usually zero or one
 * result: a single admin runs game day, but nothing stops two sessions from
 * both having a live match at once, so this returns all of them rather than
 * assuming exactly one.
 */
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// The live banner (every public page, via the layout) and the /live page
// itself both need this; `cache()` means visiting /live only runs the query
// once per request instead of once per component.
export const getLiveMatches = cache(async () => {
  return prisma.match.findMany({
    where: { status: "in_progress" },
    include: {
      homeTeam: true,
      awayTeam: true,
      goalEvents: { include: { scorer: true, assist: true }, orderBy: { seq: "asc" } },
      session: { select: { id: true, date: true, season: { select: { name: true } } } },
    },
    orderBy: { startedAt: "asc" },
  });
});

export type LiveMatch = Awaited<ReturnType<typeof getLiveMatches>>[number];
