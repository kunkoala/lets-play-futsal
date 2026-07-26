"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shuffleIntoBalancedTeams, type ShuffledTeam } from "@/lib/shuffle";
import { MAX_DURATION_MIN, MIN_DURATION_MIN } from "@/lib/matchClock";
import { paletteFor } from "@/lib/teamPalette";
import { getSeasonLeaderboard } from "@/lib/leaderboard";

/**
 * Each attendee's current-season rating, for the balanced shuffle to draft
 * by. Only players who've actually finished a match this season get a real
 * number — `ratePlayers` rates everyone else 0, which would wrongly sort a
 * brand-new player as "the worst" rather than an unknown; `shuffleIntoBalancedTeams`
 * treats anyone missing from this map as the pool's median instead.
 */
async function ratingsForAttendees(
  seasonId: number,
  playerIds: readonly number[],
): Promise<Map<number, number>> {
  const standings = await getSeasonLeaderboard(seasonId);
  const attending = new Set(playerIds);
  const ratings = new Map<number, number>();
  for (const p of standings) {
    if (attending.has(p.playerId) && p.matchesPlayed > 0) {
      ratings.set(p.playerId, p.rating);
    }
  }
  return ratings;
}

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
  if (!session) return;

  // Session -> Team/Match/GoalEvent/Attendance all cascade (see schema.prisma
  // referential-action notes), so this is safe at any status, including
  // completed — the confirm dialog on the client is what guards against
  // accidental loss of a night's recorded matches/stats.
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
    select: { player: { select: { id: true, keeperPref: true } } },
  });
  const candidates = attendance.map((a) => a.player);
  const ratings = await ratingsForAttendees(
    session.seasonId,
    candidates.map((c) => c.id),
  );

  let teams: ShuffledTeam[];
  try {
    teams = shuffleIntoBalancedTeams(candidates, teamSize, ratings);
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
        data: roster.playerIds.map((playerId) => ({
          teamId: team.id,
          playerId,
          isKeeper: playerId === roster.keeperId,
        })),
      });
    }
  });

  revalidatePath(`/admin/sessions/${sessionId}`);
}

/** Teams from the latest shuffle round for a session — see Team.generation
 *  in schema.prisma for why old rounds are never deleted. */
async function currentGenerationTeams(sessionId: number) {
  const teams = await prisma.team.findMany({ where: { sessionId } });
  const generation = teams.reduce((max, t) => Math.max(max, t.generation), 1);
  return teams.filter((t) => t.generation === generation);
}

/**
 * Reshuffles a session's teams mid-night — typically once the round robin
 * is done (see roundRobinComplete in matchmaker.ts) and the admin wants a
 * fresh, still-balanced split rather than replaying the same match-ups.
 * Unlike the initial shuffle, this never deletes existing Team rows: they're
 * attached to whatever matches/goal_events they already played, so a new
 * generation is added instead (see Team.generation).
 */
export async function reshuffleTeams(
  _prevState: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireAdmin();

  const sessionId = Number(formData.get("sessionId"));
  if (!Number.isInteger(sessionId)) return { error: "Invalid session." };

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };
  if (session.status !== "teams_set") {
    return { error: "Reshuffle only applies once teams are locked for the night." };
  }

  const currentTeams = await currentGenerationTeams(sessionId);
  if (currentTeams.length < 2) return { error: "No teams to reshuffle." };
  const nextGeneration = currentTeams[0].generation + 1;

  const attendance = await prisma.attendance.findMany({
    where: { sessionId },
    select: { player: { select: { id: true, keeperPref: true } } },
  });
  const candidates = attendance.map((a) => a.player);
  const ratings = await ratingsForAttendees(
    session.seasonId,
    candidates.map((c) => c.id),
  );

  // Keep the same number of teams the night already has, whatever attendance
  // happens to be now — `computeTeamSizes` derives team *count* from a target
  // size, so back-solve the size that yields today's team count.
  const teamSize = Math.max(1, Math.round(candidates.length / currentTeams.length));

  let teams: ShuffledTeam[];
  try {
    teams = shuffleIntoBalancedTeams(candidates, teamSize, ratings);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not reshuffle teams.",
    };
  }

  await prisma.$transaction(async (tx) => {
    for (const [index, roster] of teams.entries()) {
      const { name, color } = paletteFor(index);
      const team = await tx.team.create({
        data: { sessionId, name, color, generation: nextGeneration },
      });
      await tx.teamPlayer.createMany({
        data: roster.playerIds.map((playerId) => ({
          teamId: team.id,
          playerId,
          isKeeper: playerId === roster.keeperId,
        })),
      });
    }
  });

  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath(`/sessions/${sessionId}`);
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

  // Optional: a blank field starts an untimed match, which counts up and
  // never reaches full time. Anything present has to be a sane number of
  // minutes — the client offers presets, but this is the actual gate.
  const durationRaw = formData.get("durationMin");
  let durationSec: number | null = null;
  if (typeof durationRaw === "string" && durationRaw.trim() !== "") {
    const minutes = Number(durationRaw);
    if (!Number.isInteger(minutes) || minutes < MIN_DURATION_MIN || minutes > MAX_DURATION_MIN) {
      return {
        error: `Match length must be a whole number between ${MIN_DURATION_MIN} and ${MAX_DURATION_MIN} minutes.`,
      };
    }
    durationSec = minutes * 60;
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
    data: { sessionId, seq, homeTeamId, awayTeamId, status: "in_progress", durationSec },
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

export type RosterActionState = { error: string } | undefined;

/**
 * Moves a player onto a team — whether they're already rostered elsewhere
 * this session or are a latecomer with no attendance row yet (upserted
 * here). Only ever touches the current shuffle generation: a player can be
 * on at most one of *this round's* teams at a time.
 *
 * Note this doesn't retroactively fix team-level stats for matches the
 * target team already played tonight (win/loss, clean sheets, keeper
 * numbers) — those are derived from whoever's currently rostered, not a
 * per-match snapshot. Accepted tradeoff: individual goals/assists stay
 * correctly attributed either way, and it only affects this one session.
 */
export async function assignPlayerToTeam(
  _prevState: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  await requireAdmin();

  const sessionId = Number(formData.get("sessionId"));
  const playerId = Number(formData.get("playerId"));
  const teamId = Number(formData.get("teamId"));
  if (![sessionId, playerId, teamId].every(Number.isInteger)) {
    return { error: "Invalid input." };
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };
  if (session.status !== "teams_set") {
    return { error: "Rosters can only be edited once teams are locked for the night." };
  }

  const currentTeams = await currentGenerationTeams(sessionId);
  const targetTeam = currentTeams.find((t) => t.id === teamId);
  if (!targetTeam) return { error: "Invalid team for this session." };

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || !player.isActive) return { error: "Player not found or inactive." };

  await prisma.$transaction([
    prisma.attendance.upsert({
      where: { sessionId_playerId: { sessionId, playerId } },
      update: {},
      create: { sessionId, playerId },
    }),
    prisma.teamPlayer.deleteMany({
      where: { playerId, teamId: { in: currentTeams.map((t) => t.id) } },
    }),
    prisma.teamPlayer.create({
      data: { teamId, playerId, isKeeper: false },
    }),
  ]);

  revalidatePath(`/admin/sessions/${sessionId}`);
}

/**
 * Sets or clears which rostered player is a team's keeper — a team has at
 * most one, so setting a new one clears whoever had it.
 */
export async function setTeamPlayerKeeper(
  _prevState: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  await requireAdmin();

  const sessionId = Number(formData.get("sessionId"));
  const teamId = Number(formData.get("teamId"));
  const playerId = Number(formData.get("playerId"));
  const isKeeper = formData.get("isKeeper") === "true";
  if (![sessionId, teamId, playerId].every(Number.isInteger)) {
    return { error: "Invalid input." };
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };
  if (session.status !== "teams_set") {
    return { error: "Rosters can only be edited once teams are locked for the night." };
  }

  const currentTeams = await currentGenerationTeams(sessionId);
  if (!currentTeams.some((t) => t.id === teamId)) {
    return { error: "Invalid team for this session." };
  }

  const membership = await prisma.teamPlayer.findUnique({
    where: { teamId_playerId: { teamId, playerId } },
  });
  if (!membership) return { error: "Player is not on that team." };

  await prisma.$transaction([
    prisma.teamPlayer.updateMany({
      where: { teamId, isKeeper: true },
      data: { isKeeper: false },
    }),
    ...(isKeeper
      ? [
          prisma.teamPlayer.update({
            where: { teamId_playerId: { teamId, playerId } },
            data: { isKeeper: true },
          }),
        ]
      : []),
  ]);

  revalidatePath(`/admin/sessions/${sessionId}`);
}

/**
 * Takes a player off their current team entirely — no destination, unlike
 * `assignPlayerToTeam`. Covers a community-league reality `assignPlayerToTeam`
 * alone can't: someone gets tired or leaves early with nobody replacing them,
 * so the team just plays a player short. A straight substitution is this
 * plus `assignPlayerToTeam` for whoever comes on; a player from another team
 * covering a short-handed side is just `assignPlayerToTeam` moving them over
 * (and back again later, if it's only for one match) — neither needed a new
 * action of its own.
 */
export async function benchPlayer(
  _prevState: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  await requireAdmin();

  const sessionId = Number(formData.get("sessionId"));
  const playerId = Number(formData.get("playerId"));
  if (![sessionId, playerId].every(Number.isInteger)) {
    return { error: "Invalid input." };
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };
  if (session.status !== "teams_set") {
    return { error: "Rosters can only be edited once teams are locked for the night." };
  }

  const currentTeams = await currentGenerationTeams(sessionId);
  const { count } = await prisma.teamPlayer.deleteMany({
    where: { playerId, teamId: { in: currentTeams.map((t) => t.id) } },
  });
  if (count === 0) return { error: "Player is not on a team this round." };

  revalidatePath(`/admin/sessions/${sessionId}`);
}
