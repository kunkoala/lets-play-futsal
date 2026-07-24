"use client";

import { useActionState } from "react";
import { Button, Group, TextInput } from "@mantine/core";
import { addPlayer, type PlayerFormState } from "./actions";

const initialState: PlayerFormState = undefined;

// Keyed by the parent (players.length) so a successful add remounts this
// component — the simplest way to clear the uncontrolled input after
// `revalidatePath` refreshes the player list, without extra ref/effect wiring.
export function AddPlayerForm() {
  const [state, formAction, pending] = useActionState(addPlayer, initialState);

  return (
    <form action={formAction}>
      <Group align="flex-end" gap="sm">
        <TextInput
          name="name"
          label="Add player"
          placeholder="Full name"
          required
          error={state?.error}
          style={{ flex: 1 }}
        />
        <Button type="submit" loading={pending}>
          Add
        </Button>
      </Group>
    </form>
  );
}
