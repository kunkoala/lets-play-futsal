import { Card, Stack, Text, Title } from "@mantine/core";
import { NavLink } from "@/components/NavLink";
import { Confetti } from "@/components/Confetti";
import { Trophy, ArrowRight } from "@/components/icons";

export function MvpSpotlight({ mvp }: { mvp: { id: number; name: string } }) {
  return (
    <Card
      withBorder
      radius="lg"
      padding="xl"
      className="fs-pop-in"
      style={{ position: "relative", overflow: "hidden" }}
    >
      <Confetti />
      <Stack align="center" gap={6} style={{ position: "relative", zIndex: 1 }}>
        <Trophy size={44} weight="fill" color="var(--mantine-color-teal-6)" />
        <Text fw={700} size="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: 2 }}>
          Most Valuable Player
        </Text>
        <Title order={1} className="fs-gradient-text" fz={{ base: 34, sm: 46 }} ta="center">
          {mvp.name}
        </Title>
        <NavLink href={`/players/${mvp.id}`} size="sm" fw={600} c="teal">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            View player profile <ArrowRight size={14} weight="bold" />
          </span>
        </NavLink>
      </Stack>
    </Card>
  );
}
