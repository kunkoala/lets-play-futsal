import { Box, Container, Group, Stack, Text } from "@mantine/core";
import { NavLink } from "@/components/NavLink";
import { SoccerBallIcon } from "@/components/icons";

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
export function SiteFooter({ basePath = "" }: { basePath?: string }) {
  // Rendered on the server at request time, so the notice never goes stale.
  const year = new Date().getFullYear();

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
              New players are welcome — no team, no commitment, just turn up. Email us and
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
            {basePath === "" && <FooterLink href="/demo">Demo with sample data</FooterLink>}
            <FooterLink href="/login">Admin login</FooterLink>
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
          <Text c="dimmed" fz={12}>
            Stats update once a matchday is marked complete.
          </Text>
        </Group>
      </Container>
    </Box>
  );
}
