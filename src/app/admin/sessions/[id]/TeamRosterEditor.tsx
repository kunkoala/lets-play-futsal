"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Group, Select, Stack, Text } from "@mantine/core";
import { KEEPER_GLYPH } from "@/lib/keeperPref";
import { assignPlayerToTeam, benchPlayer, setTeamPlayerKeeper } from "../actions";

type Team = {
  id: number;
  name: string;
  color: string;
  players: { isKeeper: boolean; player: { id: number; name: string } }[];
};

/**
 * Editable version of `TeamRosters` for the `teams_set` stage — lets the
 * admin move a rostered player to a different team, hand the glove to
 * someone else, or add a latecomer who wasn't part of the original shuffle.
 *
 * Edits here apply from the next match onward: each match snapshots its own
 * lineup at kick-off (see MatchPlayer in prisma/schema.prisma), so nothing
 * already played is affected. Changing a match that's under way is the live
 * console's substitution, not this.
 */
export function TeamRosterEditor({
  sessionId,
  teams,
  assignablePlayers,
}: {
  sessionId: number;
  teams: Team[];
  /** Active players not currently on any of this session's current-round teams. */
  assignablePlayers: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addPlayerId, setAddPlayerId] = useState<string | null>(null);
  const [addTeamId, setAddTeamId] = useState<string | null>(null);

  const teamOptions = teams.map((t) => ({ value: String(t.id), label: t.name }));

  function move(playerId: number, teamId: number) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sessionId", String(sessionId));
      fd.set("playerId", String(playerId));
      fd.set("teamId", String(teamId));
      await assignPlayerToTeam(undefined, fd);
      router.refresh();
    });
  }

  function toggleKeeper(teamId: number, playerId: number, isKeeper: boolean) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sessionId", String(sessionId));
      fd.set("teamId", String(teamId));
      fd.set("playerId", String(playerId));
      fd.set("isKeeper", String(isKeeper));
      await setTeamPlayerKeeper(undefined, fd);
      router.refresh();
    });
  }

  function bench(playerId: number) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sessionId", String(sessionId));
      fd.set("playerId", String(playerId));
      await benchPlayer(undefined, fd);
      router.refresh();
    });
  }

  function addPlayer() {
    if (!addPlayerId || !addTeamId) return;
    move(Number(addPlayerId), Number(addTeamId));
    setAddPlayerId(null);
  }

  if (teams.length === 0) {
    return (
      <Text fz={14} c="dimmed">
        No teams yet.
      </Text>
    );
  }

  return (
    <Stack gap={16}>
      <Group align="stretch" gap={12} wrap="wrap">
        {teams.map((team) => {
          const roster = [...team.players].sort(
            (a, b) => Number(b.isKeeper) - Number(a.isKeeper),
          );
          return (
            <Box
              key={team.id}
              style={{
                flex: "1 1 220px",
                minWidth: 220,
                border: "1px solid var(--hairline)",
                borderLeft: `3px solid ${team.color}`,
                borderRadius: 14,
                background: "var(--panel)",
                padding: "14px 16px",
              }}
            >
              <Group justify="space-between" align="center" mb={8}>
                <Text fw={800} fz={14} style={{ color: team.color }}>
                  {team.name}
                </Text>
              </Group>
              <Stack gap={6}>
                {roster.map((tp) => (
                  <Group key={tp.player.id} gap={6} wrap="nowrap" align="center">
                    <button
                      type="button"
                      title={tp.isKeeper ? "Keeper — tap to clear" : "Tap to make keeper"}
                      onClick={() => toggleKeeper(team.id, tp.player.id, !tp.isKeeper)}
                      disabled={isPending}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        opacity: tp.isKeeper ? 1 : 0.3,
                        fontSize: 13,
                        flexShrink: 0,
                        padding: 0,
                      }}
                    >
                      {KEEPER_GLYPH}
                    </button>
                    <Text fz={13} fw={tp.isKeeper ? 700 : 500} truncate style={{ flex: 1 }}>
                      {tp.player.name}
                    </Text>
                    <Select
                      aria-label={`Move ${tp.player.name}`}
                      size="xs"
                      w={92}
                      data={teamOptions}
                      value={String(team.id)}
                      disabled={isPending}
                      allowDeselect={false}
                      onChange={(value) => {
                        if (value && Number(value) !== team.id) move(tp.player.id, Number(value));
                      }}
                    />
                    <button
                      type="button"
                      title={`Bench ${tp.player.name} — off the roster, no replacement`}
                      aria-label={`Bench ${tp.player.name}`}
                      onClick={() => bench(tp.player.id)}
                      disabled={isPending}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: 16,
                        lineHeight: 1,
                        flexShrink: 0,
                        padding: "0 2px",
                      }}
                    >
                      ×
                    </button>
                  </Group>
                ))}
                {roster.length === 0 && (
                  <Text fz={12} c="dimmed">
                    Nobody here.
                  </Text>
                )}
              </Stack>
            </Box>
          );
        })}
      </Group>

      {assignablePlayers.length > 0 && (
        <Group gap={8} align="flex-end" wrap="wrap">
          <Select
            label="Add a latecomer"
            placeholder="Player"
            size="xs"
            w={160}
            searchable
            data={assignablePlayers.map((p) => ({ value: String(p.id), label: p.name }))}
            value={addPlayerId}
            onChange={setAddPlayerId}
          />
          <Select
            placeholder="Team"
            size="xs"
            w={110}
            data={teamOptions}
            value={addTeamId}
            onChange={setAddTeamId}
          />
          <button
            type="button"
            className="lc-chip"
            disabled={!addPlayerId || !addTeamId || isPending}
            onClick={addPlayer}
            style={{ opacity: !addPlayerId || !addTeamId ? 0.5 : 1 }}
          >
            + Add to team
          </button>
        </Group>
      )}
      <Text fz={11} c="dimmed">
        Tap the glove to make someone the keeper, × to bench them (no replacement — the team plays
        a player short). Changes apply from the next match on; matches already played keep the
        lineup they were played with. To swap someone during a match, use ⇄ Sub in the live
        console.
      </Text>
    </Stack>
  );
}
