"use client";

import { useActionState } from "react";
import { Box, Button, Group, TableTd, TableTr, TextInput } from "@mantine/core";
import {
  renamePlayer,
  togglePlayerActive,
  type PlayerFormState,
} from "./actions";

const initialState: PlayerFormState = undefined;

type Player = { id: number; name: string; isActive: boolean };

function StatusPill({ active }: { active: boolean }) {
  return (
    <Box
      component="span"
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontWeight: 800,
        fontSize: 10,
        letterSpacing: "0.08em",
        color: active ? "var(--volt)" : "var(--text-muted)",
        background: active ? "rgba(200,255,47,.12)" : "rgba(255,255,255,.06)",
      }}
    >
      {active ? "ACTIVE" : "INACTIVE"}
    </Box>
  );
}

export function PlayerRow({ player }: { player: Player }) {
  const [state, formAction, pending] = useActionState(
    renamePlayer,
    initialState,
  );
  const formId = `rename-player-${player.id}`;

  return (
    <TableTr>
      <TableTd style={{ minWidth: 200 }}>
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
      </TableTd>
      <TableTd>
        <StatusPill active={player.isActive} />
      </TableTd>
      <TableTd>
        <Group gap="xs" wrap="nowrap" justify="flex-end">
          <Button type="submit" form={formId} size="xs" variant="light" loading={pending}>
            Save
          </Button>
          <form action={togglePlayerActive}>
            <input type="hidden" name="id" value={player.id} />
            <Button
              type="submit"
              size="xs"
              variant="subtle"
              color={player.isActive ? "red" : "gray"}
            >
              {player.isActive ? "Deactivate" : "Activate"}
            </Button>
          </form>
        </Group>
      </TableTd>
    </TableTr>
  );
}
