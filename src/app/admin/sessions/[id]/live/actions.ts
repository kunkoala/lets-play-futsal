"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { elapsedSec, type MatchClock } from "@/lib/matchClock";

export type GoalActionState = { error: string } | { eventId: number } | undefined;
export type MatchFormState = { error: string } | undefined;

async function nextEventSeq(matchId: number): Promise<number> {
  const last = await prisma.goalEvent.findFirst({
    where: { matchId },
    orderBy: { seq: "desc" },
  });
  return (last?.seq ?? 0) + 1;
}

/**
 * Elapsed match time right now, for stamping onto a goal as it's recorded.
 * Snapshotted at write time because reconstructing it later would need every
 * pause window the match ever had — see GoalEvent.matchSec in schema.prisma.
 */
function currentMatchSec(match: MatchClock): number {
  return elapsedSec(match, Date.now());
}

/**
 * Whether this player was on the pitch for this team in this match.
 *
 * Checked against the match lineup rather than the team roster: after a
 * substitution the two differ, and a goal has to be creditable to whoever was
 * actually playing at the time.
 */
async function assertRostered(
  matchId: number,
  teamId: number,
  playerId: number,
): Promise<boolean> {
  const spot = await prisma.matchPlayer.findUnique({
    where: { matchId_playerId: { matchId, playerId } },
  });
  return spot !== null && spot.teamId === teamId;
}

export async function recordGoal(
  _prevState: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  await requireAdmin(); // convention: see src/lib/auth.ts's requireAdmin() doc comment

  const matchId = Number(formData.get("matchId"));
  const teamId = Number(formData.get("teamId"));
  const scorerId = Number(formData.get("scorerId"));
  if (![matchId, teamId, scorerId].every(Number.isInteger)) {
    return { error: "Invalid input." };
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Match not found." };
  if (match.status !== "in_progress") return { error: "Match is not in progress." };
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    return { error: "Invalid team for this match." };
  }
  if (!(await assertRostered(matchId, teamId, scorerId))) {
    return { error: "Player is not in that team's lineup for this match." };
  }

  const seq = await nextEventSeq(matchId);
  const matchSec = currentMatchSec({
    startedAt: match.startedAt.getTime(),
    durationSec: match.durationSec,
    pausedAt: match.pausedAt?.getTime() ?? null,
    pausedTotalSec: match.pausedTotalSec,
    breakTakenAt: match.breakTakenAt?.getTime() ?? null,
  });
  const event = await prisma.goalEvent.create({
    data: { matchId, seq, teamId, scorerId, matchSec },
  });

  revalidatePath(`/admin/sessions/${match.sessionId}/live`);
  return { eventId: event.id };
}

export async function recordOwnGoal(
  _prevState: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  const teamId = Number(formData.get("teamId"));
  if (!Number.isInteger(matchId) || !Number.isInteger(teamId)) {
    return { error: "Invalid input." };
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Match not found." };
  if (match.status !== "in_progress") return { error: "Match is not in progress." };
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    return { error: "Invalid team for this match." };
  }

  const seq = await nextEventSeq(matchId);
  const matchSec = currentMatchSec({
    startedAt: match.startedAt.getTime(),
    durationSec: match.durationSec,
    pausedAt: match.pausedAt?.getTime() ?? null,
    pausedTotalSec: match.pausedTotalSec,
    breakTakenAt: match.breakTakenAt?.getTime() ?? null,
  });
  const event = await prisma.goalEvent.create({
    data: { matchId, seq, teamId, scorerId: null, assistId: null, matchSec },
  });

  revalidatePath(`/admin/sessions/${match.sessionId}/live`);
  return { eventId: event.id };
}

export async function attachAssist(formData: FormData): Promise<void> {
  await requireAdmin();

  const eventId = Number(formData.get("eventId"));
  const assistId = Number(formData.get("assistId"));
  if (!Number.isInteger(eventId) || !Number.isInteger(assistId)) return;

  const event = await prisma.goalEvent.findUnique({ where: { id: eventId } });
  if (!event) return;
  if (assistId === event.scorerId) return; // can't assist your own goal
  if (!(await assertRostered(event.matchId, event.teamId, assistId))) return;

  await prisma.goalEvent.update({ where: { id: eventId }, data: { assistId } });

  const match = await prisma.match.findUnique({ where: { id: event.matchId } });
  if (match) revalidatePath(`/admin/sessions/${match.sessionId}/live`);
}

export async function undoLastEvent(formData: FormData): Promise<void> {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  if (!Number.isInteger(matchId)) return;

  const lastEvent = await prisma.goalEvent.findFirst({
    where: { matchId },
    orderBy: { seq: "desc" },
  });
  if (!lastEvent) return;

  await prisma.goalEvent.delete({ where: { id: lastEvent.id } });

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (match) revalidatePath(`/admin/sessions/${match.sessionId}/live`);
}

export async function deleteEvent(formData: FormData): Promise<void> {
  await requireAdmin();

  const eventId = Number(formData.get("eventId"));
  if (!Number.isInteger(eventId)) return;

  const event = await prisma.goalEvent.findUnique({ where: { id: eventId } });
  if (!event) return;

  await prisma.goalEvent.delete({ where: { id: eventId } });

  const match = await prisma.match.findUnique({ where: { id: event.matchId } });
  if (match) revalidatePath(`/admin/sessions/${match.sessionId}/live`);
}

/**
 * Stops the clock for the halfway water break.
 *
 * The client notices the midpoint and calls this; the server is what makes it
 * stick, so a reload — or the other admin's iPad — sees the same paused clock.
 * `breakTakenAt` is stamped here so resuming doesn't immediately trip the
 * break again, and the whole thing is a no-op if the clock is already paused
 * or the break was already taken (two devices can race to call it).
 */
export async function pauseForBreak(formData: FormData): Promise<void> {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  if (!Number.isInteger(matchId)) return;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return;
  if (match.status !== "in_progress") return;
  if (match.pausedAt !== null || match.breakTakenAt !== null) return;

  const now = new Date();
  await prisma.match.update({
    where: { id: matchId },
    data: { pausedAt: now, breakTakenAt: now },
  });

  revalidatePath(`/admin/sessions/${match.sessionId}/live`);
}

/**
 * Restarts the clock after the water break, folding however long the break
 * actually ran into `pausedTotalSec` so the second half still gets its full
 * share of the planned duration.
 */
export async function resumeMatch(formData: FormData): Promise<void> {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  if (!Number.isInteger(matchId)) return;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return;
  if (match.status !== "in_progress") return;
  if (match.pausedAt === null) return; // already running

  const pausedSec = Math.max(0, Math.floor((Date.now() - match.pausedAt.getTime()) / 1000));
  await prisma.match.update({
    where: { id: matchId },
    data: {
      pausedAt: null,
      pausedTotalSec: match.pausedTotalSec + pausedSec,
    },
  });

  revalidatePath(`/admin/sessions/${match.sessionId}/live`);
}

/**
 * Swaps a player off the pitch for one who isn't on it, in this match only.
 *
 * The whole point of `MatchPlayer` (see prisma/schema.prisma): before it,
 * "subbing" meant editing the session-scoped team roster, which retroactively
 * rewrote the results of every match that team had already played. Now the
 * change is confined to one match, and the next match starts from the team
 * roster again unless it is also subbed.
 *
 * Goals already scored are untouched — `goal_event` points at players
 * directly, so someone who scored and then went off keeps the goal, which is
 * what actually happened.
 *
 * The glove goes with the shirt: subbing off a keeper makes the replacement
 * the keeper, otherwise the team quietly plays a match with nobody in goal and
 * the clean-sheet numbers stop meaning anything.
 */
export async function substitutePlayer(
  _prevState: MatchFormState,
  formData: FormData,
): Promise<MatchFormState> {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  const offId = Number(formData.get("offPlayerId"));
  const onId = Number(formData.get("onPlayerId"));
  if (![matchId, offId, onId].every(Number.isInteger)) return { error: "Invalid input." };
  if (offId === onId) return { error: "Pick two different players." };

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Match not found." };
  // Finished matches stay editable: a sub the admin forgot to record while
  // refereeing is exactly the kind of thing fixed afterwards.
  if (match.status !== "in_progress" && match.status !== "finished") {
    return { error: "Match cannot be edited." };
  }

  const off = await prisma.matchPlayer.findUnique({
    where: { matchId_playerId: { matchId, playerId: offId } },
  });
  if (!off) return { error: "That player isn't in this match." };

  const alreadyOn = await prisma.matchPlayer.findUnique({
    where: { matchId_playerId: { matchId, playerId: onId } },
  });
  if (alreadyOn) return { error: "That player is already in this match." };

  const attended = await prisma.attendance.findUnique({
    where: { sessionId_playerId: { sessionId: match.sessionId, playerId: onId } },
  });
  if (!attended) return { error: "Only players marked present can come on." };

  await prisma.$transaction([
    prisma.matchPlayer.delete({
      where: { matchId_playerId: { matchId, playerId: offId } },
    }),
    prisma.matchPlayer.create({
      data: { matchId, playerId: onId, teamId: off.teamId, isKeeper: off.isKeeper },
    }),
  ]);

  revalidatePath(`/admin/sessions/${match.sessionId}/live`);
  revalidatePath(`/admin/sessions/${match.sessionId}`);
  return undefined;
}

export async function endMatch(
  _prevState: MatchFormState,
  formData: FormData,
): Promise<MatchFormState> {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  if (!Number.isInteger(matchId)) return { error: "Invalid match." };

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Match not found." };
  if (match.status !== "in_progress") return { error: "Match already finished." };

  await prisma.match.update({
    where: { id: matchId },
    data: { status: "finished", endedAt: new Date() },
  });

  revalidatePath(`/admin/sessions/${match.sessionId}`);
  redirect(`/admin/sessions/${match.sessionId}`);
}
