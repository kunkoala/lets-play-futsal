"use client";

import { useActionState } from "react";
import { Badge, Button, Group, TextInput } from "@mantine/core";
import {
  renamePlayer,
  togglePlayerActive,
  type PlayerFormState,
} from "./actions";

const initialState: PlayerFormState = undefined;

type Player = { id: number; name: string; isActive: boolean };

export function PlayerRow({ player }: { player: Player }) {
  const [state, formAction, pending] = useActionState(
    renamePlayer,
    initialState,
  );
  const formId = `rename-player-${player.id}`;

  return (
    <tr>
      <td>
        <form action={formAction} id={formId}>
          <input type="hidden" name="id" value={player.id} />
          {/* Keyed by name so a successful rename (which revalidates the
              player list from the server) remounts this uncontrolled input
              with the new value instead of showing the stale typed text. */}
          <TextInput
            key={player.name}
            name="name"
            defaultValue={player.name}
            error={state?.error}
            size="sm"
          />
        </form>
      </td>
      <td>
        <Badge color={player.isActive ? "teal" : "gray"} variant="light">
          {player.isActive ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td>
        <Group gap="xs" wrap="nowrap">
          <Button
            type="submit"
            form={formId}
            size="xs"
            variant="light"
            loading={pending}
          >
            Save
          </Button>
          <form action={togglePlayerActive}>
            <input type="hidden" name="id" value={player.id} />
            <Button
              type="submit"
              size="xs"
              variant="subtle"
              color={player.isActive ? "red" : "teal"}
            >
              {player.isActive ? "Deactivate" : "Activate"}
            </Button>
          </form>
        </Group>
      </td>
    </tr>
  );
}
