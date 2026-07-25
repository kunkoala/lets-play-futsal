"use client";

import { useActionState, useMemo, useState } from "react";
import { Box, Button, Group, NumberInput, Select, Stack, Text } from "@mantine/core";
import { proposeNext, type PlayedMatch } from "@/lib/matchmaker";
import {
  breakAtSec,
  DEFAULT_DURATION_MIN,
  DURATION_PRESETS_MIN,
  formatClock,
  MAX_DURATION_MIN,
  MIN_DURATION_MIN,
} from "@/lib/matchClock";
import { startMatch, type SessionFormState } from "../actions";

type Team = { id: number; name: string; color: string };

const initialState: SessionFormState = undefined;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Text
      component="div"
      fw={700}
      fz={10}
      c="dimmed"
      style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
    >
      {children}
    </Text>
  );
}

/**
 * Match length, chosen with the same tap that starts the match.
 *
 * The hint under the presets is the point of the whole control: anything over
 * 10 minutes gets a water break at its midpoint, and this is where you find
 * that out — before kick-off, not when the clock stops mid-game.
 */
function DurationPicker({
  minutes,
  onChange,
}: {
  minutes: number | null;
  onChange: (m: number | null) => void;
}) {
  const isPreset = minutes !== null && (DURATION_PRESETS_MIN as readonly number[]).includes(minutes);
  const breakAt = breakAtSec(minutes === null ? null : minutes * 60);

  return (
    <Box>
      <Eyebrow>Match length</Eyebrow>
      <Group gap={6} mt={8} wrap="wrap">
        {DURATION_PRESETS_MIN.map((m) => {
          const active = minutes === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange(m)}
              aria-pressed={active}
              style={{
                border: `1px solid ${active ? "var(--volt)" : "var(--hairline)"}`,
                background: active ? "var(--volt)" : "transparent",
                color: active ? "#0D0F14" : "var(--text)",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 14,
                fontWeight: active ? 800 : 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {m}
            </button>
          );
        })}
        <NumberInput
          aria-label="Custom match length in minutes"
          placeholder="Custom"
          size="xs"
          w={92}
          min={MIN_DURATION_MIN}
          max={MAX_DURATION_MIN}
          clampBehavior="strict"
          hideControls
          suffix=" min"
          value={isPreset || minutes === null ? "" : minutes}
          onChange={(v) => onChange(v === "" ? null : Number(v))}
        />
      </Group>
      <Text fz={12} c="dimmed" mt={6}>
        {minutes === null
          ? "No timer — the clock will count up."
          : breakAt === null
            ? `${minutes} min straight through — no water break at or under 10.`
            : `Water break at ${formatClock(breakAt)}.`}
      </Text>
    </Box>
  );
}

/** Team tile for the RED vs GREEN proposal, with its played-count for fairness. */
function TeamTile({ team, played }: { team: Team; played: number }) {
  return (
    <Box
      style={{
        flex: 1,
        borderRadius: 14,
        padding: "16px 14px",
        textAlign: "center",
        color: "#fff",
        background: team.color,
      }}
    >
      <Text className="display-face" fw={900} fz={18} style={{ letterSpacing: "0.04em" }}>
        {team.name.toUpperCase()}
      </Text>
      <Text fz={11} fw={600} mt={4} style={{ opacity: 0.85 }}>
        {played} played
      </Text>
    </Box>
  );
}

export function NextMatchCard({
  sessionId,
  teams,
  finishedMatches,
}: {
  sessionId: number;
  teams: Team[];
  finishedMatches: PlayedMatch[];
}) {
  const [state, formAction, pending] = useActionState(startMatch, initialState);
  const [overrideHome, setOverrideHome] = useState<string | null>(null);
  const [overrideAway, setOverrideAway] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [durationMin, setDurationMin] = useState<number | null>(DEFAULT_DURATION_MIN);

  const playedCount = useMemo(() => {
    const counts = new Map(teams.map((t) => [t.id, 0]));
    for (const m of finishedMatches) {
      counts.set(m.home, (counts.get(m.home) ?? 0) + 1);
      counts.set(m.away, (counts.get(m.away) ?? 0) + 1);
    }
    return counts;
  }, [teams, finishedMatches]);

  const proposal = useMemo(() => {
    if (teams.length < 2) return null;
    const [homeId, awayId] = proposeNext(
      teams.map((t) => t.id),
      finishedMatches,
    );
    return {
      home: teams.find((t) => t.id === homeId)!,
      away: teams.find((t) => t.id === awayId)!,
    };
  }, [teams, finishedMatches]);

  const teamOptions = teams.map((t) => ({
    value: String(t.id),
    label: `${t.name} (${playedCount.get(t.id) ?? 0} played)`,
  }));

  return (
    <Stack gap={14}>
      <Eyebrow>Matchmaker says · Match {finishedMatches.length + 1}</Eyebrow>

      {proposal && !showOverride && (
        <form action={formAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="homeTeamId" value={proposal.home.id} />
          <input type="hidden" name="awayTeamId" value={proposal.away.id} />
          <input type="hidden" name="durationMin" value={durationMin ?? ""} />
          <Stack gap={14}>
            <Group gap={12} align="center" wrap="nowrap">
              <TeamTile team={proposal.home} played={playedCount.get(proposal.home.id) ?? 0} />
              <Text fw={800} c="dimmed" fz={13}>
                VS
              </Text>
              <TeamTile team={proposal.away} played={playedCount.get(proposal.away.id) ?? 0} />
            </Group>
            <DurationPicker minutes={durationMin} onChange={setDurationMin} />
            <Button type="submit" loading={pending} size="md" fw={800}>
              ▶ Start this match
            </Button>
            <Button variant="subtle" color="gray" type="button" onClick={() => setShowOverride(true)}>
              Pick different teams
            </Button>
          </Stack>
        </form>
      )}

      {showOverride && (
        <form action={formAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="homeTeamId" value={overrideHome ?? ""} />
          <input type="hidden" name="awayTeamId" value={overrideAway ?? ""} />
          <input type="hidden" name="durationMin" value={durationMin ?? ""} />
          <Stack gap="sm">
            <Group grow>
              <Select
                label="Home team"
                data={teamOptions}
                value={overrideHome}
                onChange={setOverrideHome}
              />
              <Select
                label="Away team"
                data={teamOptions}
                value={overrideAway}
                onChange={setOverrideAway}
              />
            </Group>
            <DurationPicker minutes={durationMin} onChange={setDurationMin} />
            <Group>
              <Button
                type="submit"
                loading={pending}
                disabled={!overrideHome || !overrideAway || overrideHome === overrideAway}
                fw={700}
              >
                Start this match
              </Button>
              <Button variant="subtle" color="gray" type="button" onClick={() => setShowOverride(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </form>
      )}

      {state?.error && (
        <Text c="var(--loss-red)" fz={13}>
          {state.error}
        </Text>
      )}
    </Stack>
  );
}
