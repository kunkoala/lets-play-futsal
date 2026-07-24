"use client";

import { useActionState, useState } from "react";
import { Box, Button, Group, Text } from "@mantine/core";
import { saveAttendance, type SessionFormState } from "../actions";

const initialState: SessionFormState = undefined;

type Player = { id: number; name: string };

export function AttendanceChecklist({
  sessionId,
  players,
  initialAttendingIds,
}: {
  sessionId: number;
  players: Player[];
  initialAttendingIds: number[];
}) {
  const [state, formAction, pending] = useActionState(saveAttendance, initialState);
  const [checked, setChecked] = useState<Set<number>>(new Set(initialAttendingIds));

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="sessionId" value={sessionId} />
      {[...checked].map((id) => (
        <input key={id} type="checkbox" name="playerId" value={id} checked readOnly hidden />
      ))}

      <Group justify="space-between" align="center" mb={14}>
        <Text fw={800} fz={16} className="display-face" style={{ letterSpacing: "-0.01em" }}>
          Check-in
        </Text>
        <Box
          component="span"
          className="tabular-nums"
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "var(--volt)",
            background: "rgba(200,255,47,.12)",
            borderRadius: 20,
            padding: "4px 12px",
          }}
        >
          {checked.size} attending
        </Box>
      </Group>

      {players.length === 0 ? (
        <Text fz={14} c="dimmed">
          No active players — add some on the Players page first.
        </Text>
      ) : (
        <Box
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          }}
        >
          {players.map((player) => {
            const on = checked.has(player.id);
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => toggle(player.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 50,
                  padding: "8px 12px",
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s ease, border-color 0.12s ease, opacity 0.12s ease",
                  background: on ? "var(--panel)" : "#15171D",
                  border: on ? "1px solid var(--volt)" : "1px solid var(--hairline)",
                  opacity: on ? 1 : 0.55,
                }}
              >
                <Box
                  component="span"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#0D0F14",
                    background: on ? "var(--volt)" : "transparent",
                    border: on ? "none" : "1.5px solid var(--text-muted)",
                  }}
                >
                  {on ? "✓" : ""}
                </Box>
                <Text fz={14} fw={600} c="var(--mantine-color-text)" truncate>
                  {player.name}
                </Text>
              </button>
            );
          })}
        </Box>
      )}

      {state?.error && (
        <Text c="var(--loss-red)" fz={13} mt={10}>
          {state.error}
        </Text>
      )}
      <Button type="submit" loading={pending} mt={16} fw={700}>
        Save check-in
      </Button>
    </form>
  );
}
