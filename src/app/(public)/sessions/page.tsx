import { Badge, Container, Stack, Table, Text, Title } from "@mantine/core";
import { getActiveSeason } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";

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
        <div>
          <Title order={1}>Sessions</Title>
          {activeSeason && (
            <Text c="dimmed" size="sm">
              {activeSeason.name}
            </Text>
          )}
        </div>

        <Table verticalSpacing="sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Attendees</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>
                  <NavLink href={`/sessions/${s.id}`}>
                    {s.date.toISOString().slice(0, 10)}
                  </NavLink>
                </td>
                <td>
                  <Badge color={STATUS_COLOR[s.status]} variant="light">
                    {STATUS_LABEL[s.status]}
                  </Badge>
                </td>
                <td>{s._count.attendances}</td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={3}>No sessions yet.</td>
              </tr>
            )}
          </tbody>
        </Table>
      </Stack>
    </Container>
  );
}
