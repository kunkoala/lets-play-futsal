"use client";

import { Fragment, useState } from "react";
import { Box, Collapse, Group, Stack, TableTbody, TableTd, TableTr, Text } from "@mantine/core";
import { NavLink } from "@/components/NavLink";
import { PlayerNameList } from "@/components/PlayerNameList";
import { impressionProps, IMPRESSION_SESSION_ROW } from "@/lib/analyticsMarks";
import type { RecapLeader } from "@/lib/sessionRecap";
import type { SessionsViewRow } from "./SessionsView";

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
        whiteSpace: "nowrap",
        color: s.color,
        background: s.bg,
      }}
    >
      {s.label}
    </Box>
  );
}

/**
 * One night's leader in one stat, in the same shape as the season leaderboard's
 * highlight cards — the season and the matchday version of "top scorer" should
 * look like the same idea.
 *
 * Names wrap rather than truncate: a ten-way tie on one goal is the normal
 * result of a short evening, and cutting it to "Andika Putra…" would hide
 * everyone else who earned it.
 */
function LeaderCard({
  eyebrow,
  glyph,
  leader,
  unit,
  accent,
  basePath,
}: {
  eyebrow: string;
  glyph: string;
  leader: RecapLeader | null | undefined;
  unit: string;
  accent: string;
  basePath: string;
}) {
  return (
    <Box
      style={{
        flex: "1 1 190px",
        minWidth: 170,
        border: "1px solid var(--hairline)",
        borderRadius: 14,
        background: "var(--panel-raised)",
        padding: "12px 14px",
      }}
    >
      <Text
        component="div"
        fw={700}
        fz={10}
        c="dimmed"
        style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
      >
        {glyph} {eyebrow}
      </Text>
      {leader ? (
        <Group justify="space-between" align="flex-end" wrap="nowrap" gap="xs" mt={8}>
          <Box style={{ minWidth: 0 }}>
            <PlayerNameList players={leader.players} basePath={basePath} fz={13} fw={600} />
          </Box>
          <Group gap={4} align="flex-end" wrap="nowrap" style={{ flexShrink: 0 }}>
            <Text
              className="display-face tabular-nums"
              fw={900}
              fz={22}
              style={{ lineHeight: 0.9, color: accent }}
            >
              {leader.value}
            </Text>
            <Text c="dimmed" fw={600} fz={10} style={{ paddingBottom: 2 }}>
              {unit}
            </Text>
          </Group>
        </Group>
      ) : (
        <Text c="dimmed" fz={13} mt={8}>
          —
        </Text>
      )}
    </Box>
  );
}

/**
 * Matchday rows, each expanding to that night's highlights.
 *
 * The leaders used to sit inline in the collapsed row, which worked until a
 * session ended with ten players on one goal each and the row grew to three
 * lines of comma-separated names. Behind a toggle they can be as long as they
 * need to be, and the index goes back to being a scannable list of dates.
 */
export function SessionRows({
  sessions,
  basePath,
}: {
  sessions: SessionsViewRow[];
  basePath: string;
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <TableTbody>
      {sessions.map((s) => {
        const open = openId === s.id;
        // Nothing worth expanding for a session that hasn't been played yet.
        const hasDetail = Boolean(s.mvpName || s.topScorer || s.topAssister || s.mostCleanSheets);

        return (
          <Fragment key={s.id}>
            <TableTr {...impressionProps(IMPRESSION_SESSION_ROW, s.id)}>
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
                {s.mvpName && (
                  <Text fz={11} c="dimmed" mt={3} truncate>
                    🏆 {s.mvpName}
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
              <TableTd style={{ textAlign: "right", width: 44 }}>
                {hasDetail && (
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : s.id)}
                    aria-expanded={open}
                    aria-label={`${open ? "Hide" : "Show"} highlights for ${s.date.toISOString().slice(0, 10)}`}
                    style={{
                      border: "1px solid var(--hairline)",
                      background: "transparent",
                      color: "var(--text-muted)",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 11,
                      lineHeight: 1,
                      // 32px square: a comfortable thumb target without
                      // stretching the row height on desktop.
                      width: 32,
                      height: 32,
                    }}
                  >
                    {open ? "▲" : "▼"}
                  </button>
                )}
              </TableTd>
            </TableTr>

            {hasDetail && (
              <TableTr>
                {/* No vertical padding while closed, so a collapsed row adds
                    no height of its own to the table. */}
                <TableTd colSpan={4} style={{ padding: 0, borderTop: "none" }}>
                  <Collapse expanded={open}>
                    <Stack gap={10} px={{ base: 12, sm: 16 }} pt={4} pb={16}>
                      {(s.matchesPlayed || s.totalGoals) && (
                        <Text className="tabular-nums" fz={11} c="dimmed" fw={600}>
                          {s.matchesPlayed} match{s.matchesPlayed === 1 ? "" : "es"} ·{" "}
                          {s.totalGoals} goal{s.totalGoals === 1 ? "" : "s"}
                        </Text>
                      )}
                      <Group align="stretch" gap={10} wrap="wrap">
                        <LeaderCard
                          eyebrow="Top Scorer"
                          glyph="⚽"
                          leader={s.topScorer}
                          unit="goals"
                          accent="var(--volt)"
                          basePath={basePath}
                        />
                        <LeaderCard
                          eyebrow="Top Assists"
                          glyph="🅰"
                          leader={s.topAssister}
                          unit="assists"
                          accent="var(--team-blue)"
                          basePath={basePath}
                        />
                        <LeaderCard
                          eyebrow="Clean Sheets"
                          glyph="🧤"
                          leader={s.mostCleanSheets}
                          unit="CS"
                          accent="var(--team-purple)"
                          basePath={basePath}
                        />
                      </Group>
                      <NavLink
                        href={`${basePath}/sessions/${s.id}`}
                        fz={12}
                        fw={700}
                        underline="hover"
                        style={{ color: "var(--volt)" }}
                      >
                        Full matchday →
                      </NavLink>
                    </Stack>
                  </Collapse>
                </TableTd>
              </TableTr>
            )}
          </Fragment>
        );
      })}

      {sessions.length === 0 && (
        <TableTr>
          <TableTd colSpan={4}>
            <Text c="dimmed" py="md" ta="center" fz={14}>
              No sessions yet.
            </Text>
          </TableTd>
        </TableTr>
      )}
    </TableTbody>
  );
}
