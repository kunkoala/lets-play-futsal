"use client";

import { Fragment, useState } from "react";
import { Box, Collapse, Group, Text } from "@mantine/core";
import { computeScore } from "@/lib/matchScore";
import { NavLink } from "@/components/NavLink";
import { MatchCorrections } from "./MatchCorrections";

type Team = { id: number; name: string; color: string };
type Player = { id: number; name: string };

export type MatchRow = {
  id: number;
  seq: number;
  status: string;
  homeTeam: Team;
  awayTeam: Team;
  goalEvents: {
    id: number;
    teamId: number;
    matchSec: number | null;
    scorer: Player | null;
    assist: Player | null;
  }[];
  /** Who played, per team — the pool a correction can credit a goal to. */
  lineup: { playerId: number; teamId: number; isKeeper: boolean; player: Player }[];
};

/**
 * The matchdays' scorelines, each opening onto its own correction panel.
 *
 * Corrections live behind a toggle rather than on their own page: an admin
 * fixing a mistyped scorer is looking at the score that looks wrong, and
 * sending them elsewhere to fix it loses that context.
 */
export function MatchesSoFar({
  sessionId,
  matches,
}: {
  sessionId: number;
  matches: MatchRow[];
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  if (matches.length === 0) {
    return (
      <Text fz={14} c="dimmed">
        No matches yet.
      </Text>
    );
  }

  return (
    <Box style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {matches.map((m) => {
        const score = computeScore(m.goalEvents, m.homeTeam.id, m.awayTeam.id);
        const live = m.status === "in_progress";
        const open = openId === m.id;

        const sideFor = (team: Team) => {
          const spots = m.lineup.filter((spot) => spot.teamId === team.id);
          return {
            id: team.id,
            name: team.name,
            color: team.color,
            players: spots
              .map((spot) => spot.player)
              .sort((a, b) => a.name.localeCompare(b.name)),
            keeperId: spots.find((spot) => spot.isKeeper)?.playerId ?? null,
          };
        };

        return (
          <Fragment key={m.id}>
            <Group
              justify="space-between"
              wrap="nowrap"
              gap={8}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: "var(--panel-raised)",
                border: live ? "1px solid var(--team-yellow)" : "1px solid var(--hairline)",
                borderBottomLeftRadius: open ? 0 : 12,
                borderBottomRightRadius: open ? 0 : 12,
              }}
            >
              <NavLink
                href={`/admin/sessions/${sessionId}/live?matchId=${m.id}`}
                underline="never"
                c="inherit"
                style={{ minWidth: 0, flex: 1 }}
              >
                <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                  <Text className="tabular-nums" c="dimmed" fw={700} fz={12} w={16}>
                    {m.seq}
                  </Text>
                  <Text fw={800} fz={14} style={{ color: m.homeTeam.color }}>
                    {m.homeTeam.name}
                  </Text>
                  <Text className="display-face tabular-nums" fw={900} fz={15}>
                    {score.home}–{score.away}
                  </Text>
                  <Text fw={800} fz={14} style={{ color: m.awayTeam.color }}>
                    {m.awayTeam.name}
                  </Text>
                </Group>
              </NavLink>

              {live ? (
                <Text fz={10} fw={800} style={{ color: "var(--team-yellow)", flexShrink: 0 }}>
                  ● LIVE
                </Text>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : m.id)}
                  aria-expanded={open}
                  aria-label={`${open ? "Close" : "Open"} corrections for match ${m.seq}`}
                  className="lc-chip"
                  style={{ flexShrink: 0, fontSize: 11 }}
                >
                  {open ? "Done" : "Fix"}
                </button>
              )}
            </Group>

            {!live && (
              <Collapse expanded={open}>
                <Box
                  style={{
                    padding: "14px 16px 16px",
                    borderRadius: "0 0 12px 12px",
                    marginTop: -6,
                    background: "var(--panel)",
                    border: "1px solid var(--hairline)",
                    borderTop: "none",
                  }}
                >
                  <MatchCorrections
                    matchId={m.id}
                    sides={[sideFor(m.homeTeam), sideFor(m.awayTeam)]}
                    goals={m.goalEvents}
                  />
                </Box>
              </Collapse>
            )}
          </Fragment>
        );
      })}
    </Box>
  );
}
