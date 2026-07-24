import { Card, Group, Text } from "@mantine/core";
import { PodiumSpot } from "./PodiumSpot";

type Item = { playerId: number; name: string; value: number };

export function Podium({
  title,
  icon,
  unit,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  unit: string;
  items: Item[];
}) {
  const [first, second, third] = items;

  return (
    <Card withBorder radius="lg" padding="lg" className="fs-card-hover">
      <Group gap={8} mb={first ? "md" : 4}>
        {icon}
        <Text fw={700} size="lg">
          {title}
        </Text>
      </Group>
      {!first ? (
        <Text size="sm" c="dimmed">
          No data yet — play some matches this season!
        </Text>
      ) : (
        <Group align="flex-end" justify="center" gap={12}>
          <PodiumSpot place={2} item={second} unit={unit} />
          <PodiumSpot place={1} item={first} unit={unit} />
          <PodiumSpot place={3} item={third} unit={unit} />
        </Group>
      )}
    </Card>
  );
}
