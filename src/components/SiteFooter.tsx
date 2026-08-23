import { Box, Container, Group, Stack, Text } from "@mantine/core";
import { verifySession } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { GithubLogo, SoccerBallIcon } from "@/components/icons";

const REPO_URL = "https://github.com/kunkoala/lets-play-futsal";
const CONTACT_EMAIL = "ppibraunschweig@gmail.com";
/** Pre-fills the subject so an enquiry doesn't land in the inbox untitled. */
const JOIN_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Joining Liga Minggu",
)}`;

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      component="div"
      fw={700}
      fz={10}
      c="dimmed"
      mb={10}
      style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
    >
      {children}
    </Text>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <NavLink href={href} c="dimmed" fz={13} underline="hover" fw={500}>
      {children}
    </NavLink>
  );
}

/** `basePath` keeps the Explore links inside the demo when rendered there. */
export async function SiteFooter({ basePath = "" }: { basePath?: string }) {
  // Rendered on the server at request time, so the notice never goes stale.
  const year = new Date().getFullYear();
  // Admin now lives here rather than the top nav (see Navbar.tsx) — same
  // logged-in-vs-not swap the nav used to do, so an already-signed-in admin
  // lands straight on the dashboard instead of a pointless login form.
  const isAdmin = await verifySession();

  return (
    <Box
      component="footer"
      mt={48}
      style={{
        borderTop: "1px solid var(--hairline)",
        background: "var(--deep-panel)",
      }}
    >
      <Container size="lg" py={36}>
        <div className="footer-grid">
          {/* Identity + what this thing is */}
          <Stack gap={10}>
            <Group gap={9} wrap="nowrap" align="center">
              <Box
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, var(--volt), var(--volt-end))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <SoccerBallIcon size={16} weight="fill" color="#0D0F14" />
              </Box>
              <Text className="display-face" fw={800} fz={15} style={{ letterSpacing: "-0.01em" }}>
                Liga Minggu
              </Text>
            </Group>
            <Text c="dimmed" fz={13} style={{ maxWidth: 320, lineHeight: 1.55 }}>
              Weekly futsal for the PPI Braunschweig student community. Teams are shuffled fresh
              every matchday, goals and assists are logged live, and the season standings follow
              from there.
            </Text>
          </Stack>

          {/* The call to action the footer exists for */}
          <Stack gap={10}>
            <FooterHeading>Want to play?</FooterHeading>
            <Text c="dimmed" fz={13} style={{ lineHeight: 1.55 }}>
              New players are welcome. No team, no commitment, just turn up. Email us and
              we&apos;ll add you to the list.
            </Text>
            <Box
              component="a"
              href={JOIN_MAILTO}
              style={{
                alignSelf: "flex-start",
                marginTop: 2,
                border: "1px solid var(--volt)",
                color: "var(--volt)",
                background: "rgba(200,255,47,0.10)",
                borderRadius: 20,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                wordBreak: "break-all",
              }}
            >
              {CONTACT_EMAIL}
            </Box>
          </Stack>

          {/* Everything else on the site */}
          <Stack gap={7}>
            <FooterHeading>Explore</FooterHeading>
            <FooterLink href={basePath || "/"}>Leaderboard</FooterLink>
            <FooterLink href={`${basePath}/sessions`}>Sessions</FooterLink>
            <FooterLink href={`${basePath}/awards`}>Season awards</FooterLink>
            {/* Not prefixed with basePath — there is one changelog for the app,
                and the demo has no changes of its own to list. */}
            <FooterLink href="/changelog">What&apos;s new</FooterLink>
            {basePath === "" && <FooterLink href="/demo">Demo with sample data</FooterLink>}
            {isAdmin ? (
              <>
                <FooterLink href="/admin">Admin</FooterLink>
                <FooterLink href="/admin/analytics">Analytics</FooterLink>
              </>
            ) : (
              <FooterLink href="/login">Admin login</FooterLink>
            )}
          </Stack>
        </div>

        <Group
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={8}
          mt={30}
          pt={18}
          style={{ borderTop: "1px solid var(--hairline)" }}
        >
          <Text c="dimmed" fz={12}>
            © {year} Liga Minggu. Built by Azhar Rahadian.
          </Text>
          <Group gap={16} wrap="nowrap" align="center">
            <Text c="dimmed" fz={12}>
              Stats update once a matchday is marked complete.
            </Text>
            <Box
              component="a"
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              title="View source on GitHub"
              style={{ color: "var(--text-muted)", display: "flex", flexShrink: 0 }}
            >
              <GithubLogo size={18} weight="fill" />
            </Box>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
