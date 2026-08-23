"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Group, Modal, NumberInput, Select, Stack, Text } from "@mantine/core";
import { KEEPER_GLYPH } from "@/lib/keeperPref";
import { addGoal, editGoal, removeGoal, setMatchKeeper } from "./corrections";

type Player = { id: number; name: string };
type Side = { id: number; name: string; color: string; players: Player[]; keeperId: number | null };
type Goal = {
  id: number;
  teamId: number;
  scorer: Player | null;
  assist: Player | null;
  matchSec: number | null;
};

const NO_PLAYER = "none";

/** Seconds back to the whole minutes the form edits in. */
function toMinute(matchSec: number | null): number | "" {
  return matchSec === null ? "" : Math.floor(matchSec / 60);
}

/**
 * Add or edit one goal: which side, who scored, who assisted, what minute.
 *
 * The scorer list is the match's own lineup rather than the team sheet, so a
 * substitute is offered for the matches they actually played and nobody else
 * is — the same rule the live console scores by.
 *
 * Own goals are a scorer of "nobody", which is how they're stored: they count
 * on the scoreboard for the team that benefits and are credited to no one.
 */
function GoalForm({
  matchId,
  goal,
  sides,
  onDone,
}: {
  matchId: number;
  /** Omitted when adding. */
  goal?: Goal;
  sides: [Side, Side];
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [teamId, setTeamId] = useState<string>(String(goal?.teamId ?? sides[0].id));
  const [scorerId, setScorerId] = useState<string>(
    goal?.scorer ? String(goal.scorer.id) : NO_PLAYER,
  );
  const [assistId, setAssistId] = useState<string>(
    goal?.assist ? String(goal.assist.id) : NO_PLAYER,
  );
  const [minute, setMinute] = useState<number | "">(toMinute(goal?.matchSec ?? null));

  const side = sides.find((s) => String(s.id) === teamId) ?? sides[0];
  const playerOptions = side.players.map((p) => ({ value: String(p.id), label: p.name }));

  function submit() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      if (goal) fd.set("eventId", String(goal.id));
      else fd.set("matchId", String(matchId));
      fd.set("teamId", teamId);
      fd.set("scorerId", scorerId);
      fd.set("assistId", assistId);
      fd.set("minute", minute === "" ? "" : String(minute));

      const result = goal ? await editGoal(undefined, fd) : await addGoal(undefined, fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <Stack gap="sm">
      <Select
        label="Counts for"
        data={sides.map((s) => ({ value: String(s.id), label: s.name }))}
        value={teamId}
        allowDeselect={false}
        onChange={(value) => {
          if (!value) return;
          setTeamId(value);
          // The old scorer isn't on the new side, so both picks reset rather
          // than silently failing validation on submit.
          setScorerId(NO_PLAYER);
          setAssistId(NO_PLAYER);
        }}
      />

      <Select
        label="Scorer"
        description="Leave as Own goal if nobody on this team put it in."
        data={[{ value: NO_PLAYER, label: "Own goal — nobody credited" }, ...playerOptions]}
        value={scorerId}
        allowDeselect={false}
        searchable
        onChange={(value) => value && setScorerId(value)}
      />

      <Select
        label="Assist"
        data={[
          { value: NO_PLAYER, label: "No assist" },
          ...playerOptions.filter((o) => o.value !== scorerId),
        ]}
        value={assistId}
        allowDeselect={false}
        searchable
        disabled={scorerId === NO_PLAYER}
        onChange={(value) => value && setAssistId(value)}
      />

      <NumberInput
        label="Minute"
        description="Optional — leave blank if nobody noted it."
        placeholder="—"
        min={0}
        max={240}
        allowDecimal={false}
        value={minute}
        onChange={(value) => setMinute(typeof value === "number" ? value : "")}
      />

      {error && (
        <Text fz={13} fw={600} c="red">
          {error}
        </Text>
      )}

      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onDone} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={submit} loading={isPending}>
          {goal ? "Save goal" : "Add goal"}
        </Button>
      </Group>
    </Stack>
  );
}

/**
 * The correction panel for one finished match: every goal it has, editable,
 * plus who kept goal for each side.
 *
 * There is no clean-sheet control, deliberately — a clean sheet is derived
 * from the keeper plus the goals conceded, both of which are here. Editing it
 * directly would let a player's total disagree with the scoreline it came
 * from. See the module comment in corrections.ts.
 */
export function MatchCorrections({
  matchId,
  sides,
  goals,
}: {
  matchId: number;
  sides: [Side, Side];
  goals: Goal[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Goal | null>(null);

  function runDelete(goal: Goal) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", String(goal.id));
      await removeGoal(undefined, fd);
      setConfirmDelete(null);
      router.refresh();
    });
  }

  function chooseKeeper(teamId: number, playerId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      fd.set("teamId", String(teamId));
      fd.set("playerId", playerId);
      await setMatchKeeper(undefined, fd);
      router.refresh();
    });
  }

  const sideById = new Map(sides.map((s) => [s.id, s]));

  return (
    <Stack gap={14}>
      <Stack gap={6}>
        {goals.length === 0 && (
          <Text fz={13} c="dimmed">
            No goals recorded for this match.
          </Text>
        )}
        {goals.map((goal) => {
          const side = sideById.get(goal.teamId);
          return (
            <Group
              key={goal.id}
              justify="space-between"
              wrap="nowrap"
              gap={8}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                background: "var(--panel-raised)",
                border: "1px solid var(--hairline)",
              }}
            >
              <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                <Text className="tabular-nums" fz={11} fw={700} c="dimmed" w={30}>
                  {goal.matchSec === null ? "—" : `${Math.floor(goal.matchSec / 60)}'`}
                </Text>
                <Box
                  aria-hidden
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    flexShrink: 0,
                    background: side?.color ?? "var(--hairline)",
                  }}
                />
                <Text fz={13} fw={600} truncate>
                  {goal.scorer?.name ?? "Own goal"}
                  {goal.assist && (
                    <Text span fz={12} c="dimmed" fw={500}>
                      {" "}
                      · {goal.assist.name} A
                    </Text>
                  )}
                </Text>
              </Group>
              <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                <Button size="compact-xs" variant="subtle" onClick={() => setEditing(goal)}>
                  Edit
                </Button>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="red"
                  onClick={() => setConfirmDelete(goal)}
                >
                  Delete
                </Button>
              </Group>
            </Group>
          );
        })}
      </Stack>

      <Button size="xs" variant="light" onClick={() => setAdding(true)} disabled={isPending}>
        + Add a goal nobody logged
      </Button>

      <Stack gap={8}>
        <Text
          fz={10}
          fw={800}
          c="var(--text-muted)"
          style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          {KEEPER_GLYPH} Who kept goal
        </Text>
        <Group gap={10} wrap="wrap">
          {sides.map((side) => (
            <Select
              key={side.id}
              label={side.name}
              size="xs"
              w={180}
              data={[
                { value: NO_PLAYER, label: "Nobody" },
                ...side.players.map((p) => ({ value: String(p.id), label: p.name })),
              ]}
              value={side.keeperId === null ? NO_PLAYER : String(side.keeperId)}
              allowDeselect={false}
              disabled={isPending}
              onChange={(value) => value && chooseKeeper(side.id, value)}
            />
          ))}
        </Group>
        <Text fz={11} c="dimmed">
          Clean sheets follow from this and the goals above — there&apos;s nothing separate to
          adjust, so the totals can never disagree with the score.
        </Text>
      </Stack>

      <Modal opened={adding} onClose={() => setAdding(false)} title="Add a goal" centered>
        <GoalForm matchId={matchId} sides={sides} onDone={() => setAdding(false)} />
      </Modal>

      <Modal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit goal"
        centered
      >
        {editing && (
          <GoalForm
            matchId={matchId}
            goal={editing}
            sides={sides}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        opened={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this goal?"
        centered
      >
        <Stack gap="sm">
          <Text fz={14}>
            {confirmDelete?.scorer?.name ?? "Own goal"}
            {confirmDelete?.matchSec != null &&
              ` at ${Math.floor(confirmDelete.matchSec / 60)}'`}
            . This changes the score, and every total derived from it.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={isPending}
              onClick={() => confirmDelete && runDelete(confirmDelete)}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
