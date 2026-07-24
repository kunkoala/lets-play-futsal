"use client";

import { useActionState } from "react";
import { Button, Text } from "@mantine/core";
import { completeSession, reopenSession, type SessionFormState } from "../actions";

const initialState: SessionFormState = undefined;

export function CompleteSessionButton({
  sessionId,
  disabled,
}: {
  sessionId: number;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    completeSession,
    initialState,
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <Button type="submit" loading={pending} disabled={disabled} color="teal">
        Complete session
      </Button>
      {state?.error && (
        <Text c="red" size="sm" mt={4}>
          {state.error}
        </Text>
      )}
      {disabled && (
        <Text size="sm" c="dimmed" mt={4}>
          Finish the in-progress match first.
        </Text>
      )}
    </form>
  );
}

export function ReopenSessionButton({ sessionId }: { sessionId: number }) {
  const [state, formAction, pending] = useActionState(
    reopenSession,
    initialState,
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <Button type="submit" loading={pending} variant="light" color="orange">
        Reopen session
      </Button>
      {state?.error && (
        <Text c="red" size="sm" mt={4}>
          {state.error}
        </Text>
      )}
    </form>
  );
}
