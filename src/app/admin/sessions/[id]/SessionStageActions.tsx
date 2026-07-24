"use client";

import { useActionState } from "react";
import { Button, Text } from "@mantine/core";
import { lockTeams, unlockTeams, type SessionFormState } from "../actions";

const initialState: SessionFormState = undefined;

export function LockTeamsButton({ sessionId }: { sessionId: number }) {
  const [state, formAction, pending] = useActionState(
    lockTeams,
    initialState,
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <Button type="submit" loading={pending}>
        Lock teams
      </Button>
      {state?.error && (
        <Text c="red" size="sm" mt={4}>
          {state.error}
        </Text>
      )}
    </form>
  );
}

export function UnlockTeamsButton({ sessionId }: { sessionId: number }) {
  const [state, formAction, pending] = useActionState(
    unlockTeams,
    initialState,
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <Button type="submit" loading={pending} variant="light" color="orange">
        Unlock
      </Button>
      {state?.error && (
        <Text c="red" size="sm" mt={4}>
          {state.error}
        </Text>
      )}
    </form>
  );
}
