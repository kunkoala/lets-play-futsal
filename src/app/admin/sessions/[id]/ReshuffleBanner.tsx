"use client";

import { useActionState, useState } from "react";
import { Box, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { reshuffleTeams, type SessionFormState } from "../actions";

const initialState: SessionFormState = undefined;

/**
 * Surfaces once every team has played every other team this round (see
 * roundRobinComplete in matchmaker.ts) — a nudge, not an auto-reshuffle, so
 * the admin decides when the matchday is ready for fresh teams rather than
 * having it happen mid-match without warning.
 */
export function ReshuffleBanner({ sessionId }: { sessionId: number }) {
  const [state, formAction, pending] = useActionState(reshuffleTeams, initialState);
  const [dismissed, setDismissed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (dismissed) return null;

  return (
    <Box
      style={{
        border: "1px solid var(--volt)",
        borderRadius: 14,
        background: "rgba(200,255,47,.08)",
        padding: "14px 16px",
      }}
    >
      <Group justify="space-between" align="center" wrap="wrap" gap={12}>
        <Box>
          <Text fw={800} fz={14}>
            Everyone&apos;s played everyone once
          </Text>
          <Text fz={12} c="dimmed" mt={2}>
            Reshuffle for a fresh, balanced split — this matchday&apos;s results so far stay recorded.
          </Text>
        </Box>
        <Group gap={8} wrap="nowrap">
          <Button variant="subtle" color="gray" size="xs" onClick={() => setDismissed(true)}>
            Not now
          </Button>
          <Button size="xs" fw={700} onClick={() => setConfirming(true)}>
            🎲 Reshuffle teams
          </Button>
        </Group>
      </Group>

      {state?.error && (
        <Text c="var(--loss-red)" fz={13} mt={8}>
          {state.error}
        </Text>
      )}

      <Modal
        opened={confirming}
        onClose={() => setConfirming(false)}
        title="Reshuffle teams?"
        centered
      >
        <Stack>
          <Text fz={14}>
            This deals a brand new, balanced split from this matchday&apos;s check-in. Matches already
            played keep their results and stats — they stay attached to the teams that played
            them.
          </Text>
          <form
            action={(fd) => {
              setConfirming(false);
              formAction(fd);
            }}
          >
            <input type="hidden" name="sessionId" value={sessionId} />
            <Group justify="flex-end">
              <Button variant="default" type="button" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending} fw={700}>
                Reshuffle
              </Button>
            </Group>
          </form>
        </Stack>
      </Modal>
    </Box>
  );
}
