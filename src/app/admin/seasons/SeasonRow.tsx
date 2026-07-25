"use client";

import { useActionState, useState } from "react";
import { Box, Button, Group, Select, Stack, TableTd, TableTr, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
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
        whiteSpace: "nowrap",
        color: active ? "var(--volt)" : "var(--text-muted)",
        background: active ? "rgba(200,255,47,.12)" : "rgba(255,255,255,.06)",
      }}
    >
      {active ? "ACTIVE" : "INACTIVE"}
    </Box>
  );
}

/**
 * Shared state for both layouts. The desktop row and the phone card both
 * render (one is hidden with `visibleFrom`/`hiddenFrom`), so `variant` keeps
 * the two `<form>` ids distinct — otherwise `form={formId}` on the card would
 * resolve to the row's form.
 */
function useSeasonForm(season: Season, mvp: Player | null, variant: string) {
  const [state, formAction, pending] = useActionState(updateSeason, initialState);
  const [mvpState, mvpFormAction, mvpPending] = useActionState(setMvp, initialState);
  const [mvpChoice, setMvpChoice] = useState<string | null>(mvp ? String(mvp.id) : null);
  const [startsOn, setStartsOn] = useState<string | null>(toDateInputValue(season.startsOn));
  const [endsOn, setEndsOn] = useState<string | null>(toDateInputValue(season.endsOn));

  return {
    state,
    formAction,
    pending,
    mvpState,
    mvpFormAction,
    mvpPending,
    mvpChoice,
    setMvpChoice,
    startsOn,
    setStartsOn,
    endsOn,
    setEndsOn,
    formId: `edit-season-${variant}-${season.id}`,
  };
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
  const f = useSeasonForm(season, mvp, "row");
  const playerOptions = players.map((p) => ({ value: String(p.id), label: p.name }));

  return (
    <TableTr>
      <TableTd style={{ minWidth: 160 }}>
        <form action={f.formAction} id={f.formId}>
          <input type="hidden" name="id" value={season.id} />
          {/* DatePickerInput is a button rather than a form control, so the
              dates travel with the form through these hidden inputs. */}
          <input type="hidden" name="startsOn" value={f.startsOn ?? ""} />
          <input type="hidden" name="endsOn" value={f.endsOn ?? ""} />
          {/* Keyed by the current values so a successful edit (which
              revalidates from the server) remounts with fresh defaults. */}
          <TextInput
            key={season.name}
            name="name"
            defaultValue={season.name}
            size="sm"
            error={f.state?.error}
          />
        </form>
      </TableTd>
      <TableTd>
        <DatePickerInput
          value={f.startsOn}
          onChange={f.setStartsOn}
          valueFormat="DD MMM YYYY"
          firstDayOfWeek={1}
          dropdownType="modal"
          size="sm"
          w={140}
        />
      </TableTd>
      <TableTd>
        <DatePickerInput
          value={f.endsOn}
          onChange={f.setEndsOn}
          valueFormat="DD MMM YYYY"
          firstDayOfWeek={1}
          dropdownType="modal"
          minDate={f.startsOn ?? undefined}
          size="sm"
          w={140}
        />
      </TableTd>
      <TableTd>
        <StatusPill active={season.isActive} />
      </TableTd>
      <TableTd>
        <form action={f.mvpFormAction}>
          <input type="hidden" name="seasonId" value={season.id} />
          <input type="hidden" name="playerId" value={f.mvpChoice ?? ""} />
          <Group gap={4} wrap="nowrap">
            {/* The awards page derives season MVP from match-by-match picks;
                setting one here overrides that count. */}
            <Select
              placeholder="Auto (most MVPs)"
              size="xs"
              data={playerOptions}
              value={f.mvpChoice}
              onChange={f.setMvpChoice}
              w={150}
              searchable
            />
            <Button
              type="submit"
              size="xs"
              variant="light"
              loading={f.mvpPending}
              disabled={!f.mvpChoice}
            >
              Set
            </Button>
          </Group>
          {f.mvpState?.error && (
            <span style={{ color: "var(--loss-red)", fontSize: "var(--mantine-font-size-xs)" }}>
              {f.mvpState.error}
            </span>
          )}
        </form>
      </TableTd>
      <TableTd>
        <Group gap="xs" wrap="nowrap">
          <Button
            type="submit"
            form={f.formId}
            size="xs"
            variant="light"
            loading={f.pending}
          >
            Save
          </Button>
          {!season.isActive && (
            <form action={setActiveSeason}>
              <input type="hidden" name="id" value={season.id} />
              <Button type="submit" size="xs" variant="subtle" color="gray">
                Set active
              </Button>
            </form>
          )}
        </Group>
      </TableTd>
    </TableTr>
  );
}

/**
 * Phone layout for the same season. Six columns — two of them date pickers and
 * one a searchable Select — need well over 900px, so below `md` the row is
 * rebuilt as a stacked card rather than left to scroll sideways.
 */
export function SeasonCard({
  season,
  players,
  mvp,
}: {
  season: Season;
  players: Player[];
  mvp: Player | null;
}) {
  const f = useSeasonForm(season, mvp, "card");
  const playerOptions = players.map((p) => ({ value: String(p.id), label: p.name }));

  return (
    <Box style={{ borderBottom: "1px solid var(--hairline)", padding: "14px 16px" }}>
      <Stack gap={10}>
        <StatusPill active={season.isActive} />

        <form action={f.formAction} id={f.formId}>
          <input type="hidden" name="id" value={season.id} />
          <input type="hidden" name="startsOn" value={f.startsOn ?? ""} />
          <input type="hidden" name="endsOn" value={f.endsOn ?? ""} />
          <TextInput
            key={season.name}
            name="name"
            label="Name"
            defaultValue={season.name}
            size="sm"
            error={f.state?.error}
          />
        </form>

        <Group gap="sm" grow wrap="wrap">
          <DatePickerInput
            label="Starts"
            value={f.startsOn}
            onChange={f.setStartsOn}
            valueFormat="DD MMM YYYY"
            firstDayOfWeek={1}
            dropdownType="modal"
            size="sm"
            miw={140}
          />
          <DatePickerInput
            label="Ends"
            value={f.endsOn}
            onChange={f.setEndsOn}
            valueFormat="DD MMM YYYY"
            firstDayOfWeek={1}
            dropdownType="modal"
            minDate={f.startsOn ?? undefined}
            size="sm"
            miw={140}
          />
        </Group>

        <form action={f.mvpFormAction}>
          <input type="hidden" name="seasonId" value={season.id} />
          <input type="hidden" name="playerId" value={f.mvpChoice ?? ""} />
          <Group gap={6} align="flex-end" wrap="nowrap">
            <Select
              label="MVP override"
              placeholder="Auto (most MVPs)"
              size="sm"
              data={playerOptions}
              value={f.mvpChoice}
              onChange={f.setMvpChoice}
              searchable
              style={{ flex: 1, minWidth: 0 }}
            />
            <Button
              type="submit"
              size="sm"
              variant="light"
              loading={f.mvpPending}
              disabled={!f.mvpChoice}
            >
              Set
            </Button>
          </Group>
          {f.mvpState?.error && (
            <span style={{ color: "var(--loss-red)", fontSize: "var(--mantine-font-size-xs)" }}>
              {f.mvpState.error}
            </span>
          )}
        </form>

        <Group gap="xs" grow>
          <Button type="submit" form={f.formId} size="sm" variant="light" loading={f.pending}>
            Save
          </Button>
          {!season.isActive && (
            <form action={setActiveSeason}>
              <input type="hidden" name="id" value={season.id} />
              <Button type="submit" size="sm" variant="subtle" color="gray" fullWidth>
                Set active
              </Button>
            </form>
          )}
        </Group>
      </Stack>
    </Box>
  );
}
