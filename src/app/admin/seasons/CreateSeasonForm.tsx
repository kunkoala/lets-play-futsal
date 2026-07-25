"use client";

import { useActionState, useState } from "react";
import { Button, Checkbox, Group, Stack, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { createSeason, type SeasonFormState } from "./actions";

const initialState: SeasonFormState = undefined;

// Keyed by the parent (seasons.length) so a successful create remounts this
// component, clearing the uncontrolled inputs — same trick as AddPlayerForm.
export function CreateSeasonForm() {
  const [state, formAction, pending] = useActionState(
    createSeason,
    initialState,
  );
  const [startsOn, setStartsOn] = useState<string | null>(null);
  const [endsOn, setEndsOn] = useState<string | null>(null);

  return (
    <form action={formAction}>
      {/* DatePickerInput is a button, not a form control — the `YYYY-MM-DD`
          values reach the Server Action through these hidden inputs, which is
          the same shape `seasonSchema` already parses. */}
      <input type="hidden" name="startsOn" value={startsOn ?? ""} />
      <input type="hidden" name="endsOn" value={endsOn ?? ""} />
      <Stack gap="sm">
        <TextInput
          name="name"
          label="New season"
          placeholder="e.g. Odd Semester 2026"
          required
        />
        {/* `grow` + `wrap` keeps the two date fields side by side on desktop
            and lets them drop onto their own rows on a phone. */}
        <Group gap="sm" grow wrap="wrap" align="flex-end">
          <DatePickerInput
            label="Starts on"
            placeholder="Pick a date"
            value={startsOn}
            onChange={setStartsOn}
            valueFormat="DD MMM YYYY"
            firstDayOfWeek={1}
            dropdownType="modal"
            required
            miw={150}
          />
          <DatePickerInput
            label="Ends on"
            placeholder="Pick a date"
            value={endsOn}
            onChange={setEndsOn}
            valueFormat="DD MMM YYYY"
            firstDayOfWeek={1}
            dropdownType="modal"
            minDate={startsOn ?? undefined}
            required
            miw={150}
          />
        </Group>
        {state?.error && (
          <div style={{ color: "var(--mantine-color-red-6)", fontSize: "var(--mantine-font-size-sm)" }}>
            {state.error}
          </div>
        )}
        <Group justify="space-between" gap="sm" wrap="wrap">
          <Checkbox name="makeActive" label="Make this the active season" />
          <Button type="submit" loading={pending} w={{ base: "100%", sm: "auto" }}>
            Create season
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
