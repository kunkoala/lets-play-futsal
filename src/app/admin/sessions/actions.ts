"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shuffleIntoTeams } from "@/lib/shuffle";
import { paletteFor } from "@/lib/teamPalette";

export type SessionFormState = { error: string } | undefined;

function toDateOnly(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createSession(
  _prevState: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireAdmin(); // convention: see src/lib/auth.ts's requireAdmin() doc comment

  const date = toDateOnly(formData.get("date"));
  if (!date) {
    return { error: "A valid date is required." };
  }

  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  });
  if (!activeSeason) {
    return { error: "No active season — create and activate a season first." };
  }
  if (date < activeSeason.startsOn || date > activeSeason.endsOn) {
    return {
      error: `Date must fall within the active season (${activeSeason.startsOn.toISOString().slice(0, 10)} to ${activeSeason.endsOn.toISOString().slice(0, 10)}).`,
    };
  }

  const session = await prisma.session.create({
    data: { seasonId: activeSeason.id, date, status: "draft" },
  });

  revalidatePath("/admin/sessions");
  redirect(`/admin/sessions/${session.id}`);
}

export async function deleteSession(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session || session.status !== "draft") return; // only draft sessions may be deleted

  await prisma.session.delete({ where: { id } });
  revalidatePath("/admin/sessions");
}

export async function saveAttendance(
  _prevState: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireAdmin();

  const sessionId = Number(formData.get("sessionId"));
  if (!Number.isInteger(sessionId)) return { error: "Invalid session." };

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };
  if (session.status !== "draft") {
    return { error: "Attendance is locked — unlock the session first." };
  }

  const playerIds = formData
    .getAll("playerId")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  // Re-saving attendance invalidates any existing shuffle (rosters could
  // reference players no longer checked in) — Team cascades to TeamPlayer.
  await prisma.$transaction([
    prisma.team.deleteMany({ where: { sessionId } }),
    prisma.attendance.deleteMany({ where: { sessionId } }),
    prisma.attendance.createMany({
      data: playerIds.map((playerId) => ({ sessionId, playerId })),
    }),
  ]);

  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function shuffleTeams(
  _prevState: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireAdmin();

  const sessionId = Number(formData.get("sessionId"));
  const teamSize = Number(formData.get("teamSize"));
  if (!Number.isInteger(sessionId)) return { error: "Invalid session." };
  if (!Number.isInteger(teamSize) || teamSize < 1) {
    return { error: "Team size must be a positive whole number." };
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };
  if (session.status !== "draft") {
    return { error: "Teams are locked — unlock the session first." };
  }

  const attendance = await prisma.attendance.findMany({
    where: { sessionId },
    select: { playerId: true },
  });

  let teams: number[][];
  try {
    teams = shuffleIntoTeams(
      attendance.map((a) => a.playerId),
      teamSize,
    );
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not shuffle teams.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.team.deleteMany({ where: { sessionId } }); // cascades TeamPlayer
    for (const [index, roster] of teams.entries()) {
      const { name, color } = paletteFor(index);
      const team = await tx.team.create({ data: { sessionId, name, color } });
      await tx.teamPlayer.createMany({
        data: roster.map((playerId) => ({ teamId: team.id, playerId })),
      });
    }
  });

  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function lockTeams(
  _prevState: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireAdmin();

  const sessionId = Number(formData.get("sessionId"));
  if (!Number.isInteger(sessionId)) return { error: "Invalid session." };

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };
  if (session.status !== "draft") {
    return { error: "Session is not in the check-in stage." };
  }

  const teamCount = await prisma.team.count({ where: { sessionId } });
  if (teamCount < 2) {
    return { error: "Shuffle into teams before locking." };
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: "teams_set" },
  });
  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function unlockTeams(
  _prevState: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireAdmin();

  const sessionId = Number(formData.get("sessionId"));
  if (!Number.isInteger(sessionId)) return { error: "Invalid session." };

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };
  if (session.status !== "teams_set") {
    return { error: "Session is not locked." };
  }

  const matchCount = await prisma.match.count({ where: { sessionId } });
  if (matchCount > 0) {
    return { error: "Can't unlock — matches have already been recorded for this session." };
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: "draft" },
  });
  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function startMatch(
  _prevState: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireAdmin();

  const sessionId = Number(formData.get("sessionId"));
  const homeTeamId = Number(formData.get("homeTeamId"));
  const awayTeamId = Number(formData.get("awayTeamId"));
  if (![sessionId, homeTeamId, awayTeamId].every(Number.isInteger)) {
    return { error: "Invalid input." };
  }
  if (homeTeamId === awayTeamId) {
    return { error: "Pick two different teams." };
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };
  if (session.status !== "teams_set") {
    return { error: "Session is not ready for matches." };
  }

  const inProgress = await prisma.match.findFirst({
    where: { sessionId, status: "in_progress" },
  });
  if (inProgress) return { error: "A match is already in progress." };

  const [homeTeam, awayTeam] = await Promise.all([
    prisma.team.findUnique({ where: { id: homeTeamId } }),
    prisma.team.findUnique({ where: { id: awayTeamId } }),
  ]);
  if (!homeTeam || homeTeam.sessionId !== sessionId || !awayTeam || awayTeam.sessionId !== sessionId) {
    return { error: "Invalid teams for this session." };
  }

  const lastMatch = await prisma.match.findFirst({
    where: { sessionId },
    orderBy: { seq: "desc" },
  });
  const seq = (lastMatch?.seq ?? 0) + 1;

  const match = await prisma.match.create({
    data: { sessionId, seq, homeTeamId, awayTeamId, status: "in_progress" },
  });

  redirect(`/admin/sessions/${sessionId}/live?matchId=${match.id}`);
}

export async function completeSession(
  _prevState: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireAdmin();

  const sessionId = Number(formData.get("sessionId"));
  if (!Number.isInteger(sessionId)) return { error: "Invalid session." };

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };
  if (session.status !== "teams_set") {
    return { error: "Session is not ready to complete." };
  }

  const inProgress = await prisma.match.findFirst({
    where: { sessionId, status: "in_progress" },
  });
  if (inProgress) return { error: "Finish the in-progress match first." };

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: "completed" },
  });
  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function reopenSession(
  _prevState: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireAdmin();

  const sessionId = Number(formData.get("sessionId"));
  if (!Number.isInteger(sessionId)) return { error: "Invalid session." };

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };
  if (session.status !== "completed") {
    return { error: "Session is not completed." };
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: "teams_set" },
  });
  revalidatePath(`/admin/sessions/${sessionId}`);
}
