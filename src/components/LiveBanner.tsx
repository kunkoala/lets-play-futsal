import { Box, Container, Group, Text } from "@mantine/core";
import { getLiveMatches } from "@/lib/liveMatches";
import { computeScore } from "@/lib/matchScore";
import { NavLink } from "@/components/NavLink";

/**
 * Sits above every public page (same spot as DemoBanner) whenever a match is
 * in progress right now, so someone browsing the leaderboard or an old
 * session notices there's something to watch. Renders nothing otherwise —
 * this page is already `force-dynamic` (see (public)/layout.tsx), so it's
 * never stale by more than a request.
 */
export async function LiveBanner() {
  const matches = await getLiveMatches();
  if (matches.length === 0) return null;

  // Most nights this is exactly one match; if two sessions somehow have one
  // live at once, name the first and let the ticker page show the rest.
  const first = matches[0];
  const score = computeScore(first.goalEvents, first.homeTeamId, first.awayTeamId);

  return (
    <Box
      style={{
        background: "linear-gradient(135deg, var(--volt), var(--volt-end))",
        color: "#0D0F14",
        // First element in the page (same as DemoBanner) — behind the
        // Dynamic Island in a standalone PWA before any scrolling happens.
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <Container size="lg" py={8}>
        <NavLink href="/live" underline="never" style={{ color: "inherit" }}>
          <Group gap={9} wrap="wrap" align="center">
            <Box
              aria-hidden
              className="lc-pulse"
              style={{ width: 7, height: 7, borderRadius: 999, background: "var(--loss-red)" }}
            />
            <Text fz={11} fw={900} style={{ color: "var(--loss-red)", letterSpacing: "0.1em" }}>
              LIVE
            </Text>
            <Text fz={13} fw={700}>
              {first.homeTeam.name}{" "}
              <Text span className="tabular-nums" fw={900}>
                {score.home}–{score.away}
              </Text>{" "}
              {first.awayTeam.name}
            </Text>
            {matches.length > 1 && (
              <Text fz={12} fw={600} style={{ opacity: 0.75 }}>
                +{matches.length - 1} more
              </Text>
            )}
            <Text fz={12} fw={800} style={{ marginLeft: "auto", opacity: 0.85 }}>
              See live ticker →
            </Text>
          </Group>
        </NavLink>
      </Container>
    </Box>
  );
}
