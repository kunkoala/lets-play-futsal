"use client";

import { useActionState } from "react";
import { Button, Group, Select, TextInput } from "@mantine/core";
import { KEEPER_PREF_OPTIONS } from "@/lib/keeperPref";
import { addPlayer, type PlayerFormState } from "./actions";

const initialState: PlayerFormState = undefined;

const POSITION_DATA = KEEPER_PREF_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

// Keyed by the parent (players.length) so a successful add remounts this
// component — the simplest way to clear the uncontrolled input after
// `revalidatePath` refreshes the player list, without extra ref/effect wiring.
export function AddPlayerForm() {
  const [state, formAction, pending] = useActionState(addPlayer, initialState);

  return (
    <form action={formAction}>
      <Group align="flex-end" gap="sm" wrap="wrap">
        <TextInput
          name="name"
          label="Add player"
          placeholder="Full name"
          required
          error={state?.error}
          style={{ flex: 1, minWidth: 180 }}
        />
        <Select
          name="keeperPref"
          label="Position"
          data={POSITION_DATA}
          defaultValue="outfield"
          allowDeselect={false}
          w={190}
        />
        <Button type="submit" loading={pending}>
          Add
        </Button>
      </Group>
    </form>
  );
}
