import { Badge, Card, Container, Group, Stack, Table, Text, Title } from "@mantine/core";
import { getActiveSeason } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";
import { CalendarBlank, Users } from "@/components/icons";

const STATUS_COLOR: Record<string, string> = {
  draft: "gray",
  teams_set: "blue",
  completed: "teal",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Upcoming",
  teams_set: "In progress",
  completed: "Completed",
};

export default async function PublicSessionsPage() {
  const activeSeason = await getActiveSeason();
  const sessions = activeSeason
    ? await prisma.session.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { date: "desc" },
        include: { _count: { select: { attendances: true } } },
      })
    : [];

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div className="fs-fade-up">
          <Group gap={10}>
            <CalendarBlank size={26} weight="fill" color="var(--mantine-color-teal-6)" />
            <Title order={1} fz={{ base: 26, sm: 32 }}>
              Sessions
            </Title>
          </Group>
          {activeSeason && (
            <Text c="dimmed" size="sm" mt={4}>
              {activeSeason.name}
            </Text>
          )}
        </div>

        <Card withBorder radius="lg" p={0} className="fs-fade-up" style={{ animationDelay: "0.1s" }}>
          <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover w="100%">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Date</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "right" }}>Attendees</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <NavLink href={`/sessions/${s.id}`} fw={600} c="inherit" underline="hover">
                      {s.date.toISOString().slice(0, 10)}
                    </NavLink>
                  </td>
                  <td>
                    <Badge color={STATUS_COLOR[s.status]} variant="light" radius="sm">
                      {STATUS_LABEL[s.status]}
                    </Badge>
                  </td>
                  <td>
                    <Group gap={6} justify="flex-end" wrap="nowrap">
                      <Users size={15} weight="fill" color="var(--mantine-color-dimmed)" />
                      <Text fw={600}>{s._count.attendances}</Text>
                    </Group>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <Text c="dimmed" py="md" ta="center">
                      No sessions yet.
                    </Text>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </Stack>
    </Container>
  );
}
