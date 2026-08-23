"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Group, Select, Stack, Text } from "@mantine/core";
import { addPastMatch } from "./corrections";

/**
 * Records a match that was played but never started in the app.
 *
 * Created already finished and with no clock — there is no honest duration to
 * claim for a match nobody timed — and with a lineup snapshotted from the
 * teams as they stand. Its goals go in afterwards through the same correction
 * panel as any other match, so there is only one way to enter a goal.
 */
export function AddPastMatchForm({
  sessionId,
  teams,
}: {
  sessionId: number;
  teams: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [homeTeamId, setHomeTeamId] = useState<string | null>(null);
  const [awayTeamId, setAwayTeamId] = useState<string | null>(null);

  const options = teams.map((t) => ({ value: String(t.id), label: t.name }));

  function submit() {
    if (!homeTeamId || !awayTeamId) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sessionId", String(sessionId));
      fd.set("homeTeamId", homeTeamId);
      fd.set("awayTeamId", awayTeamId);
      const result = await addPastMatch(undefined, fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setHomeTeamId(null);
      setAwayTeamId(null);
      setOpen(false);
      router.refresh();
    });
  }

  if (teams.length < 2) return null;

  if (!open) {
    return (
      <Button size="xs" variant="subtle" onClick={() => setOpen(true)}>
        + Add a past match
      </Button>
    );
  }

  return (
    <Stack gap={8}>
      <Group gap={8} align="flex-end" wrap="wrap">
        <Select
          label="Home"
          size="xs"
          w={130}
          data={options}
          value={homeTeamId}
          onChange={setHomeTeamId}
        />
        <Select
          label="Away"
          size="xs"
          w={130}
          data={options.filter((o) => o.value !== homeTeamId)}
          value={awayTeamId}
          onChange={setAwayTeamId}
        />
        <Button
          size="xs"
          onClick={submit}
          loading={isPending}
          disabled={!homeTeamId || !awayTeamId}
        >
          Add match
        </Button>
        <Button size="xs" variant="default" onClick={() => setOpen(false)} disabled={isPending}>
          Cancel
        </Button>
      </Group>

      {error && (
        <Text fz={13} fw={600} c="red">
          {error}
        </Text>
      )}

      <Text fz={11} c="dimmed">
        Added with no goals. Use Fix on the new row to enter them.
      </Text>
    </Stack>
  );
}
