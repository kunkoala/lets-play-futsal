"use client";

import { useActionState } from "react";
import { Button, Checkbox, Group, Stack, TextInput } from "@mantine/core";
import { createSeason, type SeasonFormState } from "./actions";

const initialState: SeasonFormState = undefined;

// Keyed by the parent (seasons.length) so a successful create remounts this
// component, clearing the uncontrolled inputs — same trick as AddPlayerForm.
export function CreateSeasonForm() {
  const [state, formAction, pending] = useActionState(
    createSeason,
    initialState,
  );

  return (
    <form action={formAction}>
      <Stack gap="sm">
        <Group align="flex-end" gap="sm" wrap="wrap">
          <TextInput
            name="name"
            label="New season"
            placeholder="e.g. Odd Semester 2026"
            required
            style={{ flex: 1, minWidth: 200 }}
          />
          <TextInput
            type="date"
            name="startsOn"
            label="Starts on"
            required
          />
          <TextInput type="date" name="endsOn" label="Ends on" required />
        </Group>
        {state?.error && (
          <div style={{ color: "var(--mantine-color-red-6)", fontSize: "var(--mantine-font-size-sm)" }}>
            {state.error}
          </div>
        )}
        <Group>
          <Checkbox name="makeActive" label="Make this the active season" />
          <Button type="submit" loading={pending}>
            Create season
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
