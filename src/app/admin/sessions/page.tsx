import { Badge, Button, Container, Stack, Table, Text, Title } from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";
import { CreateSessionForm } from "./CreateSessionForm";
import { deleteSession } from "./actions";

function nextSaturdayISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun ... 6 = Sat
  const diff = (6 - day + 7) % 7 || 7; // always a future Saturday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const STATUS_COLOR: Record<string, string> = {
  draft: "gray",
  teams_set: "blue",
  completed: "teal",
};

export default async function SessionsPage() {
  await requireAdmin(); // convention: see src/lib/auth.ts's requireAdmin() doc comment

  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  });

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
          <NavLink href="/admin" size="sm">
            &larr; Back to dashboard
          </NavLink>
          <Title order={1}>Sessions</Title>
        </div>

        {activeSeason ? (
          <CreateSessionForm
            key={sessions.length}
            defaultDate={nextSaturdayISO()}
          />
        ) : (
          <Text c="dimmed">
            No active season —{" "}
            <NavLink href="/admin/seasons">
              create/activate one
            </NavLink>{" "}
            first.
          </Text>
        )}

        <Table verticalSpacing="sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Attendees</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>
                  <NavLink href={`/admin/sessions/${session.id}`}>
                    {session.date.toISOString().slice(0, 10)}
                  </NavLink>
                </td>
                <td>
                  <Badge
                    color={STATUS_COLOR[session.status]}
                    variant="light"
                  >
                    {session.status}
                  </Badge>
                </td>
                <td>{session._count.attendances}</td>
                <td>
                  {session.status === "draft" && (
                    <form action={deleteSession}>
                      <input type="hidden" name="id" value={session.id} />
                      <Button
                        type="submit"
                        size="xs"
                        variant="subtle"
                        color="red"
                      >
                        Delete
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={4}>No sessions yet.</td>
              </tr>
            )}
          </tbody>
        </Table>
      </Stack>
    </Container>
  );
}
