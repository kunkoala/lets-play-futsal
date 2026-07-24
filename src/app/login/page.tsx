"use client";

import { useActionState } from "react";
import {
  Button,
  Card,
  Container,
  PasswordInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { login, type LoginState } from "./actions";

const initialState: LoginState = undefined;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <Container size="xs" py="xl">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <div>
            <Title order={2}>Admin login</Title>
            <Text c="dimmed" size="sm">
              Enter the admin password to manage players, seasons, and
              sessions.
            </Text>
          </div>

          <form action={formAction}>
            <Stack gap="sm">
              <PasswordInput
                name="password"
                label="Password"
                placeholder="Admin password"
                required
                autoFocus
                error={state?.error}
              />
              <Button type="submit" loading={pending} fullWidth>
                Log in
              </Button>
            </Stack>
          </form>
        </Stack>
      </Card>
    </Container>
  );
}
