"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Menu, MenuDropdown, MenuItem, MenuLabel, MenuTarget, Text } from "@mantine/core";
import { setMatchMvp } from "./live/actions";

type Candidate = { id: number; name: string; teamColor: string };

/**
 * Sets or clears man of the match on a finished match, after the fact — the
 * live console offers the same pick on the way out, but a mis-tap (or a match
 * ended without choosing) has to be fixable from the session page.
 */
export function MatchMvpControl({
  matchId,
  mvp,
  candidates,
}: {
  matchId: number;
  mvp: { id: number; name: string } | null;
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(value: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      fd.set("mvpPlayerId", value);
      await setMatchMvp(undefined, fd);
      router.refresh();
    });
  }

  return (
    <Menu position="bottom-end" withinPortal shadow="md" width={220}>
      <MenuTarget>
        <button
          type="button"
          disabled={isPending}
          title="Man of the match"
          style={{
            flexShrink: 0,
            border: `1px solid ${mvp ? "var(--volt)" : "var(--hairline)"}`,
            background: mvp ? "rgba(200,255,47,.12)" : "transparent",
            color: mvp ? "var(--volt)" : "var(--text-muted)",
            borderRadius: 20,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 800,
            whiteSpace: "nowrap",
            cursor: isPending ? "default" : "pointer",
            opacity: isPending ? 0.5 : 1,
          }}
        >
          {mvp ? `🏆 ${mvp.name}` : "🏆 Pick MVP"}
        </button>
      </MenuTarget>
      <MenuDropdown>
        <MenuLabel>Man of the match</MenuLabel>
        {candidates.map((c) => (
          <MenuItem
            key={c.id}
            onClick={() => choose(String(c.id))}
            leftSection={
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: c.teamColor,
                }}
              />
            }
          >
            <Text fz={13} fw={c.id === mvp?.id ? 800 : 500}>
              {c.name}
            </Text>
          </MenuItem>
        ))}
        {mvp && (
          <MenuItem onClick={() => choose("none")} c="dimmed">
            <Text fz={13}>Clear</Text>
          </MenuItem>
        )}
      </MenuDropdown>
    </Menu>
  );
}
