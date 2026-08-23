"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Group, Menu, MenuDropdown, MenuItem, MenuLabel, MenuTarget, Text } from "@mantine/core";
import { setSessionMvp } from "../actions";

type Candidate = { id: number; name: string; teamColor: string | null };

/**
 * Picks the player of the day — one per matchday, replacing the per-match man
 * of the match that used to be chosen in the live console.
 *
 * Stays usable after the session is completed on purpose: the pick is usually
 * argued out after the last match, and it feeds nothing that would need
 * recomputing (the rating deliberately ignores it — see src/lib/rating.ts), so
 * there's no reason to make fixing it require reopening the session.
 */
export function SessionMvpControl({
  sessionId,
  mvp,
  candidates,
}: {
  sessionId: number;
  mvp: { id: number; name: string } | null;
  /** Everyone marked present this matchday — the server checks attendance too. */
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(value: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sessionId", String(sessionId));
      fd.set("mvpPlayerId", value);
      await setSessionMvp(undefined, fd);
      router.refresh();
    });
  }

  return (
    <Box
      style={{
        border: `1px solid ${mvp ? "var(--volt)" : "var(--hairline)"}`,
        borderRadius: 14,
        background: mvp ? "rgba(200,255,47,.08)" : "var(--panel)",
        padding: "14px 16px",
      }}
    >
      <Group justify="space-between" align="center" gap={12} wrap="nowrap">
        <div style={{ minWidth: 0 }}>
          <Text
            fz={10}
            fw={800}
            c="var(--text-muted)"
            style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
            Player of the day
          </Text>
          <Text fw={800} fz={18} truncate style={mvp ? { color: "var(--volt)" } : undefined}>
            {mvp ? `🏆 ${mvp.name}` : "Nobody picked yet"}
          </Text>
        </div>

        <Menu position="bottom-end" withinPortal shadow="md" width={240}>
          <MenuTarget>
            <button
              type="button"
              className="lc-chip"
              disabled={isPending || candidates.length === 0}
              style={{ flexShrink: 0, opacity: isPending || candidates.length === 0 ? 0.5 : 1 }}
            >
              {mvp ? "Change" : "Pick MVP"}
            </button>
          </MenuTarget>
          <MenuDropdown>
            <MenuLabel>Everyone who turned up</MenuLabel>
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
                      background: c.teamColor ?? "var(--hairline)",
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
      </Group>

      <Text fz={11} c="dimmed" mt={8}>
        Doesn&apos;t affect anyone&apos;s rating.
      </Text>
    </Box>
  );
}
