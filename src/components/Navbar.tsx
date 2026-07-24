import { Box, Container, Group } from "@mantine/core";
import { verifySession } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { SoccerBall, Trophy } from "@/components/icons";

export async function Navbar() {
  const isAdmin = await verifySession();

  return (
    <Box
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(8px)",
        backgroundColor: "color-mix(in srgb, var(--mantine-color-body) 85%, transparent)",
        borderBottom: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Container size="md" py="sm">
        <Group justify="space-between" wrap="wrap">
          <NavLink href="/" fw={800} underline="never" c="inherit" fz="lg">
            <Group gap={8} wrap="nowrap">
              <SoccerBall size={24} weight="fill" color="var(--mantine-color-teal-6)" />
              <span>Let&apos;s Play Futsal</span>
            </Group>
          </NavLink>
          <Group gap="lg">
            <NavLink href="/sessions" size="sm" fw={600} c="dimmed">
              Sessions
            </NavLink>
            <NavLink href="/awards" size="sm" fw={600} c="dimmed">
              <Group gap={6} wrap="nowrap">
                <Trophy size={16} weight="fill" />
                <span>Awards</span>
              </Group>
            </NavLink>
            {isAdmin ? (
              <NavLink href="/admin" size="sm" fw={600} c="dimmed">
                Admin
              </NavLink>
            ) : (
              <NavLink href="/login" size="sm" c="dimmed">
                Admin login
              </NavLink>
            )}
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
