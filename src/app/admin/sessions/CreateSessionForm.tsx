"use client";

import { useActionState } from "react";
import { Button, Group, TextInput } from "@mantine/core";
import { createSession, type SessionFormState } from "./actions";

const initialState: SessionFormState = undefined;

export function CreateSessionForm({ defaultDate }: { defaultDate: string }) {
  const [state, formAction, pending] = useActionState(
    createSession,
    initialState,
  );

  return (
    <form action={formAction}>
      <Group align="flex-end" gap="sm">
        <TextInput
          type="date"
          name="date"
          label="New session date"
          defaultValue={defaultDate}
          required
          error={state?.error}
        />
        <Button type="submit" loading={pending}>
          Create session
        </Button>
      </Group>
    </form>
  );
}
