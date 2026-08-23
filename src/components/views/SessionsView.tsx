// Named cell components — Table.Thead/… statics don't survive the Server
// Component boundary, and raw <td> misses Mantine's cell padding.
import {
  Box,
  Container,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { NavLink } from "@/components/NavLink";
import { impressionProps, IMPRESSION_SESSION_ROW } from "@/lib/analyticsMarks";
import type { RecapLeader } from "@/lib/sessionRecap";

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Upcoming", color: "var(--text-muted)", bg: "rgba(255,255,255,.06)" },
  teams_set: { label: "In progress", color: "var(--team-blue)", bg: "rgba(77,139,255,.14)" },
  completed: { label: "Completed", color: "var(--volt)", bg: "rgba(200,255,47,.12)" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.draft;
  return (
    <Box
      component="span"
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontWeight: 700,
        fontSize: 11,
        color: s.color,
        background: s.bg,
      }}
    >
      {s.label}
    </Box>
  );
}

export type SessionsViewRow = {
  id: number;
  date: Date;
  status: string;
  attendeeCount: number;
  /** Player of the day, when one was picked. */
  mvpName?: string | null;
  /** Whoever scored most that night — every name, when it was a tie. */
  topScorer?: RecapLeader | null;
};

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
            <Table verticalSpacing={12} horizontalSpacing="lg" highlightOnHover w="100%">
              <TableThead>
                <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <Th align="left">Date</Th>
                  <Th align="left">Status</Th>
                  <Th align="right">Players</Th>
                </TableTr>
              </TableThead>
              <TableTbody>
                {sessions.map((s) => (
                  <TableTr key={s.id} {...impressionProps(IMPRESSION_SESSION_ROW, s.id)}>
                    <TableTd>
                      <NavLink
                        href={`${basePath}/sessions/${s.id}`}
                        fw={600}
                        fz={14}
                        c="inherit"
                        underline="hover"
                      >
                        {s.date.toISOString().slice(0, 10)}
                      </NavLink>
                      {/* One line of "what happened that night", so the index
                          is scannable without opening every matchday. */}
                      {(s.mvpName || s.topScorer) && (
                        <Text fz={11} c="dimmed" mt={3} style={{ lineHeight: 1.3 }}>
                          {s.mvpName && <>🏆 {s.mvpName}</>}
                          {s.mvpName && s.topScorer && " · "}
                          {s.topScorer && (
                            <>
                              ⚽ {s.topScorer.names.join(", ")} {s.topScorer.value}
                            </>
                          )}
                        </Text>
                      )}
                    </TableTd>
                    <TableTd>
                      <StatusPill status={s.status} />
                    </TableTd>
                    <TableTd style={{ textAlign: "right" }}>
                      <Text className="tabular-nums" fw={700} fz={14}>
                        {s.attendeeCount}
                      </Text>
                    </TableTd>
                  </TableTr>
                ))}
                {sessions.length === 0 && (
                  <TableTr>
                    <TableTd colSpan={3}>
                      <Text c="dimmed" py="md" ta="center" fz={14}>
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
