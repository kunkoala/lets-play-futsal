"use client";

import { useActionState, useState } from "react";
import { Autocomplete, Box, Button, Group, Select, Text } from "@mantine/core";
import { KEEPER_PREF_OPTIONS } from "@/lib/keeperPref";
import { findNameCollision, playerNameKey } from "@/lib/playerName";
import { addPlayer, reactivatePlayer, type PlayerFormState } from "./actions";

const initialState: PlayerFormState = undefined;

const POSITION_DATA = KEEPER_PREF_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export type ExistingPlayer = { id: number; name: string; isActive: boolean };

/**
 * Matches on the normalised key rather than a raw substring, so typing
 * `azhar r` surfaces `Azhar R.` — the near-miss that produced the duplicate
 * rows this list is meant to prevent.
 */
function suggestionFilter(players: readonly ExistingPlayer[], query: string): ExistingPlayer[] {
  const key = playerNameKey(query);
  if (key === "") return [];
  return players.filter((p) => playerNameKey(p.name).includes(key));
}

// Keyed by the parent (players.length) so a successful add remounts this
// component — the simplest way to clear the input after `revalidatePath`
// refreshes the player list, without extra ref/effect wiring.
export function AddPlayerForm({ players }: { players: ExistingPlayer[] }) {
  const [state, formAction, pending] = useActionState(addPlayer, initialState);
  const [name, setName] = useState("");

  // Live duplicate check, so the admin sees the clash while typing rather than
  // after a round-trip. The server repeats it — see addPlayer.
  const collision = findNameCollision(name, players);
  const suggestions = suggestionFilter(players, name).filter((p) => p.id !== collision?.id);

  // A conflict the server reported survives edits to the input, which would be
  // confusing; only show it while the field still holds the name that caused it.
  const serverConflict =
    state?.conflict && playerNameKey(state.conflict.name) === playerNameKey(name)
      ? state.conflict
      : null;
  const blocking = collision ?? serverConflict;

  return (
    <form action={formAction}>
      <Group align="flex-end" gap="sm" wrap="wrap">
        <Autocomplete
          name="name"
          label="Add player"
          placeholder="Full name"
          required
          value={name}
          onChange={setName}
          // Options are the near-matches computed above; Mantine's own filter
          // would re-narrow them by raw substring and drop the ones that only
          // match after normalisation.
          data={suggestions.map((p) => p.name)}
          filter={({ options }) => options}
          renderOption={({ option }) => {
            const player = players.find((p) => p.name === option.value);
            return (
              <Group gap={8} wrap="nowrap">
                <Text fz={14}>{option.value}</Text>
                {player && !player.isActive && (
                  <Text fz={11} fw={700} c="var(--team-yellow)">
                    deactivated
                  </Text>
                )}
              </Group>
            );
          }}
          error={blocking ? undefined : state?.error}
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
        <Button type="submit" loading={pending} disabled={blocking !== null}>
          Add
        </Button>
      </Group>

      {blocking && (
        <Box
          mt={10}
          style={{
            border: "1px solid var(--team-yellow)",
            borderRadius: 12,
            background: "rgba(255,209,71,.10)",
            padding: "10px 14px",
          }}
        >
          <Group gap={10} wrap="wrap" align="center">
            <Text fz={13} fw={600}>
              {blocking.isActive
                ? `${blocking.name} is already on the list.`
                : `${blocking.name} already exists, but is deactivated — that's why they're missing from the shuffle.`}
            </Text>
            {!blocking.isActive && (
              <Button
                type="submit"
                size="xs"
                variant="light"
                formAction={reactivatePlayer}
                name="id"
                value={String(blocking.id)}
              >
                Reactivate {blocking.name}
              </Button>
            )}
          </Group>
        </Box>
      )}
    </form>
  );
}
