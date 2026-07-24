import { Box, Container, Group, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text } from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";
import { ArrowLeft } from "@/components/icons";
import { AddPlayerForm } from "./AddPlayerForm";
import { PlayerRow } from "./PlayerRow";

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "center" | "right" }) {
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

export default async function PlayersPage() {
  await requireAdmin(); // convention: see src/lib/auth.ts's requireAdmin() doc comment

  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });

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
            PLAYERS
          </Text>
        </div>

        <Box
          style={{
            border: "1px solid var(--hairline)",
            borderRadius: 16,
            background: "var(--panel)",
            padding: "18px 20px",
          }}
        >
          <AddPlayerForm key={players.length} />
        </Box>

        <Box
          style={{
            border: "1px solid var(--hairline)",
            borderRadius: 16,
            overflow: "hidden",
            background: "var(--panel)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <Table verticalSpacing={10} horizontalSpacing="lg" w="100%">
              <TableThead>
                <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </TableTr>
              </TableThead>
              <TableTbody>
                {players.map((player) => (
                  <PlayerRow key={player.id} player={player} />
                ))}
                {players.length === 0 && (
                  <TableTr>
                    <TableTd colSpan={3}>
                      <Text c="dimmed" fz={14} py="sm">
                        No players yet — add the first one above.
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
