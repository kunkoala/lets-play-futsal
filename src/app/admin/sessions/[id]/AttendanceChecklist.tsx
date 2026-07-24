"use client";

import { useActionState, useState } from "react";
import { Badge, Button, Checkbox, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { saveAttendance, type SessionFormState } from "../actions";

const initialState: SessionFormState = undefined;

type Player = { id: number; name: string };

export function AttendanceChecklist({
  sessionId,
  players,
  initialAttendingIds,
}: {
  sessionId: number;
  players: Player[];
  initialAttendingIds: number[];
}) {
  const [state, formAction, pending] = useActionState(
    saveAttendance,
    initialState,
  );
  const [count, setCount] = useState(initialAttendingIds.length);
  const initialSet = new Set(initialAttendingIds);

  return (
    <form action={formAction}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={500}>Check-in</Text>
          <Badge variant="light">{count} attending</Badge>
        </Group>
        <ScrollArea.Autosize mah={320}>
          <Stack gap={4}>
            {players.map((player) => (
              <Checkbox
                key={player.id}
                name="playerId"
                value={player.id}
                label={player.name}
                defaultChecked={initialSet.has(player.id)}
                onChange={(e) => {
                  const { checked } = e.currentTarget;
                  setCount((c) => c + (checked ? 1 : -1));
                }}
              />
            ))}
            {players.length === 0 && (
              <Text size="sm" c="dimmed">
                No active players — add some on the Players page first.
              </Text>
            )}
          </Stack>
        </ScrollArea.Autosize>
        {state?.error && (
          <Text c="red" size="sm">
            {state.error}
          </Text>
        )}
        <Button type="submit" loading={pending}>
          Save check-in
        </Button>
      </Stack>
    </form>
  );
}
