import { prisma } from "@/lib/prisma";
import { IMPRESSION_PLAYER_ROW } from "@/lib/analyticsMarks";

/**
 * Read side of the analytics: every figure on /admin/analytics is derived here
 * from the raw `analytics_event` log, nothing is precomputed or cached.
 *
 * Two conventions hold across every query in this file:
 * - `is_admin = false` everywhere. The admin's own browsing is recorded (it
 *   still tells you the site is up) but never counted, or every number would
 *   mostly measure its owner clicking around.
 * - Aggregates are cast to `int`/`float8` in SQL rather than converted in TS.
 *   Postgres hands `count(*)` back as a BigInt and `avg()` as a Decimal, both
 *   of which are unserializable across the Server Component boundary; casting
 *   at the source is one word instead of a mapping pass per query.
 */

/** Day and hour buckets are cut in the club's local time, not UTC. */
const TZ = process.env.ANALYTICS_TZ ?? "Asia/Jakarta";

export const RANGE_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export const DEFAULT_RANGE_DAYS = 30;

export function parseRangeDays(value: string | undefined): number {
  const parsed = Number(value);
  return RANGE_OPTIONS.some((option) => option.days === parsed) ? parsed : DEFAULT_RANGE_DAYS;
}

/**
 * The window shown, plus the window immediately before it of the same length —
 * that second one is what every "+18% vs previous 30 days" delta compares to.
 */
export function rangeBounds(days: number, now = new Date()) {
  const spanMs = days * 24 * 60 * 60 * 1000;
  const end = now;
  const start = new Date(end.getTime() - spanMs);
  const prevStart = new Date(start.getTime() - spanMs);
  return { start, end, prevStart, prevEnd: start };
}

export type Totals = {
  views: number;
  visitors: number;
  visits: number;
  impressions: number;
  /** Average time a page stayed visible, in seconds; null when nothing reported. */
  avgDwellSec: number | null;
};

type TotalsRow = {
  views: number;
  visitors: number;
  visits: number;
  impressions: number;
  avg_dwell_ms: number | null;
};

async function totalsBetween(start: Date, end: Date): Promise<Totals> {
  const [row] = await prisma.$queryRaw<TotalsRow[]>`
    SELECT
      (count(*) FILTER (WHERE type = 'pageview'))::int   AS views,
      count(DISTINCT visitor_id)::int                    AS visitors,
      count(DISTINCT visit_id)::int                      AS visits,
      (count(*) FILTER (WHERE type = 'impression'))::int AS impressions,
      (avg(dwell_ms) FILTER (WHERE type = 'pageview'))::float8 AS avg_dwell_ms
    FROM analytics_event
    WHERE is_admin = false AND created_at >= ${start} AND created_at < ${end}
  `;

  return {
    views: row?.views ?? 0,
    visitors: row?.visitors ?? 0,
    visits: row?.visits ?? 0,
    impressions: row?.impressions ?? 0,
    avgDwellSec: row?.avg_dwell_ms == null ? null : row.avg_dwell_ms / 1000,
  };
}

export type DailyPoint = { day: string; views: number; visitors: number };

/**
 * One point per calendar day in the range, including the days nobody visited —
 * a chart that silently skips empty days lies about the shape of the traffic.
 */
export async function getDailySeries(start: Date, end: Date): Promise<DailyPoint[]> {
  const rows = await prisma.$queryRaw<{ day: string; views: number; visitors: number }[]>`
    SELECT
      to_char((created_at AT TIME ZONE ${TZ})::date, 'YYYY-MM-DD') AS day,
      (count(*) FILTER (WHERE type = 'pageview'))::int AS views,
      count(DISTINCT visitor_id)::int                  AS visitors
    FROM analytics_event
    WHERE is_admin = false AND created_at >= ${start} AND created_at < ${end}
    GROUP BY 1
    ORDER BY 1
  `;

  const byDay = new Map(rows.map((row) => [row.day, row]));
  const points: DailyPoint[] = [];
  // Walk the range in the display timezone so the labels line up with the
  // buckets Postgres cut above.
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
  for (let cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const day = formatter.format(cursor);
    const row = byDay.get(day);
    points.push({ day, views: row?.views ?? 0, visitors: row?.visitors ?? 0 });
  }
  return points;
}

export type RouteRow = {
  route: string;
  views: number;
  visitors: number;
  avgDwellSec: number | null;
};

export async function getTopRoutes(start: Date, end: Date, limit = 10): Promise<RouteRow[]> {
  const rows = await prisma.$queryRaw<
    { route: string; views: number; visitors: number; avg_dwell_ms: number | null }[]
  >`
    SELECT
      route,
      count(*)::int                   AS views,
      count(DISTINCT visitor_id)::int AS visitors,
      avg(dwell_ms)::float8           AS avg_dwell_ms
    FROM analytics_event
    WHERE is_admin = false AND type = 'pageview'
      AND created_at >= ${start} AND created_at < ${end}
    GROUP BY route
    ORDER BY views DESC, route ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    route: row.route,
    views: row.views,
    visitors: row.visitors,
    avgDwellSec: row.avg_dwell_ms == null ? null : row.avg_dwell_ms / 1000,
  }));
}

export type BreakdownRow = { label: string; count: number };

export async function getReferrers(start: Date, end: Date, limit = 8): Promise<BreakdownRow[]> {
  return prisma.$queryRaw<BreakdownRow[]>`
    SELECT referrer_host AS label, count(*)::int AS count
    FROM analytics_event
    WHERE is_admin = false AND referrer_host IS NOT NULL
      AND created_at >= ${start} AND created_at < ${end}
    GROUP BY referrer_host
    ORDER BY count DESC, label ASC
    LIMIT ${limit}
  `;
}

/**
 * Device / browser / OS splits, over *visitors* rather than events: one person
 * who reads twenty pages on a phone is one phone, not twenty.
 */
export async function getDeviceSplit(start: Date, end: Date): Promise<BreakdownRow[]> {
  return prisma.$queryRaw<BreakdownRow[]>`
    SELECT coalesce(device, 'unknown') AS label, count(DISTINCT visitor_id)::int AS count
    FROM analytics_event
    WHERE is_admin = false AND created_at >= ${start} AND created_at < ${end}
    GROUP BY 1
    ORDER BY count DESC, label ASC
  `;
}

export async function getBrowserSplit(start: Date, end: Date, limit = 6): Promise<BreakdownRow[]> {
  return prisma.$queryRaw<BreakdownRow[]>`
    SELECT coalesce(browser, 'unknown') AS label, count(DISTINCT visitor_id)::int AS count
    FROM analytics_event
    WHERE is_admin = false AND created_at >= ${start} AND created_at < ${end}
    GROUP BY 1
    ORDER BY count DESC, label ASC
    LIMIT ${limit}
  `;
}

export type HourPoint = { hour: number; views: number };

/** Views by hour of the local day — shows when the club actually looks. */
export async function getHourOfDay(start: Date, end: Date): Promise<HourPoint[]> {
  const rows = await prisma.$queryRaw<{ hour: number; views: number }[]>`
    SELECT
      extract(hour FROM (created_at AT TIME ZONE ${TZ}))::int AS hour,
      count(*)::int AS views
    FROM analytics_event
    WHERE is_admin = false AND type = 'pageview'
      AND created_at >= ${start} AND created_at < ${end}
    GROUP BY 1
  `;

  const byHour = new Map(rows.map((row) => [row.hour, row.views]));
  return Array.from({ length: 24 }, (_, hour) => ({ hour, views: byHour.get(hour) ?? 0 }));
}

export type PlayerInterestRow = {
  playerId: number;
  name: string;
  impressions: number;
  profileViews: number;
};

/**
 * Who the visitors are actually looking at: how often each player's row was on
 * screen (impressions), and how often someone opened their profile. The ratio
 * between the two is the interesting part — a player everybody scrolls past
 * versus one people click into.
 *
 * Profile views come from the recorded path rather than a target id, because a
 * page view knows its URL and nothing else; `/players/12` and its `/demo`
 * twin both resolve to player 12.
 */
export async function getPlayerInterest(
  start: Date,
  end: Date,
  limit = 8,
): Promise<PlayerInterestRow[]> {
  const rows = await prisma.$queryRaw<
    { player_id: number; impressions: number; profile_views: number }[]
  >`
    WITH scoped AS (
      SELECT type, name, target_id, path
      FROM analytics_event
      WHERE is_admin = false AND created_at >= ${start} AND created_at < ${end}
    ),
    interest AS (
      SELECT target_id AS player_id, 1 AS impression, 0 AS profile_view
      FROM scoped
      WHERE type = 'impression' AND name = ${IMPRESSION_PLAYER_ROW} AND target_id IS NOT NULL
      UNION ALL
      SELECT (substring(path FROM '^/(?:demo/)?players/([0-9]+)$'))::int, 0, 1
      FROM scoped
      WHERE type = 'pageview' AND path ~ '^/(?:demo/)?players/[0-9]+$'
    )
    SELECT
      player_id,
      sum(impression)::int   AS impressions,
      sum(profile_view)::int AS profile_views
    FROM interest
    WHERE player_id IS NOT NULL
    GROUP BY player_id
    ORDER BY impressions DESC, profile_views DESC
    LIMIT ${limit}
  `;

  if (rows.length === 0) return [];

  const players = await prisma.player.findMany({
    where: { id: { in: rows.map((row) => row.player_id) } },
    select: { id: true, name: true },
  });
  const names = new Map(players.map((player) => [player.id, player.name]));

  return rows.map((row) => ({
    playerId: row.player_id,
    name: names.get(row.player_id) ?? `Player #${row.player_id}`,
    impressions: row.impressions,
    profileViews: row.profile_views,
  }));
}

/** Visitors seen in the last five minutes — the "is anyone here now" number. */
export async function getLiveVisitors(now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 5 * 60 * 1000);
  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    SELECT count(DISTINCT visitor_id)::int AS count
    FROM analytics_event
    WHERE is_admin = false AND created_at >= ${since}
  `;
  return row?.count ?? 0;
}

export type AnalyticsSnapshot = {
  days: number;
  totals: Totals;
  previous: Totals;
  daily: DailyPoint[];
  routes: RouteRow[];
  referrers: BreakdownRow[];
  devices: BreakdownRow[];
  browsers: BreakdownRow[];
  hours: HourPoint[];
  players: PlayerInterestRow[];
  liveVisitors: number;
  /** Total rows ever collected — tells you whether "0 views" means "no data yet". */
  lifetimeEvents: number;
};

/** Everything the dashboard needs, in one pass. */
export async function getAnalyticsSnapshot(days: number): Promise<AnalyticsSnapshot> {
  const { start, end, prevStart, prevEnd } = rangeBounds(days);

  const [
    totals,
    previous,
    daily,
    routes,
    referrers,
    devices,
    browsers,
    hours,
    players,
    liveVisitors,
    lifetimeEvents,
  ] = await Promise.all([
    totalsBetween(start, end),
    totalsBetween(prevStart, prevEnd),
    getDailySeries(start, end),
    getTopRoutes(start, end),
    getReferrers(start, end),
    getDeviceSplit(start, end),
    getBrowserSplit(start, end),
    getHourOfDay(start, end),
    getPlayerInterest(start, end),
    getLiveVisitors(),
    prisma.analyticsEvent.count(),
  ]);

  return {
    days,
    totals,
    previous,
    daily,
    routes,
    referrers,
    devices,
    browsers,
    hours,
    players,
    liveVisitors,
    lifetimeEvents,
  };
}

/** Percentage change against the previous period; null when there's no base. */
export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "—";
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded}s`;
  return `${Math.floor(rounded / 60)}m ${String(rounded % 60).padStart(2, "0")}s`;
}
