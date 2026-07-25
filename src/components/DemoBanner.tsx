import { Box, Container, Group, Text } from "@mantine/core";
import { NavLink } from "@/components/NavLink";

/**
 * Sits above every `/demo` page. Deliberately not dismissable: the whole point
 * is that nobody screenshots a demo standing and takes it for a real result.
 */
export function DemoBanner() {
  return (
    <Box
      style={{
        background: "linear-gradient(135deg, var(--volt), var(--volt-end))",
        color: "#0D0F14",
        // This banner sits above the sticky Navbar, so at the top of the page
        // it — not the nav — is what's behind the Dynamic Island in a
        // standalone PWA. Same fix as Navbar.tsx.
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <Container size="lg" py={9}>
        <Group justify="space-between" align="center" wrap="wrap" gap={8}>
          <Group gap={8} wrap="nowrap" align="center">
            <Box
              component="span"
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.14em",
                border: "1px solid rgba(13,15,20,.45)",
                borderRadius: 20,
                padding: "2px 9px",
                whiteSpace: "nowrap",
              }}
            >
              DEMO
            </Box>
            <Text fw={700} fz={13}>
              Made-up players and results, for showing the app off. Nothing here is real.
            </Text>
          </Group>
          <NavLink
            href="/"
            fw={800}
            fz={13}
            underline="never"
            style={{ color: "#0D0F14", whiteSpace: "nowrap" }}
          >
            Go to the real site →
          </NavLink>
        </Group>
      </Container>
    </Box>
  );
}
