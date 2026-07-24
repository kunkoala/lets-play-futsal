"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Group, NumberInput, Text } from "@mantine/core";
import { shuffleIntoTeams } from "@/lib/shuffle";
import { shuffleTeams, type SessionFormState } from "../actions";

const initialState: SessionFormState = undefined;

export function ShuffleControls({
  sessionId,
  attendingCount,
}: {
  sessionId: number;
  attendingCount: number;
}) {
  const [state, formAction, pending] = useActionState(
    shuffleTeams,
    initialState,
  );
  const [teamSize, setTeamSize] = useState(5);

  const preview = useMemo(() => {
    if (attendingCount < 4) return null;
    try {
      const placeholderIds = Array.from({ length: attendingCount }, (_, i) => i);
      const sizes = shuffleIntoTeams(placeholderIds, teamSize).map(
        (t) => t.length,
      );
      return `${attendingCount} attending -> ${sizes.length} teams of ${sizes.join(", ")}`;
    } catch {
      return null;
    }
  }, [attendingCount, teamSize]);

  return (
    <form action={formAction}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="teamSize" value={teamSize} />
      <Group align="flex-end" gap="sm">
        <NumberInput
          label="Team size"
          value={teamSize}
          onChange={(v) => setTeamSize(typeof v === "number" ? v : 5)}
          min={1}
          max={11}
          w={120}
        />
        <Button type="submit" loading={pending} disabled={attendingCount < 4}>
          Shuffle
        </Button>
      </Group>
      {preview && (
        <Text size="sm" c="dimmed" mt={4}>
          {preview}
        </Text>
      )}
      {attendingCount < 4 && (
        <Text size="sm" c="dimmed" mt={4}>
          Save check-in with at least 4 attendees first.
        </Text>
      )}
      {state?.error && (
        <Text c="red" size="sm" mt={4}>
          {state.error}
        </Text>
      )}
    </form>
  );
}
