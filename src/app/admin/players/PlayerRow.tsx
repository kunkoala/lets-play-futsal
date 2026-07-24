"use client";

import { useActionState } from "react";
import { Box, Button, Group, Select, TableTd, TableTr, TextInput } from "@mantine/core";
import { KEEPER_PREF_OPTIONS } from "@/lib/keeperPref";
import type { KeeperPref } from "@/lib/shuffle";
import {
  togglePlayerActive,
  updatePlayer,
  type PlayerFormState,
} from "./actions";

const initialState: PlayerFormState = undefined;

const POSITION_DATA = KEEPER_PREF_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

type Player = { id: number; name: string; isActive: boolean; keeperPref: KeeperPref };

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
  const [state, formAction, pending] = useActionState(updatePlayer, initialState);
  const formId = `update-player-${player.id}`;

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
      <TableTd style={{ minWidth: 180 }}>
        {/* Submits with the name via `form={formId}` — one Save button for the row. */}
        <Select
          key={player.keeperPref}
          form={formId}
          name="keeperPref"
          data={POSITION_DATA}
          defaultValue={player.keeperPref}
          allowDeselect={false}
          size="sm"
        />
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
