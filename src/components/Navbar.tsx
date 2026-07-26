import { Box, Container, Group } from "@mantine/core";
import { verifySession } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { MobileNav } from "@/components/MobileNav";
import { SoccerBallIcon } from "@/components/icons";

/**
 * `basePath` is "" on the real site and "/demo" inside the demo, so every link
 * keeps you in whichever one you're already looking at.
 */
export async function Navbar({ basePath = "" }: { basePath?: string }) {
  const isAdmin = await verifySession();

  const links = [
    { href: basePath || "/", label: "Leaderboard" },
    { href: `${basePath}/sessions`, label: "Sessions" },
    { href: `${basePath}/awards`, label: "Awards" },
  ];
  const adminLink = isAdmin
    ? { href: "/admin", label: "Admin", accent: true }
    : { href: "/login", label: "Admin login", accent: true };
  // Admin now lives in the footer on desktop — reachable but out of the way.
  // Kept in the mobile burger drawer too, since the footer is a much longer
  // scroll to reach on a phone.
  const mobileLinks = [...links, adminLink];

  return (
    <Box
      component="nav"
      style={{
        // Stickiness now lives on the wrapper in (public)/layout.tsx and
        // demo/layout.tsx, so the LiveBanner/DemoBanner above it scrolls
        // together with the nav as one stuck unit instead of scrolling away
        // on its own.
        backdropFilter: "blur(10px)",
        backgroundColor: "color-mix(in srgb, var(--deep-panel) 82%, transparent)",
        borderBottom: "1px solid var(--hairline)",
        // Standalone PWA on iOS runs content under the Dynamic Island
        // (viewport-fit=cover in the root layout). This still matters when
        // Navbar is the first element (no banner showing) — the wrapper
        // sticking doesn't change who's actually touching the island.
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <Container size="lg" py={12} px={{ base: 16, sm: 24 }}>
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <NavLink href={basePath || "/"} underline="never" c="inherit">
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
                Liga Minggu
              </span>
            </Group>
          </NavLink>

          {/* Below `sm` these collapse into the burger drawer — four labels
              plus the wordmark do not fit a phone in one nowrap row. */}
          <Group gap={4} wrap="nowrap" visibleFrom="sm">
            {links.map((link) => (
              <NavItem key={link.href} href={link.href}>
                {link.label}
              </NavItem>
            ))}
          </Group>

          <MobileNav items={mobileLinks} />
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
