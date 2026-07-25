import { Box, Button, Container, Group } from "@mantine/core";
import { getActiveSeason } from "@/lib/leaderboard";
import { NavLink } from "@/components/NavLink";
import { logout } from "./actions";

/**
 * Every admin screen is per-request: it reads the session cookie and live
 * database rows, and none of it can be meaningfully prerendered. Declaring that
 * here covers the whole segment.
 *
 * This is load-bearing for the Docker build, not just an optimisation. The bar
 * below queries the active season, and a layout that touches the database
 * without opting out gets prerendered during `next build` — where no database
 * exists — failing the image build with `P1001 Can't reach database server`.
 */
export const dynamic = "force-dynamic";

/**
 * Chrome shared by every admin screen. Before this, the only way back to the
 * public site was editing `/admin` out of the URL by hand — the dashboard had
 * a bar but the inner pages had nothing but a breadcrumb.
 *
 * The live match console covers this bar completely (`.lc-root` is
 * `position: fixed; inset: 0; z-index: 200`), which is intended — that screen
 * is full-bleed for the iPad and carries its own Exit button.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const activeSeason = await getActiveSeason();

  return (
    <>
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
        <Container size="lg" py={10}>
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Group gap={10} align="center" wrap="nowrap">
              <NavLink href="/admin" underline="never" c="inherit">
                <Group gap={9} wrap="nowrap" component="span" align="center">
                  <Box
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9,
                      background: "linear-gradient(135deg, var(--volt), var(--volt-end))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    ⚽
                  </Box>
                  <span
                    className="display-face"
                    style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.01em" }}
                  >
                    Matchday HQ
                  </span>
                </Group>
              </NavLink>
              {activeSeason && (
                <Box
                  component="span"
                  visibleFrom="sm"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--volt)",
                    background: "rgba(200,255,47,.12)",
                    borderRadius: 20,
                    padding: "3px 10px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activeSeason.name}
                </Box>
              )}
            </Group>

            <Group gap={4} wrap="nowrap" align="center">
              <AdminNavItem href="/admin/sessions">Sessions</AdminNavItem>
              <AdminNavItem href="/admin/players">Players</AdminNavItem>
              <AdminNavItem href="/admin/seasons">Seasons</AdminNavItem>
              {/* The way home — this is what was missing. */}
              <NavLink
                href="/"
                underline="never"
                fw={700}
                fz={13}
                px={12}
                py={6}
                style={{
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                  color: "var(--volt)",
                  border: "1px solid var(--volt)",
                  backgroundColor: "rgba(200,255,47,0.10)",
                }}
              >
                View site ↗
              </NavLink>
              <form action={logout}>
                <Button type="submit" variant="subtle" color="gray" size="xs">
                  Log out
                </Button>
              </form>
            </Group>
          </Group>
        </Container>
      </Box>
      {children}
    </>
  );
}

function AdminNavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <NavLink
      href={href}
      underline="never"
      c="dimmed"
      fw={600}
      fz={13}
      px={10}
      py={6}
      visibleFrom="xs"
      style={{
        borderRadius: 10,
        whiteSpace: "nowrap",
        transition: "color 0.15s ease, background-color 0.15s ease",
      }}
    >
      {children}
    </NavLink>
  );
}
