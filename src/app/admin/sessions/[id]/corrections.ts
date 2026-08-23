"use server";

/**
 * After-the-fact corrections to a finished match.
 *
 * The live console records a match as it happens; this is the other half —
 * fixing what got mistyped, adding the goal nobody logged, and entering a
 * match that was played but never started in the app at all.
 *
 * **Why this lives on the match and not the player.** There are no stored stat
 * columns anywhere (see the modeling notes in prisma/schema.prisma): goals,
 * assists, clean sheets, +/-, form and the rating are all derived from
 * `GoalEvent` rows and the `MatchPlayer` lineup at query time. A "+1 goal"
 * control on the player list would have nowhere to write it. Correcting the
 * event is what corrects every total that reads from it, everywhere, at once.
 *
 * **Clean sheets deliberately have no direct control.** A clean sheet is
 * "kept goal in this match, conceded nothing" — so the two real levers are who
 * was in goal (`setMatchKeeper`) and how many goals went in (the goal
 * actions). A manual clean-sheet counter could disagree with its own
 * scoreline, and then no number on the site would be trustworthy.
 */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSequenced, orderGoals } from "@/lib/goalOrder";

export type CorrectionState = { error: string } | undefined;

/** Blank/"none" means "no player" — an own goal, or a goal with no assist. */
function readPlayerField(formData: FormData, key: string): number | null | "invalid" {
  const raw = formData.get(key);
  if (raw === null || raw === "" || raw === "none") return null;
  const id = Number(raw);
  return Number.isInteger(id) ? id : "invalid";
}

/**
 * Minute as typed, converted to the seconds `GoalEvent.matchSec` stores.
 * Blank is legitimate — matches recorded before the clock existed have no
 * minute, and an admin reconstructing a match from memory rarely has one
 * either.
 */
function readMinuteField(formData: FormData): number | null | "invalid" {
  const raw = formData.get("minute");
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const minute = Number(raw);
  if (!Number.isInteger(minute) || minute < 0 || minute > 240) return "invalid";
  return minute * 60;
}

/**
 * Renumbers a match's goals into minute order.
 *
 * `seq` is what every match report renders in, so a goal added after the fact
 * would otherwise show up last however early it was scored. Goals with no
 * minute keep their relative order and sit at the end, since there's nothing
 * to place them by.
 *
 * Done in two passes inside one transaction because `@@unique([matchId, seq])`
 * would collide mid-renumber if the rows were written straight to their final
 * values.
 */
async function resequence(matchId: number): Promise<void> {
  const events = await prisma.goalEvent.findMany({
    where: { matchId },
    orderBy: { seq: "asc" },
  });

  if (isSequenced(events)) return;
  const ordered = orderGoals(events);

  const PARK = 100_000;
  await prisma.$transaction([
    ...ordered.map((event, i) =>
      prisma.goalEvent.update({ where: { id: event.id }, data: { seq: PARK + i } }),
    ),
    ...ordered.map((event, i) =>
      prisma.goalEvent.update({ where: { id: event.id }, data: { seq: i + 1 } }),
    ),
  ]);
}

function revalidateSession(sessionId: number): void {
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  revalidatePath("/awards");
  revalidatePath("/");
}

function findMatchWithLineup(matchId: number) {
  return prisma.match.findUnique({ where: { id: matchId }, include: { lineup: true } });
}

type EditableMatch = Awaited<ReturnType<typeof findMatchWithLineup>>;

/**
 * Loads a match that is open to correction, or explains why it isn't.
 *
 * Goal edits refuse an in-progress match: the live console owns those, and it
 * holds a running clock this form knows nothing about — a minute typed here
 * would be measured against a different zero.
 *
 * Swapping the keeper has no such conflict, and is the one thing you most
 * often need to fix *while* a match is being played, so it passes
 * `allowInProgress`.
 */
async function loadEditableMatch(
  matchId: number,
  { allowInProgress = false }: { allowInProgress?: boolean } = {},
): Promise<
  | { ok: false; error: string }
  | { ok: true; match: NonNullable<EditableMatch> }
> {
  const match = await findMatchWithLineup(matchId);
  if (!match) return { ok: false, error: "Match not found." };
  if (match.status === "in_progress" && allowInProgress) return { ok: true, match };
  if (match.status !== "finished") {
    return { ok: false, error: "Finish the match in the live console first." };
  }
  return { ok: true, match };
}

/** Whether this player was on the pitch for this team in this match. */
function inLineup(
  lineup: readonly { playerId: number; teamId: number }[],
  teamId: number,
  playerId: number,
): boolean {
  return lineup.some((spot) => spot.playerId === playerId && spot.teamId === teamId);
}

/**
 * Shared validation for adding and editing a goal: which side it counts for,
 * who scored, who assisted, and when.
 */
function readGoalFields(
  formData: FormData,
  match: { homeTeamId: number; awayTeamId: number; lineup: readonly { playerId: number; teamId: number }[] },
):
  | { error: string }
  | { teamId: number; scorerId: number | null; assistId: number | null; matchSec: number | null } {
  const teamId = Number(formData.get("teamId"));
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    return { error: "Pick which team the goal counts for." };
  }

  const scorerId = readPlayerField(formData, "scorerId");
  const assistId = readPlayerField(formData, "assistId");
  const matchSec = readMinuteField(formData);
  if (scorerId === "invalid" || assistId === "invalid") return { error: "Invalid player." };
  if (matchSec === "invalid") return { error: "Minute must be a whole number of minutes." };

  // A null scorer is an own goal, which is why this isn't required. The goal
  // still counts on the scoreboard; it just isn't credited to anyone.
  if (scorerId !== null && !inLineup(match.lineup, teamId, scorerId)) {
    return { error: "Scorer wasn't in that team's lineup for this match." };
  }
  if (assistId !== null && !inLineup(match.lineup, teamId, assistId)) {
    return { error: "Assister wasn't in that team's lineup for this match." };
  }
  if (scorerId !== null && scorerId === assistId) {
    return { error: "A player can't assist their own goal." };
  }
  if (scorerId === null && assistId !== null) {
    return { error: "An own goal can't have an assist." };
  }

  return { teamId, scorerId, assistId, matchSec };
}

/** Adds a goal nobody logged at the time to an already-finished match. */
export async function addGoal(
  _prevState: CorrectionState,
  formData: FormData,
): Promise<CorrectionState> {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  if (!Number.isInteger(matchId)) return { error: "Invalid match." };

  const loaded = await loadEditableMatch(matchId);
  if (!loaded.ok) return { error: loaded.error };
  const { match } = loaded;

  const fields = readGoalFields(formData, match);
  if ("error" in fields) return fields;

  const last = await prisma.goalEvent.findFirst({
    where: { matchId },
    orderBy: { seq: "desc" },
  });

  await prisma.goalEvent.create({
    data: {
      matchId,
      seq: (last?.seq ?? 0) + 1,
      teamId: fields.teamId,
      scorerId: fields.scorerId,
      assistId: fields.assistId,
      matchSec: fields.matchSec,
    },
  });

  await resequence(matchId);
  revalidateSession(match.sessionId);
}

/** Corrects a goal already on the record — wrong scorer, missing assist, wrong minute. */
export async function editGoal(
  _prevState: CorrectionState,
  formData: FormData,
): Promise<CorrectionState> {
  await requireAdmin();

  const eventId = Number(formData.get("eventId"));
  if (!Number.isInteger(eventId)) return { error: "Invalid goal." };

  const event = await prisma.goalEvent.findUnique({ where: { id: eventId } });
  if (!event) return { error: "Goal not found." };

  const loaded = await loadEditableMatch(event.matchId);
  if (!loaded.ok) return { error: loaded.error };
  const { match } = loaded;

  const fields = readGoalFields(formData, match);
  if ("error" in fields) return fields;

  await prisma.goalEvent.update({
    where: { id: eventId },
    data: {
      teamId: fields.teamId,
      scorerId: fields.scorerId,
      assistId: fields.assistId,
      matchSec: fields.matchSec,
    },
  });

  await resequence(event.matchId);
  revalidateSession(match.sessionId);
}

/** Removes a goal that never happened, or was recorded twice. */
export async function removeGoal(
  _prevState: CorrectionState,
  formData: FormData,
): Promise<CorrectionState> {
  await requireAdmin();

  const eventId = Number(formData.get("eventId"));
  if (!Number.isInteger(eventId)) return { error: "Invalid goal." };

  const event = await prisma.goalEvent.findUnique({ where: { id: eventId } });
  if (!event) return { error: "Goal not found." };

  const loaded = await loadEditableMatch(event.matchId);
  if (!loaded.ok) return { error: loaded.error };

  await prisma.goalEvent.delete({ where: { id: eventId } });

  await resequence(event.matchId);
  revalidateSession(loaded.match.sessionId);
}

/**
 * Sets which player kept goal for one team in one match — the only way to
 * correct a clean sheet, since clean sheets are derived from this plus the
 * goals conceded rather than stored.
 *
 * Allowed mid-match as well as after it: teams rotate the gloves round, and a
 * keeper change is something you record as it happens rather than remember
 * afterwards. Only the lineup row moves, so goals already scored are untouched.
 *
 * At most one keeper per team per match, so the rest of that side is cleared
 * in the same transaction.
 */
export async function setMatchKeeper(
  _prevState: CorrectionState,
  formData: FormData,
): Promise<CorrectionState> {
  await requireAdmin();

  const matchId = Number(formData.get("matchId"));
  const teamId = Number(formData.get("teamId"));
  if (!Number.isInteger(matchId) || !Number.isInteger(teamId)) return { error: "Invalid input." };

  const loaded = await loadEditableMatch(matchId, { allowInProgress: true });
  if (!loaded.ok) return { error: loaded.error };
  const { match } = loaded;

  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    return { error: "Invalid team for this match." };
  }

  const playerId = readPlayerField(formData, "playerId");
  if (playerId === "invalid") return { error: "Invalid player." };
  if (playerId !== null && !inLineup(match.lineup, teamId, playerId)) {
    return { error: "That player wasn't in this team's lineup for this match." };
  }

  await prisma.$transaction([
    prisma.matchPlayer.updateMany({
      where: { matchId, teamId },
      data: { isKeeper: false },
    }),
    ...(playerId === null
      ? []
      : [
          prisma.matchPlayer.update({
            where: { matchId_playerId: { matchId, playerId } },
            data: { isKeeper: true },
          }),
        ]),
  ]);

  // The live console reads the lineup too, and is where a mid-match glove
  // change is made from.
  revalidatePath(`/admin/sessions/${match.sessionId}/live`);
  revalidateSession(match.sessionId);
}

/**
 * Records a match that was played but never started in the app — the "we
 * forgot to hit start" case.
 *
 * Created already finished, with a lineup snapshotted from the two teams'
 * current rosters, and no clock: there is no honest duration to claim for a
 * match nobody timed. Goals are added afterwards with `addGoal`.
 */
export async function addPastMatch(
  _prevState: CorrectionState,
  formData: FormData,
): Promise<CorrectionState> {
  await requireAdmin();

  const sessionId = Number(formData.get("sessionId"));
  const homeTeamId = Number(formData.get("homeTeamId"));
  const awayTeamId = Number(formData.get("awayTeamId"));
  if (![sessionId, homeTeamId, awayTeamId].every(Number.isInteger)) {
    return { error: "Invalid input." };
  }
  if (homeTeamId === awayTeamId) return { error: "Pick two different teams." };

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };

  const [homeTeam, awayTeam] = await Promise.all([
    prisma.team.findUnique({ where: { id: homeTeamId }, include: { players: true } }),
    prisma.team.findUnique({ where: { id: awayTeamId }, include: { players: true } }),
  ]);
  if (
    !homeTeam ||
    homeTeam.sessionId !== sessionId ||
    !awayTeam ||
    awayTeam.sessionId !== sessionId
  ) {
    return { error: "Invalid teams for this session." };
  }

  const last = await prisma.match.findFirst({
    where: { sessionId },
    orderBy: { seq: "desc" },
  });

  await prisma.match.create({
    data: {
      sessionId,
      seq: (last?.seq ?? 0) + 1,
      homeTeamId,
      awayTeamId,
      status: "finished",
      // The session's own date, not now: a match reconstructed a week later
      // shouldn't claim to have kicked off a week late.
      startedAt: session.date,
      endedAt: session.date,
      durationSec: null,
      lineup: {
        createMany: {
          data: [homeTeam, awayTeam].flatMap((team) =>
            team.players.map((tp) => ({
              playerId: tp.playerId,
              teamId: team.id,
              isKeeper: tp.isKeeper,
            })),
          ),
        },
      },
    },
  });

  revalidateSession(sessionId);
}
