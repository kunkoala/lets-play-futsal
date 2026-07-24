import { Box, Group, Text } from "@mantine/core";
import { computeScore } from "@/lib/matchScore";
import { NavLink } from "@/components/NavLink";
import { MatchMvpControl } from "./MatchMvpControl";

type Team = { id: number; name: string; color: string };
type Match = {
  id: number;
  seq: number;
  status: string;
  homeTeam: Team;
  awayTeam: Team;
  goalEvents: { teamId: number }[];
  mvpPlayer: { id: number; name: string } | null;
};
type Roster = {
  id: number;
  color: string;
  players: { player: { id: number; name: string } }[];
};

export function MatchesSoFar({
  sessionId,
  matches,
  rosters,
}: {
  sessionId: number;
  matches: Match[];
  /** Session teams with their players — the MVP picker's candidate pool. */
  rosters: Roster[];
}) {
  if (matches.length === 0) {
    return (
      <Text fz={14} c="dimmed">
        No matches yet.
      </Text>
    );
  }

  const rosterById = new Map(rosters.map((r) => [r.id, r]));

  return (
    <Box style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {matches.map((m) => {
        const score = computeScore(m.goalEvents, m.homeTeam.id, m.awayTeam.id);
        const live = m.status === "in_progress";
        const candidates = [m.homeTeam.id, m.awayTeam.id].flatMap((teamId) => {
          const roster = rosterById.get(teamId);
          if (!roster) return [];
          return roster.players.map((tp) => ({
            id: tp.player.id,
            name: tp.player.name,
            teamColor: roster.color,
          }));
        });

        return (
          <Group
            key={m.id}
            justify="space-between"
            wrap="nowrap"
            gap={8}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: "var(--panel-raised)",
              border: live ? "1px solid var(--team-yellow)" : "1px solid var(--hairline)",
            }}
          >
            <NavLink
              href={`/admin/sessions/${sessionId}/live?matchId=${m.id}`}
              underline="never"
              c="inherit"
              style={{ minWidth: 0, flex: 1 }}
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
            </NavLink>
            {live ? (
              <Text fz={10} fw={800} style={{ color: "var(--team-yellow)", flexShrink: 0 }}>
                ● LIVE
              </Text>
            ) : (
              <MatchMvpControl matchId={m.id} mvp={m.mvpPlayer} candidates={candidates} />
            )}
          </Group>
        );
      })}
    </Box>
  );
}
