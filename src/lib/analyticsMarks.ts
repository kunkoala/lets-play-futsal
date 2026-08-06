/**
 * Marks an element as an impression target for `AnalyticsTracker`.
 *
 * Instrumentation is plain data attributes rather than a wrapper component on
 * purpose: these targets are table rows and cards rendered by Server
 * Components, and wrapping them would mean either a client boundary around
 * server-rendered content or an extra `<div>` inside `<tbody>` (invalid HTML).
 * Spreading attributes changes neither the tree nor the markup.
 *
 *   <TableTr {...impressionProps("player_row", s.playerId)}>
 *
 * The tracker counts a target once per page visit, after it has been at least
 * half visible for a moment — a row that flashes past mid-scroll is not an
 * impression.
 */
export function impressionProps(name: string, targetId?: number) {
  return {
    "data-impression": name,
    ...(targetId === undefined ? {} : { "data-impression-id": String(targetId) }),
  };
}

/** Impression names in use, so the dashboard and the pages can't drift apart. */
export const IMPRESSION_PLAYER_ROW = "player_row";
export const IMPRESSION_SESSION_ROW = "session_row";
