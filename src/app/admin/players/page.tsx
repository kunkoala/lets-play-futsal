import { Box, Container, Group, Stack, Text } from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";
import { ArrowLeft } from "@/components/icons";
import { AddPlayerForm } from "./AddPlayerForm";
import { PlayerDirectory } from "./PlayerDirectory";

export default async function PlayersPage() {
  await requireAdmin(); // convention: see src/lib/auth.ts's requireAdmin() doc comment

  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });

  return (
    <Container size="lg" py={{ base: 20, sm: 32 }} pb={64}>
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
          <AddPlayerForm
            key={players.length}
            players={players.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }))}
          />
        </Box>

        {players.length === 0 ? (
          <Text c="dimmed" fz={14}>
            No players yet. Add the first one above.
          </Text>
        ) : (
          <PlayerDirectory players={players} />
        )}
      </Stack>
    </Container>
  );
}
