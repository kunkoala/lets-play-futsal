import { Badge, Group, Stack, Text } from "@mantine/core";
import { computeScore } from "@/lib/matchScore";
import { NavLink } from "@/components/NavLink";

type Team = { id: number; name: string; color: string };
type Match = {
  id: number;
  seq: number;
  status: string;
  homeTeam: Team;
  awayTeam: Team;
  goalEvents: { teamId: number }[];
};

export function MatchesSoFar({
  sessionId,
  matches,
}: {
  sessionId: number;
  matches: Match[];
}) {
  if (matches.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No matches yet.
      </Text>
    );
  }

  return (
    <Stack gap={6}>
      {matches.map((m) => {
        const score = computeScore(m.goalEvents, m.homeTeam.id, m.awayTeam.id);
        return (
          <NavLink
            key={m.id}
            href={`/admin/sessions/${sessionId}/live?matchId=${m.id}`}
            underline="never"
          >
            <Group gap={6} wrap="nowrap">
              <Text size="sm">
                {m.seq}. <span style={{ color: m.homeTeam.color }}>{m.homeTeam.name}</span>{" "}
                {score.home} — {score.away}{" "}
                <span style={{ color: m.awayTeam.color }}>{m.awayTeam.name}</span>
              </Text>
              {m.status === "in_progress" && (
                <Badge size="xs" color="orange">
                  live
                </Badge>
              )}
            </Group>
          </NavLink>
        );
      })}
    </Stack>
  );
}
