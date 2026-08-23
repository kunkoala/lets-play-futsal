"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Group,
  Table,
  TableTbody,
  TableTh,
  TableThead,
  TableTr,
  Text,
  TextInput,
} from "@mantine/core";
import type { KeeperPref } from "@/lib/shuffle";
import { playerNameKey } from "@/lib/playerName";
import { PlayerCard, PlayerRow } from "./PlayerRow";

type Player = { id: number; name: string; isActive: boolean; keeperPref: KeeperPref };

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
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

/** Section heading with a count, so "how many are actually active" is answerable at a glance. */
function SectionHeader({
  label,
  count,
  onToggle,
  collapsed,
}: {
  label: string;
  count: number;
  /** Omitted for sections that are always open. */
  onToggle?: () => void;
  collapsed?: boolean;
}) {
  const content = (
    <Group gap={8} align="center">
      {onToggle && (
        <Text fz={11} c="dimmed" w={10}>
          {collapsed ? "▸" : "▾"}
        </Text>
      )}
      <Text
        fz={10}
        fw={800}
        c="var(--text-muted)"
        style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
      >
        {label}
      </Text>
      <Text fz={11} fw={700} c="dimmed" className="tabular-nums">
        {count}
      </Text>
    </Group>
  );

  const style: React.CSSProperties = {
    padding: "10px 16px",
    background: "var(--panel-raised)",
    borderBottom: "1px solid var(--hairline)",
  };

  return onToggle ? (
    <Box
      component="button"
      type="button"
      onClick={onToggle}
      style={{ ...style, width: "100%", border: "none", cursor: "pointer", textAlign: "left" }}
    >
      {content}
    </Box>
  ) : (
    <Box style={style}>{content}</Box>
  );
}

/**
 * The roster list: search, then active players, then deactivated ones behind a
 * collapsed section.
 *
 * Deactivated players are hidden by default but never dropped from the search —
 * a name that matches has to surface wherever it lives, since "I couldn't find
 * them so I added them again" is exactly how the duplicate rows got created
 * (see src/lib/playerName.ts). A search hit in the inactive section opens it.
 */
export function PlayerDirectory({ players }: { players: Player[] }) {
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const { active, inactive } = useMemo(() => {
    // Matched on the same normalised key the duplicate check uses, so searching
    // "azhar r" finds "Azhar R." rather than nothing.
    const key = playerNameKey(query);
    const matches = key === "" ? players : players.filter((p) => playerNameKey(p.name).includes(key));
    return {
      active: matches.filter((p) => p.isActive),
      inactive: matches.filter((p) => !p.isActive),
    };
  }, [players, query]);

  const searching = playerNameKey(query) !== "";
  // A match the admin can't see is worse than a long list, so a search that only
  // hits deactivated players opens that section for them.
  const inactiveOpen = showInactive || (searching && inactive.length > 0);

  return (
    <Box>
      <TextInput
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder={`Search ${players.length} players`}
        size="sm"
        mb={12}
      />

      <Box
        style={{
          border: "1px solid var(--hairline)",
          borderRadius: 16,
          overflow: "hidden",
          background: "var(--panel)",
        }}
      >
        <SectionHeader label="Active" count={active.length} />
        <PlayerList players={active} emptyLabel={searching ? "No active players match." : "No active players."} />

        {(inactive.length > 0 || !searching) && (
          <>
            <SectionHeader
              label="Deactivated"
              count={inactive.length}
              collapsed={!inactiveOpen}
              onToggle={() => setShowInactive((open) => !open)}
            />
            {inactiveOpen && (
              <PlayerList
                players={inactive}
                emptyLabel={searching ? "No deactivated players match." : "Nobody is deactivated."}
              />
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

/**
 * One group of players, in both layouts. The four-column table needs ~700px
 * before the name field and the position Select collide, so below `sm` each
 * player becomes a stacked card instead of a sideways scroll.
 */
function PlayerList({ players, emptyLabel }: { players: Player[]; emptyLabel: string }) {
  if (players.length === 0) {
    return (
      <Text c="dimmed" fz={13} p="md">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <>
      <Box visibleFrom="sm" style={{ overflowX: "auto" }}>
        <Table verticalSpacing={10} horizontalSpacing="lg" w="100%">
          <TableThead>
            <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
              <Th>Name</Th>
              <Th>Position</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </TableTr>
          </TableThead>
          <TableTbody>
            {players.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
          </TableTbody>
        </Table>
      </Box>

      <Box hiddenFrom="sm">
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </Box>
    </>
  );
}
