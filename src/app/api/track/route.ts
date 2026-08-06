import { cookies } from "next/headers";
import { userAgent } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  newId,
  normalizeRoute,
  rateLimit,
  referrerHost,
  sanitizeName,
  sanitizePath,
  VISIT_COOKIE,
  VISIT_MAX_AGE,
  VISITOR_COOKIE,
  VISITOR_MAX_AGE,
} from "@/lib/analyticsCollect";

/**
 * The analytics collector — the only write path into `analytics_event`.
 *
 * Design notes:
 * - It answers `204 No Content` to *everything*, valid or not. Nothing here is
 *   worth telling a caller about, and a silent endpoint gives a scraper no
 *   feedback loop to probe with.
 * - Nothing it does may break a page. Every failure (bad JSON, rate limit,
 *   database down) ends in the same empty 204; a visitor never sees an error
 *   because a counter didn't increment.
 * - Identity is a pair of HTTP-only first-party cookies minted here, never
 *   read by page JS: `_lpf_vid` (visitor, 1 year) and `_lpf_vis` (visit,
 *   rolling 30 minutes). No IP address and no fingerprint is stored.
 */

// Reads cookies and per-request headers — never cache or prerender it.
export const dynamic = "force-dynamic";

const pageviewSchema = z.object({
  kind: z.literal("pageview"),
  id: z.uuid(),
  path: z.string().max(300),
  referrer: z.string().max(500).optional(),
});

const impressionSchema = z.object({
  kind: z.literal("impression"),
  id: z.uuid(),
  path: z.string().max(300),
  name: z.string().max(60),
  targetId: z.number().int().positive().max(2_147_483_647).optional(),
});

const dwellSchema = z.object({
  kind: z.literal("dwell"),
  id: z.uuid(),
  // Capped at 12h: a laptop that slept with the tab open shouldn't skew the
  // average time-on-page into next week.
  dwellMs: z.number().int().min(0).max(12 * 60 * 60 * 1000),
});

const bodySchema = z.object({
  events: z.array(z.discriminatedUnion("kind", [pageviewSchema, impressionSchema, dwellSchema]))
    .min(1)
    .max(20),
});

const noContent = () => new Response(null, { status: 204 });

/** Country from whatever reverse proxy/CDN sits in front, if any. */
function countryOf(request: NextRequest): string | null {
  const header =
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("x-country-code");
  if (!header || header === "XX") return null;
  return header.slice(0, 2).toUpperCase();
}

export async function POST(request: NextRequest) {
  // Bots are dropped at the door rather than stored and filtered later: a
  // crawler's hits are not traffic, and keeping them means every query has to
  // remember to exclude them.
  const ua = userAgent(request);
  if (ua.isBot) return noContent();

  const cookieStore = await cookies();
  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value ?? newId();
  const visitId = cookieStore.get(VISIT_COOKIE)?.value ?? newId();

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  };
  cookieStore.set(VISITOR_COOKIE, visitorId, { ...cookieOptions, maxAge: VISITOR_MAX_AGE });
  // Re-set on every beacon, so the 30-minute window slides with activity
  // instead of cutting a long session in half.
  cookieStore.set(VISIT_COOKIE, visitId, { ...cookieOptions, maxAge: VISIT_MAX_AGE });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return noContent();
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return noContent();

  const { events } = parsed.data;
  if (!rateLimit(visitorId, events.length)) return noContent();

  const isAdmin = await verifySession();
  const selfHost = request.nextUrl.hostname;
  const shared = {
    visitorId,
    visitId,
    device: ua.device.type ?? "desktop",
    browser: ua.browser.name ?? null,
    os: ua.os.name ?? null,
    country: countryOf(request),
    isAdmin,
  };

  const rows = events.flatMap((event) => {
    if (event.kind === "dwell") return [];
    const path = sanitizePath(event.path);
    return [
      {
        ...shared,
        type: event.kind === "pageview" ? ("pageview" as const) : ("impression" as const),
        path,
        route: normalizeRoute(path),
        name: event.kind === "impression" ? sanitizeName(event.name) : null,
        targetId: event.kind === "impression" ? (event.targetId ?? null) : null,
        referrerHost: event.kind === "pageview" ? referrerHost(event.referrer, selfHost) : null,
        clientEventId: event.id,
      },
    ];
  });

  const dwells = events.filter((event) => event.kind === "dwell");

  try {
    if (rows.length > 0) {
      // `skipDuplicates` leans on the unique index over `client_event_id`: a
      // beacon that gets retried (or fires from a restored bfcache page)
      // collides and is dropped instead of double-counting the view.
      await prisma.analyticsEvent.createMany({ data: rows, skipDuplicates: true });
    }
    for (const dwell of dwells) {
      // Scoped to this visitor so a guessed id can't rewrite someone else's
      // row, and `updateMany` so a dwell whose pageview never landed is a
      // no-op rather than a thrown "record not found".
      await prisma.analyticsEvent.updateMany({
        where: { clientEventId: dwell.id, visitorId, type: "pageview" },
        data: { dwellMs: dwell.dwellMs },
      });
    }
  } catch (error) {
    // Analytics is never allowed to surface as a user-visible failure.
    console.error("[analytics] failed to record events", error);
  }

  return noContent();
}
