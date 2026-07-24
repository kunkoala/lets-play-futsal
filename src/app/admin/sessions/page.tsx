import { Box, Button, Container, Group, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text } from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";
import { ArrowLeft } from "@/components/icons";
import { CreateSessionForm } from "./CreateSessionForm";
import { deleteSession } from "./actions";

function nextSaturdayISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun ... 6 = Sat
  const diff = (6 - day + 7) % 7 || 7; // always a future Saturday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "var(--team-green)", bg: "rgba(47,208,106,.14)" },
  teams_set: { label: "Teams set", color: "var(--team-blue)", bg: "rgba(77,139,255,.14)" },
  completed: { label: "Completed", color: "var(--volt)", bg: "rgba(200,255,47,.12)" },
};

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <TableTh
      style={{
        textAlign: align,
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </TableTh>
  );
}

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
    <Container size="md" py={{ base: 20, sm: 32 }} pb={64}>
      <Stack gap="lg">
        <div>
          <NavLink href="/admin" c="dimmed" fz={13} underline="never">
            <Group gap={5} wrap="nowrap" component="span" align="center">
              <ArrowLeft size={14} weight="bold" />
              <span>Dashboard</span>
            </Group>
          </NavLink>
          <Text
            component="h1"
            className="display-face"
            fw={900}
            fz={{ base: 28, sm: 34 }}
            mt={10}
            style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
          >
            SESSIONS
          </Text>
        </div>

        {activeSeason ? (
          <Box
            style={{
              border: "1px solid var(--hairline)",
              borderRadius: 16,
              background: "var(--panel)",
              padding: "18px 20px",
            }}
          >
            <CreateSessionForm key={sessions.length} defaultDate={nextSaturdayISO()} />
          </Box>
        ) : (
          <Text c="dimmed" fz={14}>
            No active season — <NavLink href="/admin/seasons">create/activate one</NavLink> first.
          </Text>
        )}

        <Box
          style={{
            border: "1px solid var(--hairline)",
            borderRadius: 16,
            overflow: "hidden",
            background: "var(--panel)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <Table verticalSpacing={12} horizontalSpacing="lg" highlightOnHover w="100%">
              <TableThead>
                <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th align="right">Players</Th>
                  <Th align="right" />
                </TableTr>
              </TableThead>
              <TableTbody>
                {sessions.map((session) => {
                  const s = STATUS_STYLE[session.status] ?? STATUS_STYLE.draft;
                  return (
                    <TableTr key={session.id}>
                      <TableTd>
                        <NavLink
                          href={`/admin/sessions/${session.id}`}
                          fw={600}
                          fz={14}
                          c="inherit"
                          underline="hover"
                        >
                          {session.date.toISOString().slice(0, 10)}
                        </NavLink>
                      </TableTd>
                      <TableTd>
                        <Box
                          component="span"
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontWeight: 800,
                            fontSize: 10,
                            letterSpacing: "0.08em",
                            color: s.color,
                            background: s.bg,
                          }}
                        >
                          {s.label.toUpperCase()}
                        </Box>
                      </TableTd>
                      <TableTd style={{ textAlign: "right" }}>
                        <Text className="tabular-nums" fw={700} fz={14}>
                          {session._count.attendances}
                        </Text>
                      </TableTd>
                      <TableTd style={{ textAlign: "right" }}>
                        {session.status === "draft" && (
                          <form action={deleteSession}>
                            <input type="hidden" name="id" value={session.id} />
                            <Button type="submit" size="xs" variant="subtle" color="red">
                              Delete
                            </Button>
                          </form>
                        )}
                      </TableTd>
                    </TableTr>
                  );
                })}
                {sessions.length === 0 && (
                  <TableTr>
                    <TableTd colSpan={4}>
                      <Text c="dimmed" fz={14} py="sm">
                        No sessions yet.
                      </Text>
                    </TableTd>
                  </TableTr>
                )}
              </TableTbody>
            </Table>
          </div>
        </Box>
      </Stack>
    </Container>
  );
}
