import { Button, Card, Container, Group, Stack, Text, Title } from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { logout } from "./actions";

// Quick-links dashboard. The fuller version (active season summary, next
// session shortcut per PLAN.md §5) is a nice-to-have polish item, not core.
export default async function AdminPage() {
  // Belt-and-suspenders with proxy.ts: every admin page/action independently
  // re-verifies the session (see requireAdmin()'s doc comment in
  // src/lib/auth.ts) rather than trusting the route guard alone.
  await requireAdmin();

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={1}>Admin dashboard</Title>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group>
              <NavLink href="/admin/players">Players</NavLink>
              <NavLink href="/admin/seasons">Seasons</NavLink>
              <NavLink href="/admin/sessions">Sessions</NavLink>
            </Group>
            <Text size="sm" c="dimmed">
              Open a session to check in players, shuffle teams, and run the
              live match console.
            </Text>
            <form action={logout}>
              <Button type="submit" color="red" variant="light">
                Log out
              </Button>
            </form>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
