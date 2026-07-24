import { Badge, Group, Stack, Text } from "@mantine/core";

type Team = {
  id: number;
  name: string;
  color: string;
  players: { player: { id: number; name: string } }[];
};

export function TeamRosters({ teams }: { teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No teams yet.
      </Text>
    );
  }

  return (
    <Group align="flex-start" gap="xl">
      {teams.map((team) => (
        <Stack key={team.id} gap={4} miw={140}>
          <Badge
            variant="filled"
            style={{ backgroundColor: team.color, color: "white" }}
          >
            {team.name} ({team.players.length})
          </Badge>
          {team.players.map((tp) => (
            <Text key={tp.player.id} size="sm">
              {tp.player.name}
            </Text>
          ))}
        </Stack>
      ))}
    </Group>
  );
}
