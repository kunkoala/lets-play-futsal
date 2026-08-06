import { connection } from "next/server";
import {
  Box,
  Container,
  Group,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { requireAdmin } from "@/lib/auth";
import {
  formatDuration,
  getAnalyticsSnapshot,
  parseRangeDays,
  percentDelta,
  RANGE_OPTIONS,
  type BreakdownRow,
  type HourPoint,
} from "@/lib/analytics";
import { NavLink } from "@/components/NavLink";
import { TrafficChart } from "./TrafficChart";

/**
 * The analytics dashboard. Gated twice over, like every admin screen: proxy.ts
 * blocks unauthenticated navigation to /admin/*, and `requireAdmin()` below
 * re-checks the session on the render itself.
 *
 * Everything shown is derived from `analytics_event` at request time (see
 * src/lib/analytics.ts) — no rollup tables, no cached counters, so a metric
 * that didn't exist yesterday can still be asked of yesterday's traffic.
 */

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

function Panel({ children, ...rest }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 18,
        background: "var(--panel)",
        padding: "18px 20px",
        ...rest.style,
      }}
    >
      {children}
    </Box>
  );
}

/**
 * A headline number with its change against the previous period of the same
 * length. The delta is the point: "412 views" means nothing on its own.
 */
function Kpi({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string | number;
  delta?: number | null;
  hint?: string;
}) {
  const direction = delta == null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return (
    <Panel style={{ flex: "1 1 150px", minWidth: 0 }}>
      <Eyebrow>{label}</Eyebrow>
      <Text className="display-face tabular-nums" fw={900} fz={28} mt={6} style={{ lineHeight: 1 }}>
        {value}
      </Text>
      <Group gap={6} mt={6} wrap="nowrap">
        {direction && (
          <Text
            fz={11}
            fw={700}
            className="tabular-nums"
            style={{
              color:
                direction === "up"
                  ? "var(--volt)"
                  : direction === "down"
                    ? "var(--loss-red)"
                    : "var(--text-muted)",
            }}
          >
            {direction === "up" ? "▲" : direction === "down" ? "▼" : "—"}{" "}
            {Math.abs(Math.round(delta ?? 0))}%
          </Text>
        )}
        {hint && (
          <Text fz={11} c="dimmed">
            {hint}
          </Text>
        )}
      </Group>
    </Panel>
  );
}

/** Horizontal magnitude bars — the right form for a short ranked list. */
function BarList({ rows, empty }: { rows: BreakdownRow[]; empty: string }) {
  if (rows.length === 0) {
    return (
      <Text c="dimmed" fz={13} mt={10}>
        {empty}
      </Text>
    );
  }
  const max = Math.max(...rows.map((row) => row.count));
  return (
    <Stack gap={8} mt={12}>
      {rows.map((row) => (
        <Box key={row.label}>
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Text fz={13} fw={600} truncate>
              {row.label}
            </Text>
            <Text fz={13} fw={700} className="tabular-nums" c="dimmed">
              {row.count}
            </Text>
          </Group>
          <Box
            mt={4}
            style={{
              height: 6,
              borderRadius: 4,
              background: "rgba(255,255,255,.05)",
              overflow: "hidden",
            }}
          >
            <Box
              style={{
                width: `${Math.max(3, (row.count / max) * 100)}%`,
                height: "100%",
                borderRadius: 4,
                background: "var(--volt)",
              }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

/** When the club actually looks at the site, by local hour. */
function HourBars({ hours }: { hours: HourPoint[] }) {
  const max = Math.max(1, ...hours.map((h) => h.views));
  return (
    <Box mt={14}>
      <Group gap={3} align="flex-end" wrap="nowrap" style={{ height: 92 }}>
        {hours.map((hour) => (
          <Box
            key={hour.hour}
            title={`${String(hour.hour).padStart(2, "0")}:00 — ${hour.views} views`}
            style={{
              flex: 1,
              // 4px rounded data-end, anchored to the baseline.
              height: `${Math.max(2, (hour.views / max) * 100)}%`,
              borderRadius: "4px 4px 0 0",
              background: hour.views > 0 ? "var(--volt)" : "rgba(255,255,255,.07)",
              opacity: hour.views > 0 ? 0.4 + 0.6 * (hour.views / max) : 1,
            }}
          />
        ))}
      </Group>
      <Group justify="space-between" mt={6}>
        {["00", "06", "12", "18", "23"].map((label) => (
          <Text key={label} fz={9} c="dimmed" className="tabular-nums">
            {label}
          </Text>
        ))}
      </Group>
    </Box>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <TableTh style={{ textAlign: align }}>
      <Text fz={10} fw={700} c="dimmed" style={{ letterSpacing: "0.1em" }}>
        {children}
      </Text>
    </TableTh>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await connection();
  await requireAdmin(); // convention: see requireAdmin()'s doc comment in src/lib/auth.ts

  const { days: daysParam } = await searchParams;
  const days = parseRangeDays(daysParam);
  const snapshot = await getAnalyticsSnapshot(days);
  const { totals, previous } = snapshot;

  const viewsPerVisit = totals.visits === 0 ? 0 : totals.views / totals.visits;
  const prevViewsPerVisit = previous.visits === 0 ? 0 : previous.views / previous.visits;

  return (
    <Container size="lg" py={{ base: 20, sm: 32 }} pb={64}>
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm" mb={18}>
        <Box>
          <Text
            component="h1"
            className="display-face"
            fw={900}
            fz={{ base: 26, sm: 32 }}
            style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
          >
            ANALYTICS
          </Text>
          <Group gap={8} mt={8} align="center">
            <Box
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: snapshot.liveVisitors > 0 ? "var(--volt)" : "var(--text-muted)",
              }}
            />
            <Text fz={12} c="dimmed">
              {snapshot.liveVisitors} on site in the last 5 minutes
            </Text>
          </Group>
        </Box>

        {/* Range filter: one row, above the charts. */}
        <Group gap={6}>
          {RANGE_OPTIONS.map((option) => (
            <NavLink
              key={option.days}
              href={`/admin/analytics?days=${option.days}`}
              underline="never"
              fw={700}
              fz={12}
              px={12}
              py={6}
              style={{
                borderRadius: 20,
                whiteSpace: "nowrap",
                color: option.days === days ? "#0D0F14" : "var(--text-muted)",
                background: option.days === days ? "var(--volt)" : "transparent",
                border: `1px solid ${option.days === days ? "var(--volt)" : "var(--hairline)"}`,
              }}
            >
              {option.label}
            </NavLink>
          ))}
        </Group>
      </Group>

      {snapshot.lifetimeEvents === 0 ? (
        <Panel>
          <Eyebrow>No data yet</Eyebrow>
          <Text fz={14} mt={8}>
            Nothing has been recorded. Open the public site in another browser (or a private
            window) — your own admin session is excluded from every figure here, and so are
            /admin and /login themselves.
          </Text>
        </Panel>
      ) : (
        <Stack gap={16}>
          <Group gap={16} align="stretch" wrap="wrap">
            <Kpi
              label="Page views"
              value={totals.views}
              delta={percentDelta(totals.views, previous.views)}
              hint={`vs prev ${days}d`}
            />
            <Kpi
              label="Visitors"
              value={totals.visitors}
              delta={percentDelta(totals.visitors, previous.visitors)}
            />
            <Kpi
              label="Visits"
              value={totals.visits}
              delta={percentDelta(totals.visits, previous.visits)}
              hint="30-min window"
            />
            <Kpi
              label="Views / visit"
              value={viewsPerVisit.toFixed(1)}
              delta={percentDelta(viewsPerVisit, prevViewsPerVisit)}
            />
            <Kpi
              label="Avg on page"
              value={formatDuration(totals.avgDwellSec)}
              delta={percentDelta(totals.avgDwellSec ?? 0, previous.avgDwellSec ?? 0)}
            />
            <Kpi
              label="Impressions"
              value={totals.impressions}
              delta={percentDelta(totals.impressions, previous.impressions)}
              hint="rows seen"
            />
          </Group>

          <Panel>
            <Eyebrow>Page views per day</Eyebrow>
            <TrafficChart points={snapshot.daily} />
          </Panel>

          <Box className="admin-grid">
            <Panel>
              <Eyebrow>Top pages</Eyebrow>
              <Table verticalSpacing={6} mt={6}>
                <TableThead>
                  <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <Th>Route</Th>
                    <Th align="right">Views</Th>
                    <Th align="right">Visitors</Th>
                    <Th align="right">Avg time</Th>
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {snapshot.routes.map((route) => (
                    <TableTr key={route.route}>
                      <TableTd>
                        <Text fz={13} fw={600} truncate>
                          {route.route}
                        </Text>
                      </TableTd>
                      <TableTd style={{ textAlign: "right" }}>
                        <Text fz={13} fw={700} className="tabular-nums">
                          {route.views}
                        </Text>
                      </TableTd>
                      <TableTd style={{ textAlign: "right" }}>
                        <Text fz={13} c="dimmed" className="tabular-nums">
                          {route.visitors}
                        </Text>
                      </TableTd>
                      <TableTd style={{ textAlign: "right" }}>
                        <Text fz={13} c="dimmed" className="tabular-nums">
                          {formatDuration(route.avgDwellSec)}
                        </Text>
                      </TableTd>
                    </TableTr>
                  ))}
                  {snapshot.routes.length === 0 && (
                    <TableTr>
                      <TableTd colSpan={4}>
                        <Text c="dimmed" fz={13} py="sm">
                          No page views in this range.
                        </Text>
                      </TableTd>
                    </TableTr>
                  )}
                </TableTbody>
              </Table>
            </Panel>

            <Panel>
              <Eyebrow>Traffic sources</Eyebrow>
              <BarList
                rows={snapshot.referrers}
                empty="Everyone arrived directly — no external referrers yet."
              />
            </Panel>

            <Panel>
              <Eyebrow>Devices</Eyebrow>
              <BarList rows={snapshot.devices} empty="No visitors in this range." />
              <Box mt={16} pt={14} style={{ borderTop: "1px solid var(--hairline)" }}>
                <Eyebrow>Browsers</Eyebrow>
                <BarList rows={snapshot.browsers} empty="No visitors in this range." />
              </Box>
            </Panel>

            <Panel>
              <Eyebrow>When people look (local time)</Eyebrow>
              <HourBars hours={snapshot.hours} />
            </Panel>

            <Panel style={{ gridColumn: "1 / -1" }}>
              <Eyebrow>Most-looked-at players</Eyebrow>
              <Text fz={12} c="dimmed" mt={4}>
                Times a player&apos;s leaderboard row was actually on screen, against how often
                someone opened their profile.
              </Text>
              <Table verticalSpacing={6} mt={10}>
                <TableThead>
                  <TableTr style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <Th>Player</Th>
                    <Th align="right">Row seen</Th>
                    <Th align="right">Profile opened</Th>
                    <Th align="right">Open rate</Th>
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {snapshot.players.map((player) => (
                    <TableTr key={player.playerId}>
                      <TableTd>
                        <Text fz={13} fw={600}>
                          {player.name}
                        </Text>
                      </TableTd>
                      <TableTd style={{ textAlign: "right" }}>
                        <Text fz={13} fw={700} className="tabular-nums">
                          {player.impressions}
                        </Text>
                      </TableTd>
                      <TableTd style={{ textAlign: "right" }}>
                        <Text fz={13} className="tabular-nums" c="dimmed">
                          {player.profileViews}
                        </Text>
                      </TableTd>
                      <TableTd style={{ textAlign: "right" }}>
                        <Text fz={13} className="tabular-nums" c="dimmed">
                          {player.impressions === 0
                            ? "—"
                            : `${Math.round((player.profileViews / player.impressions) * 100)}%`}
                        </Text>
                      </TableTd>
                    </TableTr>
                  ))}
                  {snapshot.players.length === 0 && (
                    <TableTr>
                      <TableTd colSpan={4}>
                        <Text c="dimmed" fz={13} py="sm">
                          No player rows seen in this range yet.
                        </Text>
                      </TableTd>
                    </TableTr>
                  )}
                </TableTbody>
              </Table>
            </Panel>
          </Box>

          <Text fz={11} c="dimmed">
            First-party and self-hosted: no third-party scripts, no IP addresses, no
            fingerprinting. Visitors are a random id in an HTTP-only cookie; known bots, Do Not
            Track browsers and admin sessions are all left out of these figures.{" "}
            {snapshot.lifetimeEvents.toLocaleString()} events recorded all-time.
          </Text>
        </Stack>
      )}
    </Container>
  );
}
