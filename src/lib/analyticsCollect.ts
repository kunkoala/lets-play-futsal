import { randomUUID } from "crypto";

// Pieces of the analytics collector that are pure, cheap, and worth testing on
// their own — the route handler in src/app/api/track/route.ts does the I/O.

/** Visitor cookie: random UUID, 1 year, HTTP-only. Not readable by page JS. */
export const VISITOR_COOKIE = "_lpf_vid";
/** Visit cookie: random UUID, rolling 30-minute expiry (see VISIT_MAX_AGE). */
export const VISIT_COOKIE = "_lpf_vis";

export const VISITOR_MAX_AGE = 365 * 24 * 60 * 60;
/** 30 minutes of inactivity ends a visit — the industry-standard definition. */
export const VISIT_MAX_AGE = 30 * 60;

/** Hard caps, so a hostile client can't write novels into the table. */
const MAX_PATH = 300;
const MAX_NAME = 60;
const MAX_HOST = 120;

/**
 * Collapses a concrete path into the route pattern the dashboard groups by:
 * `/players/12` and `/players/3` both become `/players/[id]`, so one popular
 * page reads as one row instead of one row per player.
 *
 * Done here rather than passed from the client because the browser has no
 * reliable handle on the matched route, and because anything the client sends
 * is untrusted anyway.
 */
export function normalizeRoute(path: string): string {
  const withoutQuery = path.split("?")[0].split("#")[0];
  const trimmed = withoutQuery.replace(/\/+$/, "") || "/";
  return trimmed.replace(/\/\d+(?=\/|$)/g, "/[id]").slice(0, MAX_PATH);
}

/** Keeps only same-shape, sane paths; anything else is recorded as `/`. */
export function sanitizePath(path: string): string {
  if (!path.startsWith("/")) return "/";
  return path.split("#")[0].slice(0, MAX_PATH);
}

export function sanitizeName(name: string | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim().slice(0, MAX_NAME);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Referrer reduced to its host — `https://news.site/some/private/thread` is
 * stored as `news.site`. Self-referrals (in-site navigation) return null so
 * they don't drown out real traffic sources.
 */
export function referrerHost(referrer: string | undefined, selfHost: string): string | null {
  if (!referrer) return null;
  let host: string;
  try {
    host = new URL(referrer).hostname;
  } catch {
    return null;
  }
  if (!host || host === selfHost) return null;
  return host.replace(/^www\./, "").slice(0, MAX_HOST);
}

/**
 * A per-visitor token bucket, in process memory. This app runs as a single
 * container, so there is no shared-state problem to solve here; the point is
 * only to stop one tab (buggy loop, or someone with curl) from writing
 * thousands of rows. Entries are dropped as they age out, so the map stays
 * proportional to *active* visitors rather than growing forever.
 */
const WINDOW_MS = 60_000;
const MAX_EVENTS_PER_WINDOW = 120;
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(visitorId: string, cost: number, now = Date.now()): boolean {
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }

  const existing = hits.get(visitorId);
  if (!existing || existing.resetAt <= now) {
    hits.set(visitorId, { count: cost, resetAt: now + WINDOW_MS });
    return cost <= MAX_EVENTS_PER_WINDOW;
  }

  existing.count += cost;
  return existing.count <= MAX_EVENTS_PER_WINDOW;
}

/** Exposed for tests — the limiter is module-level state otherwise. */
export function resetRateLimit(): void {
  hits.clear();
}

export function newId(): string {
  return randomUUID();
}
