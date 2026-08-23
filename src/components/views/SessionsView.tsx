// Named cell components — Table.Thead/… statics don't survive the Server
// Component boundary, and raw <td> misses Mantine's cell padding.
import { Box, Container, Stack, Table, TableTh, TableThead, TableTr, Text } from "@mantine/core";
import type { RecapLeader } from "@/lib/sessionRecap";
import { SessionRows } from "./SessionRows";

export type SessionsViewRow = {
  id: number;
  date: Date;
  status: string;
  attendeeCount: number;
  /** Player of the day, when one was picked. */
  mvpName?: string | null;
  /**
   * That matchday's leaders, shown in the expandable panel. Every tied name is
   * included — which is exactly why they can't go in the collapsed row: ten
   * players level on one goal is a normal Sunday and made an unreadable
   * three-line wall of names on the index.
   */
  topScorer?: RecapLeader | null;
  topAssister?: RecapLeader | null;
  mostCleanSheets?: RecapLeader | null;
  totalGoals?: number;
  matchesPlayed?: number;
};

function Th({ children, align }: { children: React.ReactNode; align: "left" | "right" }) {
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

/** Matchday list. Rows come from the caller, so `/demo/sessions` reuses it. */
export function SessionsView({
  sessions,
  seasonName,
  basePath = "",
}: {
  /** Newest first. */
  sessions: SessionsViewRow[];
  seasonName: string | null;
  basePath?: string;
}) {
  const activeSeason = seasonName ? { name: seasonName } : null;

  return (
    <Container size="sm" py={{ base: 20, sm: 32 }} pb={64}>
      <Stack gap="lg">
        <div className="fs-fade-up">
          <Text
            component="h1"
            className="display-face"
            fw={900}
            fz={{ base: 26, sm: 32 }}
            style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
          >
            SESSIONS
          </Text>
          {activeSeason && (
            <Text c="dimmed" fz={13} mt={4}>
              {activeSeason.name}
            </Text>
          )}
        </div>

        <Box
          className="fs-fade-up"
          style={{
            border: "1px solid var(--hairline)",
            borderRadius: 16,
            overflow: "hidden",
            background: "var(--panel)",
            animationDelay: "0.05s",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <Table verticalSpacing={12} horizontalSpacing="md" w="100%">
              <TableThead>
                <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <Th align="left">Date</Th>
                  <Th align="left">Status</Th>
                  <Th align="right">Players</Th>
                  {/* Chevron column — no heading, the icon says what it does. */}
                  <Th align="right"> </Th>
                </TableTr>
              </TableThead>
              <SessionRows sessions={sessions} basePath={basePath} />
            </Table>
          </div>
        </Box>
      </Stack>
    </Container>
  );
}
