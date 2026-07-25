import { connection } from "next/server";
import { Box, Container, Group, Text } from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import { getActiveSeason, getSeasonLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { NavButton, NavLink } from "@/components/NavLink";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Text
      component="div"
      fw={700}
      fz={10}
      c="dimmed"
      style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
    >
      {children}
    </Text>
  );
}

function Panel({
  children,
  span2,
  style,
}: {
  children: React.ReactNode;
  span2?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <Box
      // The two-column span lives in `.admin-grid-span2` (globals.css) rather
      // than inline, so it can be scoped to the breakpoints that actually have
      // two columns.
      className={span2 ? "admin-grid-span2" : undefined}
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 18,
        background: "var(--panel)",
        padding: "20px 22px",
        ...style,
      }}
    >
      {children}
    </Box>
  );
}

function SnapshotStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Box style={{ flex: 1, minWidth: 0 }}>
      <Text className="display-face tabular-nums" fw={900} fz={28} style={{ lineHeight: 1 }}>
        {value}
      </Text>
      <Text fw={700} fz={10} c="dimmed" mt={5} style={{ letterSpacing: "0.1em" }}>
        {label}
      </Text>
    </Box>
  );
}

const QUICK_LINKS = [
  { href: "/admin/players", label: "Players", glyph: "👤" },
  { href: "/admin/sessions", label: "Sessions", glyph: "📅" },
  { href: "/admin/seasons", label: "Seasons", glyph: "🗓" },
  { href: "/awards", label: "Awards", glyph: "🏆" },
];

export default async function AdminPage() {
  await connection();

  await requireAdmin();

  const activeSeason = await getActiveSeason();
  const sessions = activeSeason
    ? await prisma.session.findMany({
      where: { seasonId: activeSeason.id },
      orderBy: { date: "desc" },
      include: { _count: { select: { attendances: true } } },
    })
    : [];
  const resumable = sessions.find((s) => s.status !== "completed") ?? null;
  const completedCount = sessions.filter((s) => s.status === "completed").length;

  const stats = activeSeason ? await getSeasonLeaderboard(activeSeason.id) : [];
  const totalGoals = stats.reduce((sum, s) => sum + s.goals, 0);
  const topScorer = [...stats].sort((a, b) => b.goals - a.goals).find((s) => s.goals > 0) ?? null;

  return (
    <Container size="lg" py={{ base: 20, sm: 32 }} pb={64}>
      {/* Wordmark, season badge and log-out now live in the shared admin bar
          (src/app/admin/layout.tsx), so this page opens straight into content. */}
      <Text
        component="h1"
        className="display-face"
        fw={900}
        fz={{ base: 26, sm: 32 }}
        mb={20}
        style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
      >
        DASHBOARD
      </Text>

      <Box className="admin-grid">
        {/* Resume session — spans two columns where space allows */}
        <Panel span2>
          <Eyebrow>Game day</Eyebrow>
          {resumable ? (
            <>
              <Text className="display-face" fw={800} fz={22} mt={8} style={{ letterSpacing: "-0.01em" }}>
                {resumable.date.toISOString().slice(0, 10)}
              </Text>
              <Text c="dimmed" fz={13} mt={4}>
                {resumable._count.attendances} checked in ·{" "}
                {resumable.status === "teams_set" ? "teams locked" : "teams not locked"}
              </Text>
              <Group gap={10} mt={16}>
                <NavButton href={`/admin/sessions/${resumable.id}`} fw={700}>
                  Resume session
                </NavButton>
                <NavButton href="/admin/sessions" variant="default">
                  New session
                </NavButton>
              </Group>
            </>
          ) : (
            <>
              <Text fw={700} fz={18} mt={8}>
                No open session
              </Text>
              <Text c="dimmed" fz={13} mt={4}>
                Start a new match day when the crew shows up.
              </Text>
              <NavButton href="/admin/sessions" fw={700} mt={16}>
                New session
              </NavButton>
            </>
          )}
        </Panel>

        {/* Season snapshot */}
        <Panel>
          <Eyebrow>Season snapshot</Eyebrow>
          <Group gap="md" mt={14} wrap="nowrap">
            <SnapshotStat label="SESSIONS" value={completedCount} />
            <SnapshotStat label="GOALS" value={totalGoals} />
          </Group>
          <Box mt={16} pt={14} style={{ borderTop: "1px solid var(--hairline)" }}>
            <Eyebrow>Top scorer</Eyebrow>
            {topScorer ? (
              <Text fw={700} fz={15} mt={4}>
                {topScorer.name}
                <Text span c="dimmed" fw={600} className="tabular-nums">
                  {" "}
                  · {topScorer.goals}
                </Text>
              </Text>
            ) : (
              <Text c="dimmed" fz={13} mt={4}>
                No goals yet
              </Text>
            )}
          </Box>
        </Panel>

        {/* Quick links */}
        {QUICK_LINKS.map((link) => (
          <NavLink key={link.href} href={link.href} underline="never" c="inherit">
            <Panel
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                minHeight: 76,
              }}
            >
              <Text fz={22} component="span">
                {link.glyph}
              </Text>
              <Text fw={700} fz={15}>
                {link.label}
              </Text>
            </Panel>
          </NavLink>
        ))}
      </Box>
    </Container>
  );
}
