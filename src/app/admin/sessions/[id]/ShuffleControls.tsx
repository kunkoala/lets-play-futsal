"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Group, Text } from "@mantine/core";
import { shuffleIntoTeams } from "@/lib/shuffle";
import { paletteFor } from "@/lib/teamPalette";
import { shuffleTeams, type SessionFormState } from "../actions";

const initialState: SessionFormState = undefined;
const ROLL_TICKS = 16;
const TICK_MS = 85;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function pick<T>(arr: T[], n: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(Math.random() * arr.length)]);
  return out;
}

export function ShuffleControls({
  sessionId,
  attendingCount,
  attendingNames,
}: {
  sessionId: number;
  attendingCount: number;
  attendingNames: string[];
}) {
  const [state, formAction, pending] = useActionState(shuffleTeams, initialState);
  const [teamSize, setTeamSize] = useState(5);
  const [rolling, setRolling] = useState(false);
  const [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const sizes = useMemo(() => {
    if (attendingCount < 4) return null;
    try {
      const ids = Array.from({ length: attendingCount }, (_, i) => i);
      return shuffleIntoTeams(ids, teamSize).map((t) => t.length);
    } catch {
      return null;
    }
  }, [attendingCount, teamSize]);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  function submitNow() {
    const fd = new FormData();
    fd.set("sessionId", String(sessionId));
    fd.set("teamSize", String(teamSize));
    formAction(fd);
  }

  function onShuffle() {
    if (rolling || attendingCount < 4) return;
    if (prefersReducedMotion() || attendingNames.length === 0) {
      submitNow();
      return;
    }
    // Slot-machine roll (~1.4s) over random names, then commit the real
    // Fisher–Yates split on the server (handoff §8).
    setRolling(true);
    let n = 0;
    timer.current = setInterval(() => {
      n += 1;
      setTick((t) => t + 1);
      if (n >= ROLL_TICKS) {
        if (timer.current) clearInterval(timer.current);
        setRolling(false);
        submitNow();
      }
    }, TICK_MS);
  }

  const canShuffle = attendingCount >= 4;
  const cols = sizes ?? [];

  return (
    <Box>
      <Group align="flex-end" gap={20} wrap="wrap">
        {/* Team-size stepper */}
        <Box>
          <Text fw={700} fz={10} c="dimmed" mb={6} style={{ letterSpacing: "0.12em" }}>
            TEAM SIZE
          </Text>
          <Group gap={0} align="center">
            <Stepper onClick={() => setTeamSize((s) => Math.max(1, s - 1))} disabled={rolling}>
              −
            </Stepper>
            <Text
              className="display-face tabular-nums"
              fw={900}
              fz={30}
              w={54}
              ta="center"
              style={{ lineHeight: 1 }}
            >
              {teamSize}
            </Text>
            <Stepper onClick={() => setTeamSize((s) => Math.min(11, s + 1))} disabled={rolling}>
              +
            </Stepper>
          </Group>
        </Box>

        {/* Split preview */}
        {sizes && (
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Text fw={700} fz={10} c="dimmed" mb={6} style={{ letterSpacing: "0.12em" }}>
              {attendingCount} ATTENDING → {sizes.length} TEAMS
            </Text>
            <Group gap={6}>
              {sizes.map((sz, i) => (
                <Box
                  key={i}
                  className="tabular-nums"
                  style={{
                    padding: "5px 12px",
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 14,
                    color: "#fff",
                    background: paletteFor(i).color,
                  }}
                >
                  {sz}
                </Box>
              ))}
            </Group>
          </Box>
        )}
      </Group>

      {/* Rolling reveal */}
      {rolling && cols.length > 0 && (
        <Group gap={8} mt={16} align="stretch">
          {cols.map((sz, i) => (
            <Box
              key={i}
              style={{
                flex: 1,
                borderRadius: 12,
                border: `1px solid ${paletteFor(i).color}`,
                background: "var(--panel)",
                padding: "10px 12px",
                overflow: "hidden",
              }}
            >
              <Text fw={800} fz={11} mb={6} style={{ color: paletteFor(i).color }}>
                {paletteFor(i).name.toUpperCase()}
              </Text>
              <Box style={{ filter: "blur(0.6px)", opacity: 0.7 }}>
                {pick(attendingNames, sz).map((nm, j) => (
                  <Text key={`${tick}-${j}`} fz={13} fw={500} truncate>
                    {nm}
                  </Text>
                ))}
              </Box>
            </Box>
          ))}
        </Group>
      )}

      <Button
        onClick={onShuffle}
        loading={pending}
        disabled={!canShuffle || rolling}
        fullWidth
        size="md"
        fw={800}
        mt={16}
      >
        🎲 Shuffle teams
      </Button>

      {!canShuffle && (
        <Text fz={13} c="dimmed" mt={8}>
          Save check-in with at least 4 attendees first.
        </Text>
      )}
      {state?.error && (
        <Text c="var(--loss-red)" fz={13} mt={8}>
          {state.error}
        </Text>
      )}
    </Box>
  );
}

function Stepper({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        border: "1px solid var(--hairline)",
        background: "var(--panel-raised)",
        color: "var(--text)",
        fontSize: 20,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
