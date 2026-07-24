"use client";

import { useActionState } from "react";
import { Box, Button, Container, PasswordInput, Stack, Text } from "@mantine/core";
import { login, type LoginState } from "./actions";

const initialState: LoginState = undefined;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <Container size={400} py={{ base: 48, sm: 96 }}>
      <Box
        style={{
          border: "1px solid var(--hairline)",
          borderRadius: 20,
          background: "var(--panel)",
          padding: "32px 28px",
          boxShadow: "0 30px 70px -30px rgba(0,0,0,.55)",
        }}
      >
        <Stack gap="lg">
          <div>
            <Box
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: "linear-gradient(135deg, var(--volt), var(--volt-end))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                marginBottom: 14,
              }}
            >
              ⚽
            </Box>
            <Text
              component="h1"
              className="display-face"
              fw={900}
              fz={26}
              style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
            >
              Matchday HQ
            </Text>
            <Text c="dimmed" fz={13} mt={6}>
              Enter the admin password to run check-in, shuffle, and the live console.
            </Text>
          </div>

          <form action={formAction}>
            <Stack gap="md">
              <PasswordInput
                name="password"
                label="Password"
                placeholder="Admin password"
                required
                autoFocus
                size="md"
                error={state?.error}
              />
              <Button type="submit" loading={pending} fullWidth size="md" fw={700}>
                Log in
              </Button>
            </Stack>
          </form>
        </Stack>
      </Box>
    </Container>
  );
}
