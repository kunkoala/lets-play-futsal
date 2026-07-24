"use client";

import { useState, useTransition } from "react";
import { useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Group, Modal, Paper, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import {
  attachAssist,
  deleteEvent,
  endMatch,
  recordGoal,
  recordOwnGoal,
  undoLastEvent,
} from "./actions";

type Player = { id: number; name: string };
type TeamInfo = { id: number; name: string; color: string; players: Player[] };
type GoalEventT = {
  id: number;
  seq: number;
  teamId: number;
  scorerId: number | null;
  assistId: number | null;
};

let optimisticIdCounter = -1;

export function LiveConsole({
  matchId,
  homeTeam,
  awayTeam,
  events,
  isFinished,
}: {
  matchId: number;
  sessionId: number;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  events: GoalEventT[];
  isFinished: boolean;
}) {
  const router = useRouter();
  const [optimisticEvents, addOptimisticEvent] = useOptimistic(
    events,
    (state: GoalEventT[], newEvent: GoalEventT) => [...state, newEvent],
  );
  const [isPending, startTransition] = useTransition();
  const [pendingAssist, setPendingAssist] = useState<
    { eventId: number; teamId: number; scorerName: string } | null
  >(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [cooldownIds, setCooldownIds] = useState<Set<number>>(new Set());

  const playersById = new Map<number, Player>();
  for (const p of [...homeTeam.players, ...awayTeam.players]) playersById.set(p.id, p);

  const homeScore = optimisticEvents.filter((e) => e.teamId === homeTeam.id).length;
  const awayScore = optimisticEvents.filter((e) => e.teamId === awayTeam.id).length;

  function withCooldown(playerId: number, fn: () => void) {
    if (cooldownIds.has(playerId) || isFinished) return;
    setCooldownIds((prev) => new Set(prev).add(playerId));
    setTimeout(() => {
      setCooldownIds((prev) => {
        const next = new Set(prev);
        next.delete(playerId);
        return next;
      });
    }, 600);
    fn();
  }

  function handleScore(team: TeamInfo, scorer: Player) {
    withCooldown(scorer.id, () => {
      setPendingAssist(null); // any new action auto-dismisses a prior pending assist strip
      startTransition(async () => {
        addOptimisticEvent({
          id: optimisticIdCounter--,
          seq: optimisticEvents.length + 1,
          teamId: team.id,
          scorerId: scorer.id,
          assistId: null,
        });
        const fd = new FormData();
        fd.set("matchId", String(matchId));
        fd.set("teamId", String(team.id));
        fd.set("scorerId", String(scorer.id));
        const result = await recordGoal(undefined, fd);
        if (result && "eventId" in result) {
          setPendingAssist({ eventId: result.eventId, teamId: team.id, scorerName: scorer.name });
        }
        router.refresh();
      });
    });
  }

  function handleOwnGoal(team: TeamInfo) {
    setPendingAssist(null);
    startTransition(async () => {
      addOptimisticEvent({
        id: optimisticIdCounter--,
        seq: optimisticEvents.length + 1,
        teamId: team.id,
        scorerId: null,
        assistId: null,
      });
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      fd.set("teamId", String(team.id));
      await recordOwnGoal(undefined, fd);
      router.refresh();
    });
  }

  function handleAssist(assistPlayerId: number | null) {
    if (!pendingAssist) return;
    const eventId = pendingAssist.eventId;
    setPendingAssist(null);
    if (assistPlayerId === null) return; // "No assist" — event already has assistId: null
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", String(eventId));
      fd.set("assistId", String(assistPlayerId));
      await attachAssist(fd);
      router.refresh();
    });
  }

  function handleUndo() {
    setPendingAssist(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      await undoLastEvent(fd);
      router.refresh();
    });
  }

  function handleDeleteEvent(eventId: number) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", String(eventId));
      await deleteEvent(fd);
      router.refresh();
    });
  }

  function handleEndMatch() {
    setConfirmEnd(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      await endMatch(undefined, fd); // redirects back to the session page on success
    });
  }

  const pendingEventScorerId = pendingAssist
    ? optimisticEvents.find((e) => e.id === pendingAssist.eventId)?.scorerId
    : null;
  const assistCandidates = pendingAssist
    ? (pendingAssist.teamId === homeTeam.id ? homeTeam.players : awayTeam.players).filter(
        (p) => p.id !== pendingEventScorerId,
      )
    : [];

  return (
    <Stack gap="lg" style={{ touchAction: "manipulation" }}>
      <Paper withBorder p="md" radius="md">
        <Group justify="center" gap="xl">
          <Stack gap={0} align="center">
            <Badge size="lg" style={{ backgroundColor: homeTeam.color, color: "white" }}>
              {homeTeam.name}
            </Badge>
            <Text fw={700} fz={48}>
              {homeScore}
            </Text>
          </Stack>
          <Text fz={32} c="dimmed">
            —
          </Text>
          <Stack gap={0} align="center">
            <Badge size="lg" style={{ backgroundColor: awayTeam.color, color: "white" }}>
              {awayTeam.name}
            </Badge>
            <Text fw={700} fz={48}>
              {awayScore}
            </Text>
          </Stack>
        </Group>
        {isFinished && (
          <Text ta="center" size="sm" c="dimmed" mt="xs">
            Match finished
          </Text>
        )}
      </Paper>

      {pendingAssist && (
        <Paper withBorder p="md" radius="md" bg="yellow.0">
          <Stack gap="xs">
            <Text fw={500}>Assist for {pendingAssist.scorerName}&apos;s goal?</Text>
            <Group>
              {assistCandidates.map((p) => (
                <Button key={p.id} size="xs" variant="light" onClick={() => handleAssist(p.id)}>
                  {p.name}
                </Button>
              ))}
              <Button size="xs" variant="subtle" color="gray" onClick={() => handleAssist(null)}>
                No assist
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {!isFinished && (
        <SimpleGrid cols={2} spacing="lg">
          <TeamPad
            team={homeTeam}
            onScore={(p) => handleScore(homeTeam, p)}
            onOwnGoal={() => handleOwnGoal(awayTeam)}
            cooldownIds={cooldownIds}
          />
          <TeamPad
            team={awayTeam}
            onScore={(p) => handleScore(awayTeam, p)}
            onOwnGoal={() => handleOwnGoal(homeTeam)}
            cooldownIds={cooldownIds}
          />
        </SimpleGrid>
      )}

      <Group>
        <Button
          variant="default"
          onClick={handleUndo}
          disabled={optimisticEvents.length === 0 || isFinished}
        >
          Undo last
        </Button>
        {!isFinished && (
          <Button color="teal" onClick={() => setConfirmEnd(true)}>
            End match
          </Button>
        )}
      </Group>

      <EventFeed
        events={optimisticEvents}
        playersById={playersById}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onDelete={handleDeleteEvent}
      />

      <Modal opened={confirmEnd} onClose={() => setConfirmEnd(false)} title="End match?">
        <Stack>
          <Text>
            Final score: {homeTeam.name} {homeScore} — {awayScore} {awayTeam.name}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmEnd(false)}>
              Cancel
            </Button>
            <Button color="teal" loading={isPending} onClick={handleEndMatch}>
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function TeamPad({
  team,
  onScore,
  onOwnGoal,
  cooldownIds,
}: {
  team: TeamInfo;
  onScore: (p: Player) => void;
  onOwnGoal: () => void;
  cooldownIds: Set<number>;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="xs">
        <Badge size="lg" fullWidth style={{ backgroundColor: team.color, color: "white" }}>
          {team.name}
        </Badge>
        {team.players.map((p) => (
          <Button
            key={p.id}
            size="lg"
            h={64}
            variant="light"
            disabled={cooldownIds.has(p.id)}
            onClick={() => onScore(p)}
          >
            {p.name}
          </Button>
        ))}
        <Button size="sm" variant="subtle" color="gray" onClick={onOwnGoal}>
          Own goal / unknown scorer +1
        </Button>
      </Stack>
    </Paper>
  );
}

function EventFeed({
  events,
  playersById,
  homeTeam,
  awayTeam,
  onDelete,
}: {
  events: GoalEventT[];
  playersById: Map<number, Player>;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  onDelete: (id: number) => void;
}) {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  return (
    <Stack gap={4}>
      <Text fw={500} size="sm">
        Events
      </Text>
      <ScrollArea.Autosize mah={240}>
        <Stack gap={4}>
          {sorted.map((e) => {
            const team = e.teamId === homeTeam.id ? homeTeam : awayTeam;
            const scorer = e.scorerId ? (playersById.get(e.scorerId)?.name ?? "?") : "Own goal";
            const assist = e.assistId ? playersById.get(e.assistId)?.name : null;
            return (
              <Group key={e.id} justify="space-between" wrap="nowrap">
                <Text size="sm">
                  {e.seq}. <span style={{ color: team.color }}>{team.name}</span> — {scorer}
                  {assist ? ` (assist: ${assist})` : ""}
                </Text>
                {e.id > 0 && (
                  <Button size="xs" variant="subtle" color="red" onClick={() => onDelete(e.id)}>
                    Delete
                  </Button>
                )}
              </Group>
            );
          })}
          {sorted.length === 0 && (
            <Text size="sm" c="dimmed">
              No goals yet.
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
