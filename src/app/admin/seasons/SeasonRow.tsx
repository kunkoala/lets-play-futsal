"use client";

import { useActionState, useState } from "react";
import { Badge, Button, Group, Select, TextInput } from "@mantine/core";
import { setActiveSeason, setMvp, updateSeason, type SeasonFormState } from "./actions";

const initialState: SeasonFormState = undefined;

type Season = {
  id: number;
  name: string;
  startsOn: Date;
  endsOn: Date;
  isActive: boolean;
};
type Player = { id: number; name: string };

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function SeasonRow({
  season,
  players,
  mvp,
}: {
  season: Season;
  players: Player[];
  mvp: Player | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateSeason,
    initialState,
  );
  const [mvpState, mvpFormAction, mvpPending] = useActionState(
    setMvp,
    initialState,
  );
  const [mvpChoice, setMvpChoice] = useState<string | null>(
    mvp ? String(mvp.id) : null,
  );
  const formId = `edit-season-${season.id}`;
  const startsOnValue = toDateInputValue(season.startsOn);
  const endsOnValue = toDateInputValue(season.endsOn);
  const playerOptions = players.map((p) => ({ value: String(p.id), label: p.name }));

  return (
    <tr>
      <td>
        <form action={formAction} id={formId}>
          <input type="hidden" name="id" value={season.id} />
          {/* Keyed by the current values so a successful edit (which
              revalidates from the server) remounts with fresh defaults. */}
          <TextInput
            key={season.name}
            name="name"
            defaultValue={season.name}
            size="sm"
            error={state?.error}
          />
        </form>
      </td>
      <td>
        <TextInput
          key={startsOnValue}
          type="date"
          name="startsOn"
          form={formId}
          defaultValue={startsOnValue}
          size="sm"
        />
      </td>
      <td>
        <TextInput
          key={endsOnValue}
          type="date"
          name="endsOn"
          form={formId}
          defaultValue={endsOnValue}
          size="sm"
        />
      </td>
      <td>
        {season.isActive ? (
          <Badge color="teal" variant="filled">
            Active
          </Badge>
        ) : (
          <Badge color="gray" variant="light">
            Inactive
          </Badge>
        )}
      </td>
      <td>
        <form action={mvpFormAction}>
          <input type="hidden" name="seasonId" value={season.id} />
          <input type="hidden" name="playerId" value={mvpChoice ?? ""} />
          <Group gap={4} wrap="nowrap">
            <Select
              placeholder="Pick MVP"
              size="xs"
              data={playerOptions}
              value={mvpChoice}
              onChange={setMvpChoice}
              w={140}
              searchable
            />
            <Button
              type="submit"
              size="xs"
              variant="light"
              loading={mvpPending}
              disabled={!mvpChoice}
            >
              Set
            </Button>
          </Group>
          {mvpState?.error && (
            <span style={{ color: "var(--mantine-color-red-6)", fontSize: "var(--mantine-font-size-xs)" }}>
              {mvpState.error}
            </span>
          )}
        </form>
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
          {!season.isActive && (
            <form action={setActiveSeason}>
              <input type="hidden" name="id" value={season.id} />
              <Button type="submit" size="xs" variant="subtle" color="teal">
                Set active
              </Button>
            </form>
          )}
        </Group>
      </td>
    </tr>
  );
}
