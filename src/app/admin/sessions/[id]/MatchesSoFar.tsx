import { Box, Group, Text } from "@mantine/core";
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
      <Text fz={14} c="dimmed">
        No matches yet.
      </Text>
    );
  }

  return (
    <Box style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {matches.map((m) => {
        const score = computeScore(m.goalEvents, m.homeTeam.id, m.awayTeam.id);
        const live = m.status === "in_progress";
        return (
          <NavLink
            key={m.id}
            href={`/admin/sessions/${sessionId}/live?matchId=${m.id}`}
            underline="never"
            c="inherit"
          >
            <Group
              justify="space-between"
              wrap="nowrap"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: "var(--panel-raised)",
                border: live ? "1px solid var(--team-yellow)" : "1px solid var(--hairline)",
              }}
            >
              <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                <Text className="tabular-nums" c="dimmed" fw={700} fz={12} w={16}>
                  {m.seq}
                </Text>
                <Text fw={800} fz={14} style={{ color: m.homeTeam.color }}>
                  {m.homeTeam.name}
                </Text>
                <Text className="display-face tabular-nums" fw={900} fz={15}>
                  {score.home}–{score.away}
                </Text>
                <Text fw={800} fz={14} style={{ color: m.awayTeam.color }}>
                  {m.awayTeam.name}
                </Text>
              </Group>
              {live && (
                <Text fz={10} fw={800} style={{ color: "var(--team-yellow)", flexShrink: 0 }}>
                  ● LIVE
                </Text>
              )}
            </Group>
          </NavLink>
        );
      })}
    </Box>
  );
}
