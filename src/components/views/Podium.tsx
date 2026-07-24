import { Box, Group, Stack, Text } from "@mantine/core";
import { NavLink } from "@/components/NavLink";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type Item = { playerId: number; name: string; value: number };

/**
 * One award (Top Scorer / Top Assists / Most Wins): glyph + title over a top-3
 * list. The winner's rank numeral takes the award's accent (handoff §3).
 */
export function Podium({
  title,
  glyph,
  unit,
  items,
  accent,
  basePath = "",
}: {
  title: string;
  glyph: string;
  unit: string;
  items: Item[];
  accent: string;
  basePath?: string;
}) {
  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 16,
        background: "var(--panel)",
        padding: "18px 18px 8px",
      }}
    >
      <Group gap={8} align="center" mb={items.length ? 12 : 4}>
        <Text fz={16} component="span">
          {glyph}
        </Text>
        <Text
          fw={700}
          fz={11}
          c="dimmed"
          style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
        >
          {title}
        </Text>
      </Group>

      {items.length === 0 ? (
        <Text size="sm" c="dimmed" pb={10}>
          No data yet — play some matches this season!
        </Text>
      ) : (
        <Stack gap={0}>
          {items.map((item, i) => (
            <Group
              key={item.playerId}
              justify="space-between"
              wrap="nowrap"
              gap="sm"
              style={{
                padding: "10px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--hairline)",
              }}
            >
              <Group gap={11} wrap="nowrap" style={{ minWidth: 0 }}>
                <Text
                  className="display-face tabular-nums"
                  fw={900}
                  fz={17}
                  w={18}
                  ta="center"
                  style={{ color: i === 0 ? accent : "var(--text-muted)", flexShrink: 0 }}
                >
                  {i + 1}
                </Text>
                <PlayerAvatar name={item.name} size={30} ringColor={i === 0 ? accent : undefined} />
                <NavLink
                  href={`${basePath}/players/${item.playerId}`}
                  fw={600}
                  fz={14}
                  c="inherit"
                  underline="hover"
                  truncate
                >
                  {item.name}
                </NavLink>
              </Group>
              <Text className="tabular-nums" fw={800} fz={15} style={{ flexShrink: 0 }}>
                {item.value}
                <Text span c="dimmed" fw={500} fz={11}>
                  {" "}
                  {unit}
                </Text>
              </Text>
            </Group>
          ))}
        </Stack>
      )}
    </Box>
  );
}
