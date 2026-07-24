import { Box, Stack, Text } from "@mantine/core";
import { NavLink } from "@/components/NavLink";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Medal } from "@/components/icons";

type Item = { playerId: number; name: string; value: number };

const HEIGHT = { 1: 128, 2: 92, 3: 72 } as const;
const TIER_COLOR = { 1: "gold", 2: "silver", 3: "bronze" } as const;

export function PodiumSpot({
  place,
  item,
  unit,
}: {
  place: 1 | 2 | 3;
  item?: Item;
  unit: string;
}) {
  if (!item) {
    return <div style={{ flex: 1, maxWidth: 120 }} />;
  }

  const color = TIER_COLOR[place];

  return (
    <Stack align="center" gap={6} style={{ flex: 1, maxWidth: 120 }}>
      <PlayerAvatar name={item.name} size={place === 1 ? 56 : 44} />
      <NavLink
        href={`/players/${item.playerId}`}
        fw={700}
        ta="center"
        c="inherit"
        underline="hover"
        size={place === 1 ? "md" : "sm"}
        style={{ lineHeight: 1.2 }}
      >
        {item.name}
      </NavLink>
      <Text fw={800} size={place === 1 ? "xl" : "lg"} c={`${color}.6`}>
        {item.value}
        <Text span size="xs" c="dimmed">
          {" "}
          {unit}
        </Text>
      </Text>
      <Box
        w="100%"
        style={{
          height: HEIGHT[place],
          borderRadius: 12,
          background: `var(--mantine-color-${color}-light)`,
          border: `1px solid var(--mantine-color-${color}-4)`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: 10,
        }}
      >
        <Medal size={place === 1 ? 34 : 28} weight="fill" color={`var(--mantine-color-${color}-6)`} />
      </Box>
    </Stack>
  );
}
