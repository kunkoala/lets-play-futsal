import { Box, Container, Group } from "@mantine/core";
import { verifySession } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { SoccerBallIcon } from "@/components/icons";

export async function Navbar() {
  const isAdmin = await verifySession();

  return (
    <Box
      component="nav"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(10px)",
        backgroundColor: "color-mix(in srgb, var(--deep-panel) 82%, transparent)",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <Container size="lg" py={12}>
        <Group justify="space-between" wrap="nowrap">
          <NavLink href="/" underline="never" c="inherit">
            <Group gap={9} wrap="nowrap" component="span" align="center">
              <Box
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: "linear-gradient(135deg, var(--volt), var(--volt-end))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <SoccerBallIcon size={19} weight="fill" color="#0D0F14" />
              </Box>
              <span
                className="display-face"
                style={{
                  fontWeight: 800,
                  fontSize: 17,
                  letterSpacing: "-0.01em",
                }}
              >
                PPI BS Futsal
              </span>
            </Group>
          </NavLink>

          <Group gap={4} wrap="nowrap">
            <NavItem href="/">Leaderboard</NavItem>
            <NavItem href="/sessions">Sessions</NavItem>
            <NavItem href="/awards">Awards</NavItem>
            {isAdmin ? (
              <NavItem href="/admin">Admin</NavItem>
            ) : (
              <NavItem href="/login">Admin login</NavItem>
            )}
          </Group>
        </Group>
      </Container>
    </Box>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <NavLink
      href={href}
      underline="never"
      c="dimmed"
      fw={600}
      fz={13}
      px={12}
      py={7}
      style={{
        borderRadius: 10,
        letterSpacing: "0.01em",
        transition: "color 0.15s ease, background-color 0.15s ease",
      }}
    >
      {children}
    </NavLink>
  );
}
