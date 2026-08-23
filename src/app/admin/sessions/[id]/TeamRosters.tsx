import { Box, Group, Stack, Text } from "@mantine/core";
import { KeeperChip } from "@/components/KeeperChip";

type Team = {
  id: number;
  name: string;
  color: string;
  players: { isKeeper: boolean; player: { id: number; name: string } }[];
};

/**
 * Team cards with a color left-border. `reveal` staggers the roster names in
 * with the popIn keyframe — the tail of the shuffle reveal (handoff §8).
 * Whoever the shuffle put in goal is listed first, with a glove.
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
      {teams.map((team) => {
        // Keeper is not sorted to the top; the GK badge marks them in place.
        const roster = [...team.players].sort((a, b) =>
          a.player.name.localeCompare(b.player.name),
        );
        return (
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
              {roster.map((tp) => (
                <Group
                  key={tp.player.id}
                  gap={6}
                  wrap="nowrap"
                  className={reveal ? "pop-in" : undefined}
                  style={reveal ? { animationDelay: `${popIndex++ * 45}ms` } : undefined}
                >
                  <Text fz={13} fw={tp.isKeeper ? 700 : 500} truncate>
                    {tp.player.name}
                  </Text>
                  {tp.isKeeper && <KeeperChip />}
                </Group>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Group>
  );
}
