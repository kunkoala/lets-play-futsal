import { Box, Group, Stack, Text } from "@mantine/core";

type Team = {
  id: number;
  name: string;
  color: string;
  players: { player: { id: number; name: string } }[];
};

/**
 * Team cards with a color left-border. `reveal` staggers the roster names in
 * with the popIn keyframe — the tail of the shuffle reveal (handoff §8).
 */
export function TeamRosters({ teams, reveal }: { teams: Team[]; reveal?: boolean }) {
  if (teams.length === 0) {
    return (
      <Text fz={14} c="dimmed">
        No teams yet.
      </Text>
    );
  }

  let popIndex = 0;
  return (
    <Group align="stretch" gap={12} wrap="wrap">
      {teams.map((team) => (
        <Box
          key={team.id}
          style={{
            flex: "1 1 150px",
            minWidth: 150,
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
            <Text className="tabular-nums" fz={11} fw={700} c="dimmed">
              {team.players.length}
            </Text>
          </Group>
          <Stack gap={3}>
            {team.players.map((tp) => (
              <Text
                key={tp.player.id}
                fz={13}
                fw={500}
                className={reveal ? "pop-in" : undefined}
                style={reveal ? { animationDelay: `${popIndex++ * 45}ms` } : undefined}
              >
                {tp.player.name}
              </Text>
            ))}
          </Stack>
        </Box>
      ))}
    </Group>
  );
}
