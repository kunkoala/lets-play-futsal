"use client";

import { useActionState, useMemo, useState } from "react";
import { Badge, Button, Group, Select, Stack, Text } from "@mantine/core";
import { proposeNext, type PlayedMatch } from "@/lib/matchmaker";
import { startMatch, type SessionFormState } from "../actions";

type Team = { id: number; name: string; color: string };

const initialState: SessionFormState = undefined;

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
    <Stack gap="sm">
      <Text fw={500}>Played so far</Text>
      <Group gap="xs">
        {teams.map((t) => (
          <Badge key={t.id} variant="filled" style={{ backgroundColor: t.color, color: "white" }}>
            {t.name}: {playedCount.get(t.id) ?? 0}
          </Badge>
        ))}
      </Group>

      {proposal && !showOverride && (
        <form action={formAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="homeTeamId" value={proposal.home.id} />
          <input type="hidden" name="awayTeamId" value={proposal.away.id} />
          <Stack gap="xs">
            <Text>
              Next match:{" "}
              <Text span fw={700} style={{ color: proposal.home.color }}>
                {proposal.home.name}
              </Text>{" "}
              vs{" "}
              <Text span fw={700} style={{ color: proposal.away.color }}>
                {proposal.away.name}
              </Text>
            </Text>
            <Group>
              <Button type="submit" loading={pending}>
                Start this match
              </Button>
              <Button variant="subtle" type="button" onClick={() => setShowOverride(true)}>
                Pick different teams
              </Button>
            </Group>
          </Stack>
        </form>
      )}

      {showOverride && (
        <form action={formAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="homeTeamId" value={overrideHome ?? ""} />
          <input type="hidden" name="awayTeamId" value={overrideAway ?? ""} />
          <Stack gap="xs">
            <Group>
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
              >
                Start this match
              </Button>
              <Button variant="subtle" type="button" onClick={() => setShowOverride(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </form>
      )}

      {state?.error && (
        <Text c="red" size="sm">
          {state.error}
        </Text>
      )}
    </Stack>
  );
}
