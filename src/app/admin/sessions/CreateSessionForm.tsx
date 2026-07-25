"use client";

import { useActionState, useState } from "react";
import { Button, Group } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { createSession, type SessionFormState } from "./actions";

const initialState: SessionFormState = undefined;

export function CreateSessionForm({ defaultDate }: { defaultDate: string }) {
  const [state, formAction, pending] = useActionState(
    createSession,
    initialState,
  );
  const [date, setDate] = useState<string | null>(defaultDate);

  return (
    <form action={formAction}>
      {/* DatePickerInput renders a button, not a form control, so the value
          travels to the Server Action through this hidden input. It emits
          `YYYY-MM-DD`, which is exactly what `toDateOnly` in actions.ts
          expects — the same string the old `<input type="date">` sent. */}
      <input type="hidden" name="date" value={date ?? ""} />
      <Group align="flex-end" gap="sm" wrap="wrap">
        <DatePickerInput
          label="New session date"
          placeholder="Pick a date"
          value={date}
          onChange={setDate}
          valueFormat="ddd, DD MMM YYYY"
          firstDayOfWeek={1}
          // Mobile Safari/Chrome render `<input type="date">` as a cramped
          // native wheel that is easy to mis-tap; the modal gives a
          // full-screen calendar on phones and stays a popover on desktop.
          dropdownType="modal"
          highlightToday
          required
          error={state?.error}
          w={{ base: "100%", sm: 260 }}
        />
        <Button type="submit" loading={pending} w={{ base: "100%", sm: "auto" }}>
          Create session
        </Button>
      </Group>
    </form>
  );
}
