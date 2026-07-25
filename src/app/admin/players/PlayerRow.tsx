"use client";

import { useActionState } from "react";
import { Box, Button, Group, Select, Stack, TableTd, TableTr, TextInput } from "@mantine/core";
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

/**
 * Both variants render at once (the page hides one with `visibleFrom` /
 * `hiddenFrom`), so the `<form>` id has to differ between them — a duplicate
 * id would make `form={formId}` on the phone card point at the desktop form.
 */
function useRowForm(player: Player, variant: string) {
  const [state, formAction, pending] = useActionState(updatePlayer, initialState);
  return { state, formAction, pending, formId: `update-player-${variant}-${player.id}` };
}

export function PlayerRow({ player }: { player: Player }) {
  const { state, formAction, pending, formId } = useRowForm(player, "row");

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

/**
 * Phone layout for the same row. The four-column table needs ~700px before the
 * name field and the position Select stop colliding, so below `sm` each player
 * becomes a stacked card instead of a horizontally scrolling row.
 */
export function PlayerCard({ player }: { player: Player }) {
  const { state, formAction, pending, formId } = useRowForm(player, "card");

  return (
    <Box
      style={{
        borderBottom: "1px solid var(--hairline)",
        padding: "14px 16px",
      }}
    >
      <Stack gap={10}>
        <StatusPill active={player.isActive} />
        <form action={formAction} id={formId}>
          <input type="hidden" name="id" value={player.id} />
          <TextInput
            key={player.name}
            name="name"
            label="Name"
            defaultValue={player.name}
            error={state?.error}
            size="sm"
          />
        </form>
        <Select
          key={player.keeperPref}
          form={formId}
          name="keeperPref"
          label="Position"
          data={POSITION_DATA}
          defaultValue={player.keeperPref}
          allowDeselect={false}
          size="sm"
        />
        <Group gap="xs" grow>
          <Button type="submit" form={formId} size="sm" variant="light" loading={pending}>
            Save
          </Button>
          <form action={togglePlayerActive}>
            <input type="hidden" name="id" value={player.id} />
            <Button
              type="submit"
              size="sm"
              variant="subtle"
              color={player.isActive ? "red" : "gray"}
              fullWidth
            >
              {player.isActive ? "Deactivate" : "Activate"}
            </Button>
          </form>
        </Group>
      </Stack>
    </Box>
  );
}
