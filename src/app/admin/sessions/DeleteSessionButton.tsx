"use client";

import { useState } from "react";
import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { deleteSession } from "./actions";

export function DeleteSessionButton({
  sessionId,
  sessionDate,
  completed,
}: {
  sessionId: number;
  sessionDate: string;
  completed: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  function close() {
    setConfirming(false);
    setTyped("");
  }

  return (
    <>
      <Button
        type="button"
        size="xs"
        variant="subtle"
        color="red"
        onClick={() => setConfirming(true)}
      >
        Delete
      </Button>

      <Modal opened={confirming} onClose={close} title="Delete session?" centered>
        <Stack>
          <Text fz={14}>
            This permanently deletes the {sessionDate} session
            {completed
              ? ", including every match, goal, and stat recorded that night"
              : ""}
            . This can&apos;t be undone.
          </Text>
          <form action={deleteSession}>
            <input type="hidden" name="id" value={sessionId} />
            <Stack gap={6}>
              <TextInput
                label={
                  <>
                    Type <b>{sessionDate}</b> (YYYY-MM-DD) to confirm
                  </>
                }
                value={typed}
                onChange={(e) => setTyped(e.currentTarget.value)}
                placeholder={sessionDate}
                autoComplete="off"
              />
              <Group justify="flex-end">
                <Button variant="default" type="button" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" color="red" fw={700} disabled={typed !== sessionDate}>
                  Delete session
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Modal>
    </>
  );
}
