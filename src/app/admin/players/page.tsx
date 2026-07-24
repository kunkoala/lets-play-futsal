import { Container, Stack, Table, Title } from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";
import { AddPlayerForm } from "./AddPlayerForm";
import { PlayerRow } from "./PlayerRow";

export default async function PlayersPage() {
  await requireAdmin(); // convention: see src/lib/auth.ts's requireAdmin() doc comment

  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <NavLink href="/admin" size="sm">
            &larr; Back to dashboard
          </NavLink>
          <Title order={1}>Players</Title>
        </div>

        <AddPlayerForm key={players.length} />

        <Table verticalSpacing="sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={3}>No players yet — add the first one above.</td>
              </tr>
            )}
          </tbody>
        </Table>
      </Stack>
    </Container>
  );
}
