import { Container, Stack, Table, Title } from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";
import { CreateSeasonForm } from "./CreateSeasonForm";
import { SeasonRow } from "./SeasonRow";

export default async function SeasonsPage() {
  await requireAdmin(); // convention: see src/lib/auth.ts's requireAdmin() doc comment

  const seasons = await prisma.season.findMany({
    orderBy: { startsOn: "desc" },
  });
  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });
  const mvpAwards = await prisma.award.findMany({
    where: { type: "mvp" },
    include: { player: true },
  });
  const mvpBySeasonId = new Map(mvpAwards.map((a) => [a.seasonId, a.player]));

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <NavLink href="/admin" size="sm">
            &larr; Back to dashboard
          </NavLink>
          <Title order={1}>Seasons</Title>
        </div>

        <CreateSeasonForm key={seasons.length} />

        <Table verticalSpacing="sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Starts on</th>
              <th>Ends on</th>
              <th>Status</th>
              <th>MVP</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {seasons.map((season) => (
              <SeasonRow
                key={season.id}
                season={season}
                players={players}
                mvp={mvpBySeasonId.get(season.id) ?? null}
              />
            ))}
            {seasons.length === 0 && (
              <tr>
                <td colSpan={6}>
                  No seasons yet — create the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Stack>
    </Container>
  );
}
