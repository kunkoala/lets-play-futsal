"use client";

import { useState } from "react";
import {
  Box,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { NavLink } from "@/components/NavLink";
import type { RecapPlayerLine } from "@/lib/sessionRecap";

/**
 * Sortable columns, in the order they appear. `W–D–L` sorts on wins — it's a
 * composite, and wins is the half anyone means by it.
 */
const SORT_FIELDS = [
  { key: "matchesPlayed", label: "MP" },
  { key: "goals", label: "G" },
  { key: "assists", label: "A" },
  { key: "contributions", label: "G+A" },
  { key: "cleanSheets", label: "CS" },
  { key: "wins", label: "W–D–L" },
] as const;

type SortField = (typeof SORT_FIELDS)[number]["key"];

/**
 * Always descending, like the leaderboard: nobody wants to see who scored
 * fewest, and an ascending state would just be an extra tap to get past.
 *
 * Ties fall back to goals then name, so the order is stable and a scorer
 * outranks a provider on the same total.
 */
function sortPlayers(players: RecapPlayerLine[], field: SortField): RecapPlayerLine[] {
  return [...players].sort(
    (a, b) => b[field] - a[field] || b.goals - a.goals || a.name.localeCompare(b.name),
  );
}

function SortableTh({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <TableTh style={{ padding: 0 }}>
      {/* The whole cell is the button, so the tap target is the column width
          rather than the few characters of the label — this table is read on a
          phone more than anywhere else. */}
      <Box
        component="button"
        type="button"
        onClick={onClick}
        aria-label={`Sort by ${label}`}
        aria-pressed={active}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: "12px 8px",
          textAlign: "center",
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          color: active ? "var(--volt)" : "var(--text-muted)",
        }}
      >
        {label}
        {active && <span aria-hidden> ▾</span>}
      </Box>
    </TableTh>
  );
}

function SessionStat({ value, active }: { value: string | number; active?: boolean }) {
  return (
    <TableTd style={{ textAlign: "center" }}>
      <Text
        className="tabular-nums"
        fw={active ? 800 : 500}
        fz={14}
        style={active ? { color: "var(--volt)" } : undefined}
      >
        {value}
      </Text>
    </TableTd>
  );
}

/**
 * Everyone's matchday in one table — the point being that a player who scored
 * nothing can still find their own row and see what they did.
 *
 * Sortable by every stat it shows, the same way the leaderboard is. It opens on
 * goal contributions so the podium's names are the ones at the top, but "who
 * kept the most clean sheets" and "who turned out for the most matches" are
 * questions this table can now answer without reading every row.
 */
export function SessionStatsTable({
  players,
  basePath,
}: {
  players: RecapPlayerLine[];
  basePath: string;
}) {
  const [sort, setSort] = useState<SortField>("contributions");
  const sorted = sortPlayers(players, sort);

  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--panel)",
      }}
    >
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <Table verticalSpacing={12} horizontalSpacing="md" highlightOnHover style={{ minWidth: 460 }}>
          <TableThead>
            <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
              <TableTh
                style={{
                  textAlign: "left",
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                Player
              </TableTh>
              {SORT_FIELDS.map((field) => (
                <SortableTh
                  key={field.key}
                  label={field.label}
                  active={sort === field.key}
                  onClick={() => setSort(field.key)}
                />
              ))}
            </TableTr>
          </TableThead>
          <TableTbody>
            {sorted.map((player) => (
              <TableTr key={player.playerId}>
                <TableTd>
                  <NavLink
                    href={`${basePath}/players/${player.playerId}`}
                    fw={600}
                    fz={14}
                    c="inherit"
                    underline="hover"
                  >
                    {player.name}
                  </NavLink>
                </TableTd>
                <SessionStat value={player.matchesPlayed} active={sort === "matchesPlayed"} />
                <SessionStat value={player.goals} active={sort === "goals"} />
                <SessionStat value={player.assists} active={sort === "assists"} />
                <SessionStat value={player.contributions} active={sort === "contributions"} />
                <SessionStat value={player.cleanSheets} active={sort === "cleanSheets"} />
                <SessionStat
                  value={`${player.wins}–${player.draws}–${player.losses}`}
                  active={sort === "wins"}
                />
              </TableTr>
            ))}
          </TableTbody>
        </Table>
      </div>
    </Box>
  );
}
