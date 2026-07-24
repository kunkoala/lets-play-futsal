"use client";

import { useActionState, useMemo, useState } from "react";
import { Box, Button, Group, Select, Stack, Text } from "@mantine/core";
import { proposeNext, type PlayedMatch } from "@/lib/matchmaker";
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
          <Stack gap={14}>
            <Group gap={12} align="center" wrap="nowrap">
              <TeamTile team={proposal.home} played={playedCount.get(proposal.home.id) ?? 0} />
              <Text fw={800} c="dimmed" fz={13}>
                VS
              </Text>
              <TeamTile team={proposal.away} played={playedCount.get(proposal.away.id) ?? 0} />
            </Group>
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
