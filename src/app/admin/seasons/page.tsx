import { Box, Container, Group, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text } from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";
import { ArrowLeft } from "@/components/icons";
import { CreateSeasonForm } from "./CreateSeasonForm";
import { SeasonCard, SeasonRow } from "./SeasonRow";

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <TableTh
      style={{
        textAlign: "left",
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </TableTh>
  );
}

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
            SEASONS
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
          <CreateSeasonForm key={seasons.length} />
        </Box>

        <Box
          style={{
            border: "1px solid var(--hairline)",
            borderRadius: 16,
            overflow: "hidden",
            background: "var(--panel)",
          }}
        >
          {/* Six columns — two date pickers and a searchable Select among
              them — need ~900px. Below `md` the card list takes over. */}
          <Box visibleFrom="md" style={{ overflowX: "auto" }}>
            <Table verticalSpacing={12} horizontalSpacing="md" w="100%">
              <TableThead>
                <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <Th>Name</Th>
                  <Th>Starts</Th>
                  <Th>Ends</Th>
                  <Th>Status</Th>
                  <Th>MVP override</Th>
                  <Th />
                </TableTr>
              </TableThead>
              <TableTbody>
                {seasons.map((season) => (
                  <SeasonRow
                    key={season.id}
                    season={season}
                    players={players}
                    mvp={mvpBySeasonId.get(season.id) ?? null}
                  />
                ))}
                {seasons.length === 0 && (
                  <TableTr>
                    <TableTd colSpan={6}>
                      <Text c="dimmed" fz={14} py="sm">
                        No seasons yet. Create the first one above.
                      </Text>
                    </TableTd>
                  </TableTr>
                )}
              </TableTbody>
            </Table>
          </Box>

          <Box hiddenFrom="md">
            {seasons.map((season) => (
              <SeasonCard
                key={season.id}
                season={season}
                players={players}
                mvp={mvpBySeasonId.get(season.id) ?? null}
              />
            ))}
            {seasons.length === 0 && (
              <Text c="dimmed" fz={14} p="md">
                No seasons yet. Create the first one above.
              </Text>
            )}
          </Box>
        </Box>
      </Stack>
    </Container>
  );
}
