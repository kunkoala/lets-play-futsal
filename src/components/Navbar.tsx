import { Container, Group } from "@mantine/core";
import { verifySession } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";

export async function Navbar() {
  const isAdmin = await verifySession();

  return (
    <Container size="md" py="sm">
      <Group justify="space-between" wrap="wrap">
        <NavLink href="/" fw={700} underline="never" c="inherit">
          ⚽ Let&apos;s Play Futsal
        </NavLink>
        <Group gap="md">
          <NavLink href="/sessions" size="sm">
            Sessions
          </NavLink>
          <NavLink href="/awards" size="sm">
            Awards
          </NavLink>
          {isAdmin ? (
            <NavLink href="/admin" size="sm">
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
  );
}
