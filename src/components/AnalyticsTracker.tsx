"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The whole client half of the analytics: one component, mounted once in the
 * root layout, that reports page views, how long each was actually looked at,
 * and which marked elements were seen.
 *
 * Why client-side rather than counting renders on the server: a server count
 * measures requests, which includes Next's route prefetches and says nothing
 * about whether a human ever saw the page. This fires on real navigations only.
 *
 * Nothing identifying is sent — the payload is a path, a random per-event UUID
 * and, for impressions, what was seen. Identity lives entirely in the
 * HTTP-only cookies the collector sets (see src/app/api/track/route.ts).
 */

const ENDPOINT = "/api/track";
/** Routes worth no analytics: the admin tool itself and the login screen. */
const IGNORED_PREFIXES = ["/admin", "/login"];
/** Batch window — beacons are cheap, but one per scrolled row is silly. */
const FLUSH_DELAY_MS = 1500;
const MAX_BATCH = 10;
/** How long a target must stay half-visible before it counts as seen. */
const IMPRESSION_DWELL_MS = 500;

type QueuedEvent =
  | { kind: "pageview"; id: string; path: string; referrer?: string }
  | { kind: "impression"; id: string; path: string; name: string; targetId?: number }
  | { kind: "dwell"; id: string; dwellMs: number };

function isTracked(pathname: string): boolean {
  return !IGNORED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Respects the browser's Do Not Track signal. Costs one line and means the
 * people who asked not to be counted aren't.
 */
function trackingAllowed(): boolean {
  if (typeof navigator === "undefined") return false;
  const dnt =
    navigator.doNotTrack ??
    (window as { doNotTrack?: string }).doNotTrack ??
    (navigator as { msDoNotTrack?: string }).msDoNotTrack;
  return dnt !== "1" && dnt !== "yes";
}

export function AnalyticsTracker() {
  const pathname = usePathname();

  const queue = useRef<QueuedEvent[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The pageview the current dwell timer belongs to. */
  const viewId = useRef<string | null>(null);
  /** Which path `viewId` was minted for — see the StrictMode note below. */
  const trackedPath = useRef<string | null>(null);
  /** Milliseconds this pageview has been visible, excluding hidden stretches. */
  const visibleMs = useRef(0);
  const visibleSince = useRef<number | null>(null);
  /** `name:targetId` seen already on this pageview — impressions count once. */
  const seen = useRef(new Set<string>());

  // One ref-based effect body rather than several effects: page view, dwell
  // and impressions all key off the same navigation boundary, and splitting
  // them across effects makes the ordering (flush old dwell, then open the new
  // view) depend on effect declaration order.
  useEffect(() => {
    if (!trackingAllowed() || !isTracked(pathname)) return;

    const send = (events: QueuedEvent[]) => {
      if (events.length === 0) return;
      const body = JSON.stringify({ events });
      // `sendBeacon` is the only transport that reliably survives the page
      // being closed, which is exactly when the dwell number is ready.
      if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) {
        return;
      }
      void fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        // A dropped beacon is a lost count, nothing more.
      });
    };

    const flush = () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      const pending = queue.current;
      queue.current = [];
      send(pending);
    };

    const enqueue = (event: QueuedEvent) => {
      queue.current.push(event);
      if (queue.current.length >= MAX_BATCH) {
        flush();
        return;
      }
      flushTimer.current ??= setTimeout(flush, FLUSH_DELAY_MS);
    };

    // --- page view ---------------------------------------------------------
    // React StrictMode runs this effect twice in development (mount, cleanup,
    // mount again) for the same navigation. Refs survive that, so a repeat of
    // the path we already opened continues the existing view instead of
    // minting a second one — otherwise every dev page load counts twice and
    // its dwell timer restarts from zero.
    const resumed = trackedPath.current === pathname && viewId.current !== null;
    const id = resumed ? viewId.current! : crypto.randomUUID();

    if (!resumed) {
      trackedPath.current = pathname;
      viewId.current = id;
      visibleMs.current = 0;
      seen.current = new Set();
      enqueue({
        kind: "pageview",
        id,
        path: pathname,
        // Only meaningful on the first page of a visit; the collector drops
        // same-host referrers anyway, so in-site hops don't pollute the sources.
        referrer: document.referrer || undefined,
      });
    }
    visibleSince.current = document.visibilityState === "visible" ? performance.now() : null;

    // --- dwell -------------------------------------------------------------
    const accumulate = () => {
      if (visibleSince.current !== null) {
        visibleMs.current += performance.now() - visibleSince.current;
        visibleSince.current = null;
      }
    };

    const reportDwell = () => {
      accumulate();
      const dwellMs = Math.round(visibleMs.current);
      if (dwellMs <= 0) return;
      // Sent standalone rather than queued: this runs while the page is being
      // torn down, so there is no later flush to ride along with.
      send([{ kind: "dwell", id, dwellMs }]);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        visibleSince.current ??= performance.now();
        return;
      }
      // Hiding a tab is the last reliable moment on mobile — iOS often never
      // fires anything else before the tab is discarded.
      flush();
      reportDwell();
    };

    const onPageHide = () => {
      flush();
      reportDwell();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    // --- impressions -------------------------------------------------------
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();

    const record = (element: Element) => {
      const name = element.getAttribute("data-impression");
      if (!name) return;
      const rawId = element.getAttribute("data-impression-id");
      const targetId = rawId ? Number(rawId) : undefined;
      const key = `${name}:${rawId ?? ""}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      enqueue({
        kind: "impression",
        id: crypto.randomUUID(),
        path: pathname,
        name,
        ...(targetId !== undefined && Number.isFinite(targetId) ? { targetId } : {}),
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Half visible for half a second — a row that flies past under a
            // fast scroll was not actually seen by anyone.
            if (!timers.has(entry.target)) {
              timers.set(
                entry.target,
                setTimeout(() => {
                  timers.delete(entry.target);
                  record(entry.target);
                  observer.unobserve(entry.target);
                }, IMPRESSION_DWELL_MS),
              );
            }
          } else {
            const timer = timers.get(entry.target);
            if (timer) {
              clearTimeout(timer);
              timers.delete(entry.target);
            }
          }
        }
      },
      { threshold: 0.5 },
    );

    const observeAll = () => {
      for (const element of document.querySelectorAll("[data-impression]")) {
        observer.observe(element);
      }
    };

    observeAll();
    // Sorting, paging and season switching swap the rows in place without a
    // pathname change, so new targets have to be picked up as they appear.
    const mutations = new MutationObserver(() => observeAll());
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      mutations.disconnect();
      observer.disconnect();
      for (const timer of timers.values()) clearTimeout(timer);
      // Leaving this page (client navigation or unmount) closes its dwell.
      flush();
      reportDwell();
    };
  }, [pathname]);

  return null;
}
