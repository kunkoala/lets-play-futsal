"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type GoalActionState = { error: string } | { eventId: number } | undefined;
export type MatchFormState = { error: string } | undefined;

async function nextEventSeq(matchId: number): Promise<number> {
  const last = await prisma.goalEvent.findFirst({
    where: { matchId },
    orderBy: { seq: "desc" },
  });
  return (last?.seq ?? 0) + 1;
}

async function assertRostered(teamId: number, playerId: number): Promise<boolean> {
  const rostered = await prisma.teamPlayer.findUnique({
    where: { teamId_playerId: { teamId, playerId } },
  });
  return rostered !== null;
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
  if (!(await assertRostered(teamId, scorerId))) {
    return { error: "Player is not on that team's roster." };
  }

  const seq = await nextEventSeq(matchId);
  const event = await prisma.goalEvent.create({
    data: { matchId, seq, teamId, scorerId },
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
  const event = await prisma.goalEvent.create({
    data: { matchId, seq, teamId, scorerId: null, assistId: null },
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
  if (!(await assertRostered(event.teamId, assistId))) return;

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
